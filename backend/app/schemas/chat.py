from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UsuarioPublico


class MensagemCriar(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class Mensagem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    autor: UsuarioPublico
    body: str
    created_at: datetime

    # Mensagem apagada continua na lista, com o corpo vazio e este sinal --
    # remove-la reordenaria a conversa e deixaria quem estava lendo sem
    # referencia do que sumiu.
    excluida: bool


class PaginaDeMensagens(BaseModel):
    """As mensagens vem em ordem cronologica; `cursor` aponta para o trecho
    anterior a elas, ou e nulo quando o inicio da conversa foi alcancado."""

    mensagens: list[Mensagem]
    cursor: datetime | None
