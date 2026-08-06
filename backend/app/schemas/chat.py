from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UsuarioPublico


class MensagemCriar(BaseModel):
    # Sem minimo: mensagem so com anexo e valida. A regra real -- texto OU
    # arquivo -- vive no servico, que e quem enxerga os dois (MensagemVazia).
    body: str = Field(default="", max_length=4000)


class Anexo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    content_type: str
    size_bytes: int

    # Decidido no servidor: so os tipos da lista de imagens sao exibidos na
    # conversa. Deixar o cliente inferir pelo content_type abriria espaco para
    # tentar renderizar o que nao deve.
    e_imagem: bool


class Mensagem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    autor: UsuarioPublico
    body: str
    created_at: datetime
    anexos: list[Anexo]

    # Mensagem apagada continua na lista, com o corpo vazio e este sinal --
    # remove-la reordenaria a conversa e deixaria quem estava lendo sem
    # referencia do que sumiu.
    excluida: bool


class PaginaDeMensagens(BaseModel):
    """As mensagens vem em ordem cronologica; `cursor` aponta para o trecho
    anterior a elas, ou e nulo quando o inicio da conversa foi alcancado."""

    mensagens: list[Mensagem]
    cursor: datetime | None
