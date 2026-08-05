from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import ActivityAction, TaskPriority, TaskStatus
from app.schemas.user import UsuarioPublico


class TarefaCriar(BaseModel):
    title: str = Field(min_length=2, max_length=300)
    description: str | None = Field(default=None, max_length=20000)
    team_id: UUID
    parent_id: UUID | None = None
    priority: TaskPriority = TaskPriority.NORMAL

    # Pode nascer vazio. Passa a ser obrigatorio ao sair de `a_fazer`.
    due_date: date | None = None

    # Lista vazia = tarefa do time, com progresso unico compartilhado.
    responsaveis: list[UUID] = Field(default_factory=list)


class TarefaAtualizar(BaseModel):
    """Campos omitidos ficam como estao (o servico usa `exclude_unset`)."""

    title: str | None = Field(default=None, min_length=2, max_length=300)
    description: str | None = Field(default=None, max_length=20000)
    priority: TaskPriority | None = None
    due_date: date | None = None
    responsaveis: list[UUID] | None = None


class MoverTarefa(BaseModel):
    """Um gesto de arrastar: coluna de destino e onde soltou dentro dela."""

    status: TaskStatus

    # Exigido quando a tarefa sai de `a_fazer` sem prazo definido.
    due_date: date | None = None

    # Id da tarefa que fica logo acima. None = topo da coluna.
    apos: UUID | None = None


class TarefaResumo(BaseModel):
    """O card do board e a linha da lista."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    team_id: UUID
    parent_id: UUID | None
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    position: float
    responsaveis: list[UsuarioPublico]

    # Sem responsavel designado: pertence ao time inteiro.
    e_do_time: bool

    total_de_subtarefas: int
    subtarefas_concluidas: int

    # As subtarefas viajam junto porque o board as desenha aninhadas sob a mae.
    # A profundidade e de um nivel, entao a auto-referencia nao recursa: numa
    # subtarefa esta lista vem sempre vazia.
    #
    # Sem valor padrao de proposito: com `default_factory` o campo sairia como
    # opcional no OpenAPI, e o TypeScript gerado obrigaria a checar `undefined`
    # num dado que a API sempre envia.
    subtarefas: list["TarefaResumo"]


class TarefaDetalhe(TarefaResumo):
    description: str | None
    criada_por: UsuarioPublico | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class EventoDeAtividade(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    action: ActivityAction
    payload: dict[str, Any]
    created_at: datetime
    autor: UsuarioPublico | None
