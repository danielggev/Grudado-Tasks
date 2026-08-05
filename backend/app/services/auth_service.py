from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.errors import AutenticacaoFalhou
from app.auth.provider import IdentidadeExterna
from app.db.models import TeamMember, User
from app.domain.enums import OrgRole, TeamRole
from app.domain.permissions import ContextoDeAcesso


async def obtem_ou_cria_usuario(session: AsyncSession, identidade: IdentidadeExterna) -> User:
    """Casa a identidade afirmada pelo provider com um usuario do banco.

    Provisionamento automatico: quem pertence ao Workspace e entra pela primeira
    vez ja vira usuario. Nao ha convite nem cadastro -- a fonte da verdade sobre
    quem trabalha na empresa e o Google, e duplicar isso aqui so criaria
    divergencia.
    """
    usuario = await _por_subject(session, identidade.subject)
    if usuario is None:
        # Conta que existia so no provider de desenvolvimento, ou usuario
        # pre-cadastrado: adota o `sub` no primeiro login real.
        usuario = await _por_email(session, identidade.email)

    if usuario is None:
        usuario = User(
            email=identidade.email,
            name=identidade.name,
            avatar_url=identidade.avatar_url,
            google_sub=identidade.subject,
            org_role=await _papel_inicial(session),
        )
        session.add(usuario)
        await session.flush()
        return usuario

    if not usuario.is_active:
        raise AutenticacaoFalhou("Seu acesso a este aplicativo foi desativado.")

    # O provider e a fonte da verdade para nome e foto.
    usuario.name = identidade.name
    usuario.avatar_url = identidade.avatar_url
    if usuario.google_sub is None:
        usuario.google_sub = identidade.subject
    return usuario


async def monta_contexto_de_acesso(session: AsyncSession, usuario: User) -> ContextoDeAcesso:
    """Retrato de permissoes do usuario, montado a cada request autenticado.

    E uma consulta so, coberta pelo indice `ix_team_members_user_id`. Manter isso
    barato importa: e o caminho quente de toda rota autenticada.
    """
    linhas = (
        await session.execute(
            select(TeamMember.team_id, TeamMember.role).where(
                TeamMember.user_id == usuario.id
            )
        )
    ).all()

    return ContextoDeAcesso(
        user_id=usuario.id,
        org_role=usuario.org_role,
        times=frozenset(linha.team_id for linha in linhas),
        times_como_lead=frozenset(
            linha.team_id for linha in linhas if linha.role is TeamRole.LEAD
        ),
    )


async def _por_subject(session: AsyncSession, subject: str) -> User | None:
    resultado = await session.execute(select(User).where(User.google_sub == subject))
    return resultado.scalar_one_or_none()


async def _por_email(session: AsyncSession, email: str) -> User | None:
    resultado = await session.execute(select(User).where(User.email == email))
    return resultado.scalar_one_or_none()


async def _papel_inicial(session: AsyncSession) -> OrgRole:
    """O primeiro a entrar vira admin; os demais entram como membros.

    Resolve o problema do ovo e da galinha sem seed manual nem senha mestra: sem
    isso, ninguem teria permissao para criar o primeiro time.
    """
    total = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    return OrgRole.ADMIN if total == 0 else OrgRole.MEMBER
