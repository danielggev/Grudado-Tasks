from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Team, TeamMember, User
from app.domain.enums import TeamRole
from app.domain.errors import RecursoNaoEncontrado
from app.domain.permissions import (
    ContextoDeAcesso,
    exigir,
    pode_criar_time,
    pode_gerenciar_membros,
    pode_gerenciar_time,
    pode_ver_time,
)
from app.domain.team_rules import (
    MembroJaNoTime,
    TimeArquivado,
    gera_slug,
    valida_saida_de_lead,
    variacoes_de_slug,
)
from app.schemas.team import AdicionarMembro, TimeAtualizar, TimeCriar


class TimeNaoEncontrado(RecursoNaoEncontrado):
    """Vira 404, tanto para time inexistente quanto para time de outra pessoa.

    Os dois casos precisam ser indistinguiveis: um 403 confirmaria que o time
    existe, revelando a estrutura de times da empresa a quem esta de fora.
    """

    def __init__(self) -> None:
        super().__init__("Time nao encontrado.")


class UsuarioNaoEncontrado(RecursoNaoEncontrado):
    def __init__(self) -> None:
        super().__init__("Usuario nao encontrado.")


# --- Leitura -------------------------------------------------------------


async def lista_times(
    session: AsyncSession, ctx: ContextoDeAcesso, *, incluir_arquivados: bool = False
) -> list[tuple[Team, int]]:
    """Times visiveis ao usuario, com a contagem de membros.

    A contagem sai na mesma consulta: buscar os times e depois contar membros de
    cada um seria N+1 logo na primeira tela do app.
    """
    stmt = (
        select(Team, func.count(TeamMember.user_id))
        .outerjoin(TeamMember, TeamMember.team_id == Team.id)
        .group_by(Team.id)
        .order_by(Team.name)
    )
    if not ctx.e_admin:
        stmt = stmt.where(Team.id.in_(ctx.times))
    if not incluir_arquivados:
        stmt = stmt.where(Team.archived_at.is_(None))

    return [(time, total) for time, total in (await session.execute(stmt)).all()]


async def obtem_time(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID
) -> tuple[Team, int]:
    time = await _carrega_com_membros(session, team_id)
    if not pode_ver_time(ctx, time.id):
        raise TimeNaoEncontrado()
    return time, len(time.members)


# --- Escrita -------------------------------------------------------------


async def cria_time(
    session: AsyncSession, ctx: ContextoDeAcesso, dados: TimeCriar
) -> Team:
    exigir(pode_criar_time(ctx), "Apenas administradores podem criar times.")

    time = Team(
        name=dados.name.strip(),
        slug=await _slug_livre(session, dados.name),
        description=dados.description,
    )
    session.add(time)
    await session.flush()

    # Quem cria entra como lead. Evita o estado esquisito de um time recem-criado
    # sem ninguem capaz de gerencia-lo; para sair depois, basta promover outro
    # membro antes -- e a regra do ultimo lead cuida disso.
    session.add(TeamMember(team_id=time.id, user_id=ctx.user_id, role=TeamRole.LEAD))
    await session.flush()

    # Recarrega para que a resposta ja saia com o vinculo do criador populado,
    # sem depender de lazy load fora do escopo da sessao.
    return await _carrega_com_membros(session, time.id)


async def atualiza_time(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, dados: TimeAtualizar
) -> Team:
    time = await _carrega_com_membros(session, team_id)
    _exigir_gestao(ctx, time)
    _exigir_ativo(time)

    alteracoes = dados.model_dump(exclude_unset=True)
    if "name" in alteracoes and alteracoes["name"] is not None:
        time.name = str(alteracoes["name"]).strip()
    if "description" in alteracoes:
        time.description = alteracoes["description"]

    await session.flush()
    return time


async def arquiva_time(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, *, arquivar: bool
) -> Team:
    """Arquivar em vez de excluir: tarefa de time extinto ainda e historico."""
    time = await _carrega_com_membros(session, team_id)
    _exigir_gestao(ctx, time)

    time.archived_at = datetime.now(UTC) if arquivar else None
    await session.flush()
    return time


# --- Membros -------------------------------------------------------------


