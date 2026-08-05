from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Query, status

from app.api.v1.deps import ContextoDep, SessaoDep
from app.db.models import ActivityLog, Task
from app.domain.enums import TaskStatus
from app.domain.task_rules import e_tarefa_do_time
from app.realtime.notify import notifica_tarefas
from app.schemas.task import (
    EventoDeAtividade,
    MoverTarefa,
    TarefaAtualizar,
    TarefaCriar,
    TarefaDetalhe,
    TarefaResumo,
)
from app.schemas.user import UsuarioPublico
from app.services import activity_service, task_service

router = APIRouter(prefix="/tarefas", tags=["tarefas"])


# As rotas de caminho fixo vem antes das parametrizadas: declaradas depois,
# "minhas" seria interpretado como um UUID de tarefa e devolveria 422.
@router.get("/minhas", name="minhas_tarefas")
async def minhas_tarefas(session: SessaoDep, ctx: ContextoDep) -> list[TarefaResumo]:
    tarefas = await task_service.minhas_tarefas(session, ctx)
    return [_resumo(t, filhas=t.subtasks) for t in tarefas]


@router.get("/board", name="board_do_time")
async def board_do_time(
    session: SessaoDep, ctx: ContextoDep, team_id: Annotated[UUID, Query()]
) -> list[TarefaResumo]:
    tarefas = await task_service.lista_do_board(session, ctx, team_id)
    return [_resumo(t, filhas=t.subtasks) for t in tarefas]


@router.post("", status_code=status.HTTP_201_CREATED, name="criar_tarefa")
async def criar_tarefa(
    session: SessaoDep, ctx: ContextoDep, dados: TarefaCriar, background: BackgroundTasks
) -> TarefaDetalhe:
    tarefa = await task_service.cria_tarefa(session, ctx, dados)
    notifica_tarefas(background, tarefa.team_id)
    return _detalhe(tarefa)


@router.get("/{task_id}", name="obter_tarefa")
async def obter_tarefa(
    session: SessaoDep, ctx: ContextoDep, task_id: UUID
) -> TarefaDetalhe:
    return _detalhe(await task_service.obtem_tarefa(session, ctx, task_id))


@router.patch("/{task_id}", name="atualizar_tarefa")
async def atualizar_tarefa(
    session: SessaoDep,
    ctx: ContextoDep,
    task_id: UUID,
    dados: TarefaAtualizar,
    background: BackgroundTasks,
) -> TarefaDetalhe:
    tarefa = await task_service.atualiza_tarefa(session, ctx, task_id, dados)
    notifica_tarefas(background, tarefa.team_id)
    return _detalhe(tarefa)


@router.post("/{task_id}/mover", name="mover_tarefa")
async def mover_tarefa(
    session: SessaoDep,
    ctx: ContextoDep,
    task_id: UUID,
    dados: MoverTarefa,
    background: BackgroundTasks,
) -> TarefaDetalhe:
    """Um gesto de arrastar. Devolve 422 se a tarefa sair de `a_fazer` sem prazo."""
    tarefa = await task_service.move_tarefa(session, ctx, task_id, dados)
    notifica_tarefas(background, tarefa.team_id)
    return _detalhe(tarefa)


@router.delete(
    "/{task_id}", status_code=status.HTTP_204_NO_CONTENT, name="excluir_tarefa"
)
async def excluir_tarefa(
    session: SessaoDep, ctx: ContextoDep, task_id: UUID, background: BackgroundTasks
) -> None:
    # O team_id sai antes da exclusao; depois dela a tarefa nao existe mais.
    tarefa = await task_service.obtem_tarefa(session, ctx, task_id)
    team_id = tarefa.team_id
    await task_service.exclui_tarefa(session, ctx, task_id)
    notifica_tarefas(background, team_id)


@router.get("/{task_id}/atividade", name="atividade_da_tarefa")
async def atividade_da_tarefa(
    session: SessaoDep, ctx: ContextoDep, task_id: UUID
) -> list[EventoDeAtividade]:
    # Passa pelo servico para herdar a checagem de acesso ao time.
    await task_service.obtem_tarefa(session, ctx, task_id)
    eventos = await activity_service.historico_da_tarefa(session, task_id)
    return [_evento(e) for e in eventos]


# --- Serializacao --------------------------------------------------------


def _resumo(tarefa: Task, *, filhas: Sequence[Task] = ()) -> TarefaResumo:
    """`filhas` e passado explicitamente porque subtarefa aninhada nao tem a
    propria colecao carregada -- acessa-la dispararia lazy load em contexto
    async, que estoura. Como a profundidade e de um nivel, subtarefa nunca
    precisa das proprias filhas."""
    return TarefaResumo(
        id=tarefa.id,
        title=tarefa.title,
        team_id=tarefa.team_id,
        parent_id=tarefa.parent_id,
        status=tarefa.status,
        priority=tarefa.priority,
        due_date=tarefa.due_date,
        position=tarefa.position,
        responsaveis=[
            UsuarioPublico.model_validate(vinculo.user) for vinculo in tarefa.assignees
        ],
        e_do_time=e_tarefa_do_time(quantidade_de_responsaveis=len(tarefa.assignees)),
        total_de_subtarefas=len(filhas),
        subtarefas_concluidas=sum(
            1 for filha in filhas if filha.status is TaskStatus.CONCLUIDO
        ),
    )


def _detalhe(tarefa: Task) -> TarefaDetalhe:
    subtarefas = sorted(tarefa.subtasks, key=lambda s: s.position)
    return TarefaDetalhe(
        **_resumo(tarefa, filhas=tarefa.subtasks).model_dump(),
        description=tarefa.description,
        criada_por=(
            UsuarioPublico.model_validate(tarefa.created_by)
            if tarefa.created_by
            else None
        ),
        created_at=tarefa.created_at,
        updated_at=tarefa.updated_at,
        completed_at=tarefa.completed_at,
        subtarefas=[_resumo(filha) for filha in subtarefas],
    )


def _evento(evento: ActivityLog) -> EventoDeAtividade:
    return EventoDeAtividade(
        id=evento.id,
        action=evento.action,
        payload=evento.payload,
        created_at=evento.created_at,
        autor=UsuarioPublico.model_validate(evento.actor) if evento.actor else None,
    )
