from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Query, status

from app.api.v1.deps import ContextoDep, SessaoDep
from app.db.models import Message
from app.realtime.notify import notifica_mensagens
from app.schemas.chat import Mensagem, MensagemCriar, PaginaDeMensagens
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
    return PaginaDeMensagens(
        mensagens=[_serializa(m) for m in mensagens], cursor=cursor
    )


@router.post("", status_code=status.HTTP_201_CREATED, name="enviar_mensagem")
async def enviar_mensagem(
    session: SessaoDep,
    ctx: ContextoDep,
    team_id: UUID,
    dados: MensagemCriar,
    background: BackgroundTasks,
) -> Mensagem:
    mensagem = await chat_service.envia_mensagem(session, ctx, team_id, dados)
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


def _serializa(mensagem: Message) -> Mensagem:
    return Mensagem(
        id=mensagem.id,
        autor=UsuarioPublico.model_validate(mensagem.author),
        body=mensagem.body,
        created_at=mensagem.created_at,
        excluida=mensagem.deleted_at is not None,
    )