async def adiciona_membro(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, dados: AdicionarMembro
) -> TeamMember:
    time = await _carrega_com_membros(session, team_id)
    _exigir_gestao_de_membros(ctx, time)
    _exigir_ativo(time)

    usuario = (
        await session.execute(
            select(User).where(User.id == dados.user_id, User.is_active.is_(True))
        )
    ).scalar_one_or_none()
    if usuario is None:
        raise UsuarioNaoEncontrado()

    if any(membro.user_id == dados.user_id for membro in time.members):
        raise MembroJaNoTime()

    vinculo = TeamMember(team_id=time.id, user_id=usuario.id, role=dados.role)
    session.add(vinculo)
    await session.flush()
    return vinculo


async def altera_papel(
    session: AsyncSession,
    ctx: ContextoDeAcesso,
    team_id: UUID,
    user_id: UUID,
    novo_papel: TeamRole,
) -> TeamMember:
    time = await _carrega_com_membros(session, team_id)
    _exigir_gestao_de_membros(ctx, time)
    _exigir_ativo(time)

    vinculo = _membro(time, user_id)

    rebaixando_lead = vinculo.role is TeamRole.LEAD and novo_papel is not TeamRole.LEAD
    if rebaixando_lead:
        valida_saida_de_lead(total_de_leads=_total_de_leads(time))

    vinculo.role = novo_papel
    await session.flush()
    return vinculo


async def remove_membro(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, user_id: UUID
) -> None:
    time = await _carrega_com_membros(session, team_id)
    _exigir_gestao_de_membros(ctx, time)
    _exigir_ativo(time)

    vinculo = _membro(time, user_id)
    if vinculo.role is TeamRole.LEAD:
        valida_saida_de_lead(total_de_leads=_total_de_leads(time))

    await session.delete(vinculo)
    await session.flush()


# --- Apoio ---------------------------------------------------------------


async def _carrega_com_membros(session: AsyncSession, team_id: UUID) -> Team:
    """Carrega o time com membros e usuarios, sempre a partir do banco.

    `populate_existing` nao e detalhe: sem ele o SQLAlchemy devolve o objeto que
    ja esta no identity map e **nao recarrega a colecao ja carregada**. Como as
    regras deste servico contam membros e leads para decidir (ver
    valida_saida_de_lead), uma colecao defasada vira decisao errada -- promover
    um segundo lead e em seguida remover o primeiro falharia, porque a contagem
    ainda enxergaria um lead so.
    """
    stmt = (
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .execution_options(populate_existing=True)
    )
    time = (await session.execute(stmt)).scalar_one_or_none()
    if time is None:
        raise TimeNaoEncontrado()
    return time


async def _slug_livre(session: AsyncSession, nome: str) -> str:
    base = gera_slug(nome)
    for candidato in variacoes_de_slug(base):
        existe = (
            await session.execute(select(Team.id).where(Team.slug == candidato))
        ).first()
        if existe is None:
            return candidato
    # 50 times com o mesmo nome normalizado nao acontece numa empresa de 15
    # pessoas; se acontecer, e melhor falhar alto do que gerar slug aleatorio.
    raise RuntimeError(f"Nao foi possivel gerar slug livre para {nome!r}.")


def _exigir_gestao(ctx: ContextoDeAcesso, time: Team) -> None:
    if not pode_ver_time(ctx, time.id):
        raise TimeNaoEncontrado()
    exigir(pode_gerenciar_time(ctx, time.id), "Apenas o lead do time ou um administrador.")


def _exigir_gestao_de_membros(ctx: ContextoDeAcesso, time: Team) -> None:
    if not pode_ver_time(ctx, time.id):
        raise TimeNaoEncontrado()
    exigir(
        pode_gerenciar_membros(ctx, time.id),
        "Apenas o lead do time ou um administrador pode gerenciar membros.",
    )


def _exigir_ativo(time: Team) -> None:
    if time.archived_at is not None:
        raise TimeArquivado()


def _membro(time: Team, user_id: UUID) -> TeamMember:
    for vinculo in time.members:
        if vinculo.user_id == user_id:
            return vinculo
    raise UsuarioNaoEncontrado()


def _total_de_leads(time: Team) -> int:
    return sum(1 for membro in time.members if membro.role is TeamRole.LEAD)
