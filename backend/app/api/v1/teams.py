from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, status

from app.api.v1.deps import ContextoDep, SessaoDep
from app.db.models import Team, TeamMember
from app.domain.enums import TeamRole
from app.realtime.notify import notifica_time
from app.schemas.team import (
    AdicionarMembro,
    AlterarPapel,
    MembroDoTime,
    TimeAtualizar,
    TimeCriar,
    TimeDetalhe,
    TimeResumo,
)
from app.schemas.user import UsuarioPublico
from app.services import team_service

router = APIRouter(prefix="/times", tags=["times"])


@router.post("", status_code=status.HTTP_201_CREATED, name="criar_time")
async def criar_time(
    session: SessaoDep, ctx: ContextoDep, dados: TimeCriar
) -> TimeDetalhe:
    time = await team_service.cria_time(session, ctx, dados)
    return _detalhe(time, await team_service.conta_tarefas(session, time.id))


@router.get("", name="listar_times")
async def listar_times(
    session: SessaoDep, ctx: ContextoDep, incluir_arquivados: bool = False
) -> list[TimeResumo]:
    times = await team_service.lista_times(
        session, ctx, incluir_arquivados=incluir_arquivados
    )
    return [_resumo(time, membros, tarefas) for time, membros, tarefas in times]


@router.get("/{team_id}", name="obter_time")
async def obter_time(session: SessaoDep, ctx: ContextoDep, team_id: UUID) -> TimeDetalhe:
    time, _ = await team_service.obtem_time(session, ctx, team_id)
    return _detalhe(time, await team_service.conta_tarefas(session, team_id))


@router.patch("/{team_id}", name="atualizar_time")
async def atualizar_time(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    dados: TimeAtualizar,
    background: BackgroundTasks,
) -> TimeDetalhe:
    time = await team_service.atualiza_time(session, ctx, team_id, dados)
    notifica_time(background, team_id)
    return _detalhe(time, await team_service.conta_tarefas(session, team_id))


@router.delete(
    "/{team_id}", status_code=status.HTTP_204_NO_CONTENT, name="excluir_time"
)
async def excluir_time(session: SessaoDep, ctx: ContextoDep, team_id: UUID) -> None:
    """Remove o time com tarefas e historico. Restrito a administradores."""
    await team_service.exclui_time(session, ctx, team_id)


@router.post("/{team_id}/arquivar", name="arquivar_time")
async def arquivar_time(
    session: SessaoDep, ctx: ContextoDep, team_id: UUID, background: BackgroundTasks
) -> TimeDetalhe:
    time = await team_service.arquiva_time(session, ctx, team_id, arquivar=True)
    notifica_time(background, team_id)
    return _detalhe(time, await team_service.conta_tarefas(session, team_id))


@router.post("/{team_id}/reativar", name="reativar_time")
async def reativar_time(
    session: SessaoDep, ctx: ContextoDep, team_id: UUID, background: BackgroundTasks
) -> TimeDetalhe:
    time = await team_service.arquiva_time(session, ctx, team_id, arquivar=False)
    notifica_time(background, team_id)
    return _detalhe(time, await team_service.conta_tarefas(session, team_id))


@router.post(
    "/{team_id}/membros", status_code=status.HTTP_201_CREATED, name="adicionar_membro"
)
async def adicionar_membro(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    dados: AdicionarMembro,
    background: BackgroundTasks,
) -> MembroDoTime:
    vinculo = await team_service.adiciona_membro(session, ctx, team_id, dados)
    await session.refresh(vinculo, ["user"])
    notifica_time(background, team_id)
    return _membro(vinculo)


@router.patch("/{team_id}/membros/{user_id}", name="alterar_papel_do_membro")
async def alterar_papel_do_membro(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    user_id: UUID,
    dados: AlterarPapel,
    background: BackgroundTasks,
) -> MembroDoTime:
    vinculo = await team_service.altera_papel(session, ctx, team_id, user_id, dados.role)
    notifica_time(background, team_id)
    return _membro(vinculo)


@router.delete(
    "/{team_id}/membros/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    name="remover_membro",
)
async def remover_membro(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    user_id: UUID,
    background: BackgroundTasks,
) -> None:
    await team_service.remove_membro(session, ctx, team_id, user_id)
    notifica_time(background, team_id)


# --- Serializacao --------------------------------------------------------


def _resumo(time: Team, total_de_membros: int, total_de_tarefas: int) -> TimeResumo:
    return TimeResumo(
        id=time.id,
        name=time.name,
        slug=time.slug,
        description=time.description,
        archived_at=time.archived_at,
        total_de_membros=total_de_membros,
        total_de_tarefas=total_de_tarefas,
    )


def _detalhe(time: Team, total_de_tarefas: int) -> TimeDetalhe:
    # Leads primeiro, depois ordem alfabetica: quem gerencia o time e a
    # informacao que se procura primeiro ao abrir a tela.
    membros = sorted(
        time.members,
        key=lambda m: (m.role is not TeamRole.LEAD, m.user.name.casefold()),
    )
    return TimeDetalhe(
        **_resumo(time, len(time.members), total_de_tarefas).model_dump(),
        membros=[_membro(vinculo) for vinculo in membros],
    )


def _membro(vinculo: TeamMember) -> MembroDoTime:
    return MembroDoTime(
        usuario=UsuarioPublico.model_validate(vinculo.user),
        role=vinculo.role,
        joined_at=vinculo.joined_at,
    )
