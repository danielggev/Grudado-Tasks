from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Message
from app.domain.errors import AcessoNegado, RecursoNaoEncontrado
from app.domain.permissions import ContextoDeAcesso, exigir, pode_ver_time
from app.schemas.chat import MensagemCriar

PAGINA = 50


class MensagemNaoEncontrada(RecursoNaoEncontrado):
    def __init__(self) -> None:
        super().__init__("Mensagem nao encontrada.")


async def lista_mensagens(
    session: AsyncSession,
    ctx: ContextoDeAcesso,
    team_id: UUID,
    *,
    antes_de: datetime | None = None,
) -> tuple[list[Message], datetime | None]:
    """Ultimas mensagens do time, em ordem cronologica.

    A consulta desce do mais recente e a lista e invertida no fim: e o que
    permite paginar para tras (carregar o historico anterior) sem varrer a
    conversa inteira. `antes_de` e o carimbo da mensagem mais antiga ja exibida.

    Devolve tambem o proximo cursor, ou None quando o inicio foi alcancado --
    sem isso o cliente nao teria como saber quando parar de pedir mais.
    """
    _exigir_acesso(ctx, team_id)

    stmt = (
        select(Message)
        .where(Message.team_id == team_id)
        .options(selectinload(Message.author))
        # `id` como desempate: mesmo com clock_timestamp(), ordenar por coluna
        # nao unica deixaria a paginacao instavel se dois carimbos coincidissem.
        .order_by(Message.created_at.desc(), Message.id.desc())
        # Uma a mais que a pagina: se vier, ha historico anterior.
        .limit(PAGINA + 1)
    )
    if antes_de is not None:
        stmt = stmt.where(Message.created_at < antes_de)

    encontradas = list((await session.execute(stmt)).scalars().all())

    ha_mais = len(encontradas) > PAGINA
    pagina = encontradas[:PAGINA]
    cursor = pagina[-1].created_at if ha_mais and pagina else None

    return list(reversed(pagina)), cursor


async def envia_mensagem(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, dados: MensagemCriar
) -> Message:
    _exigir_acesso(ctx, team_id)

    mensagem = Message(team_id=team_id, author_id=ctx.user_id, body=dados.body.strip())
    session.add(mensagem)
    await session.flush()

    # Recarrega com o autor para a resposta sair completa sem lazy load.
    return await _carrega(session, mensagem.id)


async def exclui_mensagem(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, message_id: UUID
) -> Message:
    """Exclusao logica, restrita ao autor (ou ao lead e ao admin).

    O corpo e apagado de verdade -- manter o texto de uma mensagem que a pessoa
    pediu para remover so mudaria quem consegue ler, nao se ela existe.
    """
    _exigir_acesso(ctx, team_id)
    mensagem = await _carrega(session, message_id)

    if mensagem.team_id != team_id:
        raise MensagemNaoEncontrada()

    if mensagem.author_id != ctx.user_id:
        exigir(
            ctx.e_admin or ctx.e_lead_de(team_id),
            "Só quem escreveu pode apagar esta mensagem.",
        )

    if mensagem.deleted_at is None:
        mensagem.deleted_at = datetime.now(UTC)
        mensagem.body = ""
        await session.flush()

    return mensagem


def _exigir_acesso(ctx: ContextoDeAcesso, team_id: UUID) -> None:
    """Conversa de time e visivel so a quem esta nele.

    Levanta "nao encontrado" e nao "acesso negado" pelo mesmo motivo das outras
    telas: um 403 confirmaria que o time existe.
    """
    if not pode_ver_time(ctx, team_id):
        raise RecursoNaoEncontrado("Time nao encontrado.")


async def _carrega(session: AsyncSession, message_id: UUID) -> Message:
    stmt = (
        select(Message)
        .where(Message.id == message_id)
        .options(selectinload(Message.author))
        .execution_options(populate_existing=True)
    )
    mensagem = (await session.execute(stmt)).scalar_one_or_none()
    if mensagem is None:
        raise MensagemNaoEncontrada()
    return mensagem


__all__ = [
    "PAGINA",
    "AcessoNegado",
    "MensagemNaoEncontrada",
    "envia_mensagem",
    "exclui_mensagem",
    "lista_mensagens",
]
