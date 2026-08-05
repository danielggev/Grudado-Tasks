from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import TeamRole
from app.schemas.user import UsuarioPublico


class TimeCriar(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    # Quem entra junto com o time. Quem cria vira lead automaticamente e nao
    # precisa constar aqui -- se constar, e ignorado em vez de duplicar.
    membros: list[UUID] = Field(default_factory=list)


class TimeAtualizar(BaseModel):
    """Campos ausentes ficam como estao.

    O servico usa `exclude_unset`, entao `description: null` limpa a descricao e
    omitir o campo a preserva -- que sao coisas diferentes e precisam continuar
    sendo.
    """

    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class MembroDoTime(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario: UsuarioPublico
    role: TeamRole
    joined_at: datetime


class TimeResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None
    archived_at: datetime | None
    total_de_membros: int

    # Usado no aviso de exclusao: numero exato do que se perde.
    total_de_tarefas: int


class TimeDetalhe(TimeResumo):
    membros: list[MembroDoTime]


class AdicionarMembro(BaseModel):
    user_id: UUID
    role: TeamRole = TeamRole.MEMBER


class AlterarPapel(BaseModel):
    role: TeamRole
