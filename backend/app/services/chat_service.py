from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Attachment, Message
from app.domain.anexos import ArquivoRecebido
from app.domain.anexos import valida as valida_anexos
from app.domain.errors import AcessoNegado, RecursoNaoEncontrado, RegraDeDominioViolada
from app.domain.permissions import ContextoDeAcesso, exigir, pode_ver_time
from app.schemas.chat import MensagemCriar
from app.storage.arquivos import ArmazenamentoDeArquivos

PAGINA = 50


class MensagemNaoEncontrada(RecursoNaoEncontrado):
    def __init__(self) -> None:
        super().__init__("Mensagem nao encontrada.")


class AnexoNaoEncontrado(RecursoNaoEncontrado):
    def __init__(self) -> None:
        super().__init__("Anexo nao encontrado.")


class MensagemVazia(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__("Escreva algo ou anexe um arquivo.", campo="body")


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
        .options(selectinload(Message.author), selectinload(Message.anexos))
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
    session: AsyncSession,
    ctx: ContextoDeAcesso,
    team_id: UUID,
    dados: MensagemCriar,
    *,
    arquivos: list[ArquivoRecebido] | None = None,
    armazenamento: ArmazenamentoDeArquivos | None = None,
) -> Message:
    _exigir_acesso(ctx, team_id)

    recebidos = arquivos or []
    corpo = dados.body.strip()
    if not corpo and not recebidos:
        raise MensagemVazia()

    # Valida tudo antes de gravar qualquer byte: aceitar metade do lote
    # deixaria a pessoa sem saber o que subiu.
    valida_anexos(recebidos)

    mensagem = Message(team_id=team_id, author_id=ctx.user_id, body=corpo)
    session.add(mensagem)
    await session.flush()

    if recebidos:
        assert armazenamento is not None
        await _guarda_anexos(session, armazenamento, mensagem, recebidos)

    # Recarrega com autor e anexos para a resposta sair completa sem lazy load.
    return await _carrega(session, mensagem.id)


async def _guarda_anexos(
    session: AsyncSession,
    armazenamento: ArmazenamentoDeArquivos,
    mensagem: Message,
    arquivos: list[ArquivoRecebido],
) -> None:
    gravadas: list[str] = []
    try:
        for arquivo in arquivos:
            extensao = arquivo.filename.rsplit(".", 1)[-1] if "." in arquivo.filename else ""
            chave = armazenamento.nova_chave(extensao)
            await armazenamento.guarda(chave, arquivo.conteudo)
            gravadas.append(chave)

            session.add(
                Attachment(
                    message_id=mensagem.id,
                    filename=_nome_seguro(arquivo.filename),
                    content_type=arquivo.content_type.split(";")[0].strip().lower(),
                    size_bytes=arquivo.tamanho,
                    storage_key=chave,
                )
            )
        await session.flush()
    except Exception:
        # O disco nao participa da transacao do banco: se o insert falhar
        # depois de gravar, os arquivos ficariam orfaos sem ninguem os
        # referenciando. Limpa na mao antes de propagar.
        for chave in gravadas:
            await armazenamento.remove(chave)
        raise


def _nome_seguro(filename: str) -> str:
    """Limpa o nome apenas para exibicao.

    Nao e defesa de caminho -- isso ja esta garantido por nunca usar este valor
    para montar caminho em disco. Aqui o objetivo e nao guardar barras e
    caracteres de controle que quebrariam o cabecalho de download.
    """
    limpo = filename.replace("\\", "/").split("/")[-1]
    limpo = "".join(c for c in limpo if c.isprintable() and c not in '"\r\n')
    return limpo.strip()[:255] or "arquivo"


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


async def obtem_anexo(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID, anexo_id: UUID
) -> Attachment:
    """Anexo para download, so para quem tem acesso ao time.

    A checagem sobe pela mensagem ate o time: sem isso, quem descobrisse um id
    baixaria arquivo de qualquer conversa da empresa.
    """
    _exigir_acesso(ctx, team_id)

    stmt = (
        select(Attachment)
        .join(Message, Message.id == Attachment.message_id)
        .where(Attachment.id == anexo_id, Message.team_id == team_id)
    )
    anexo = (await session.execute(stmt)).scalar_one_or_none()
    if anexo is None:
        raise AnexoNaoEncontrado()
    return anexo


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
        .options(selectinload(Message.author), selectinload(Message.anexos))
        .execution_options(populate_existing=True)
    )
    mensagem = (await session.execute(stmt)).scalar_one_or_none()
    if mensagem is None:
        raise MensagemNaoEncontrada()
    return mensagem


__all__ = [
    "PAGINA",
    "AcessoNegado",
    "AnexoNaoEncontrado",
    "MensagemNaoEncontrada",
    "MensagemVazia",
    "envia_mensagem",
    "exclui_mensagem",
    "lista_mensagens",
    "obtem_anexo",
]
