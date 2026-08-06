from datetime import datetime
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, Response, UploadFile, status

from app.api.v1.deps import ContextoDep, SessaoDep
from app.api.v1.deps_storage import ArmazenamentoDep
from app.db.models import Attachment, Message
from app.domain.anexos import TAMANHO_MAXIMO, AnexoInvalido, ArquivoRecebido, e_imagem
from app.realtime.notify import notifica_mensagens
from app.schemas.chat import Anexo, Mensagem, MensagemCriar, PaginaDeMensagens
from app.schemas.user import UsuarioPublico
from app.services import chat_service

router = APIRouter(prefix="/times/{team_id}/mensagens", tags=["chat"])


@router.get("", name="listar_mensagens")
async def listar_mensagens(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    antes_de: Annotated[datetime | None, Query()] = None,
) -> PaginaDeMensagens:
    """Conversa do time. Sem `antes_de`, devolve o trecho mais recente."""
    mensagens, cursor = await chat_service.lista_mensagens(
        session, ctx, team_id, antes_de=antes_de
    )
    return PaginaDeMensagens(mensagens=[_serializa(m) for m in mensagens], cursor=cursor)


@router.post("", status_code=status.HTTP_201_CREATED, name="enviar_mensagem")
async def enviar_mensagem(
    session: SessaoDep,
    ctx: ContextoDep,
    armazenamento: ArmazenamentoDep,
    team_id: UUID,
    background: BackgroundTasks,
    body: Annotated[str, Form()] = "",
    arquivos: Annotated[list[UploadFile], File()] = [],  # noqa: B006
) -> Mensagem:
    """Envia mensagem com ou sem anexos.

    Multipart sempre, mesmo para texto puro: um caminho so evita ter duas
    rotas fazendo a mesma coisa com formatos diferentes.
    """
    recebidos = [await _le_arquivo(arquivo) for arquivo in arquivos if arquivo.filename]

    mensagem = await chat_service.envia_mensagem(
        session,
        ctx,
        team_id,
        MensagemCriar(body=body),
        arquivos=recebidos,
        armazenamento=armazenamento,
    )
    notifica_mensagens(background, team_id)
    return _serializa(mensagem)


@router.delete("/{message_id}", name="excluir_mensagem")
async def excluir_mensagem(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    message_id: UUID,
    background: BackgroundTasks,
) -> Mensagem:
    """Devolve a mensagem já marcada como excluída, em vez de 204.

    O cliente precisa do registro para manter a lacuna na conversa -- some-la
    da lista reordenaria tudo abaixo dela.
    """
    mensagem = await chat_service.exclui_mensagem(session, ctx, team_id, message_id)
    notifica_mensagens(background, team_id)
    return _serializa(mensagem)


@router.get("/anexos/{anexo_id}", name="baixar_anexo")
async def baixar_anexo(
    session: SessaoDep,
    ctx: ContextoDep,
    armazenamento: ArmazenamentoDep,
    team_id: UUID,
    anexo_id: UUID,
) -> Response:
    """Serve o anexo, com os cabecalhos que impedem o arquivo de virar ataque.

    - `nosniff`: sem ele o navegador pode ignorar o Content-Type declarado e
      interpretar o conteudo, o que transformaria um "png" em HTML executavel.
    - `inline` so para imagens da lista permitida; todo o resto e baixado, e
      nao aberto na mesma origem da sessao.
    - `Content-Security-Policy: sandbox` como ultima barreira, caso algum tipo
      escape das duas regras acima.
    """
    anexo = await chat_service.obtem_anexo(session, ctx, team_id, anexo_id)
    conteudo = await armazenamento.le(anexo.storage_key)

    disposicao = "inline" if e_imagem(anexo.content_type) else "attachment"
    nome = quote(anexo.filename)

    return Response(
        content=conteudo,
        media_type=anexo.content_type,
        headers={
            "Content-Disposition": f"{disposicao}; filename*=UTF-8''{nome}",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            # Anexo nao muda depois de gravado; a chave e unica por arquivo.
            "Cache-Control": "private, max-age=86400",
        },
    )


async def _le_arquivo(arquivo: UploadFile) -> ArquivoRecebido:
    """Le o upload em memoria, cortando antes do limite.

    Ler `TAMANHO_MAXIMO + 1` e o que permite recusar por tamanho sem carregar
    um arquivo gigante inteiro so para depois descobrir que ele nao cabia.
    """
    conteudo = await arquivo.read(TAMANHO_MAXIMO + 1)
    if len(conteudo) > TAMANHO_MAXIMO:
        limite = TAMANHO_MAXIMO // (1024 * 1024)
        raise AnexoInvalido(f'"{arquivo.filename}" passa de {limite} MB.')

    return ArquivoRecebido(
        filename=arquivo.filename or "arquivo",
        content_type=arquivo.content_type or "application/octet-stream",
        conteudo=conteudo,
    )


def _serializa(mensagem: Message) -> Mensagem:
    return Mensagem(
        id=mensagem.id,
        autor=UsuarioPublico.model_validate(mensagem.author),
        body=mensagem.body,
        created_at=mensagem.created_at,
        excluida=mensagem.deleted_at is not None,
        anexos=[_anexo(a) for a in sorted(mensagem.anexos, key=lambda a: a.created_at)],
    )


def _anexo(anexo: Attachment) -> Anexo:
    return Anexo(
        id=anexo.id,
        filename=anexo.filename,
        content_type=anexo.content_type,
        size_bytes=anexo.size_bytes,
        e_imagem=e_imagem(anexo.content_type),
    )
