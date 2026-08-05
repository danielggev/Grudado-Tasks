from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Row, Select, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Task, TaskAssignee, TeamMember
from app.domain.enums import ActivityAction, TaskStatus
from app.domain.errors import RecursoNaoEncontrado
from app.domain.ordering import (
    PrecisaRebalancear,
    calcula_posicao,
    posicoes_rebalanceadas,
)
from app.domain.permissions import (
    ContextoDeAcesso,
    exigir,
    pode_criar_tarefa,
    pode_editar_tarefa,
    pode_excluir_tarefa,
    pode_ver_tarefas_do_time,
)
from app.domain.task_rules import (
    ResponsavelForaDoTime,
    aplica_transicao_de_status,
    valida_vinculo_de_subtarefa,
)
from app.schemas.task import MoverTarefa, TarefaAtualizar, TarefaCriar
from app.services import activity_service


class TarefaNaoEncontrada(RecursoNaoEncontrado):
    def __init__(self) -> None:
        super().__init__("Tarefa nao encontrada.")


# --- Leitura -------------------------------------------------------------


async def lista_do_board(
    session: AsyncSession, ctx: ContextoDeAcesso, team_id: UUID
) -> list[Task]:
    """Tarefas de topo de um time, na ordem das colunas.

    Subtarefa nao vira card propria no board: aparece dentro da tarefa-mae. Sem
    isso, quebrar uma demanda em cinco partes poluiria a coluna com seis cards
    para o mesmo trabalho.
    """
    if not pode_ver_tarefas_do_time(ctx, team_id):
        raise TarefaNaoEncontrada()

    stmt = (
        _com_relacionamentos(select(Task))
        .where(Task.team_id == team_id, Task.parent_id.is_(None))
        .order_by(Task.status, Task.position)
    )
    return list((await session.execute(stmt)).scalars().all())


async def obtem_tarefa(
    session: AsyncSession, ctx: ContextoDeAcesso, task_id: UUID
) -> Task:
    tarefa = await _carrega(session, task_id)
    if not pode_ver_tarefas_do_time(ctx, tarefa.team_id):
        raise TarefaNaoEncontrada()
    return tarefa


async def minhas_tarefas(session: AsyncSession, ctx: ContextoDeAcesso) -> list[Task]:
    """Tarefas em que a pessoa e responsavel, mais as dos times dela sem
    responsavel designado -- que sao dela tanto quanto de qualquer colega."""
    designadas = select(TaskAssignee.task_id).where(TaskAssignee.user_id == ctx.user_id)
    sem_responsavel = ~select(TaskAssignee.task_id).where(
        TaskAssignee.task_id == Task.id
    ).exists()

    stmt = (
        _com_relacionamentos(select(Task))
        .where(
            Task.status != TaskStatus.CONCLUIDO,
            Task.id.in_(designadas) | (Task.team_id.in_(ctx.times) & sem_responsavel),
        )
        .order_by(Task.due_date.nulls_last(), Task.priority, Task.position)
    )
    return list((await session.execute(stmt)).scalars().all())


# --- Escrita -------------------------------------------------------------


async def cria_tarefa(
    session: AsyncSession, ctx: ContextoDeAcesso, dados: TarefaCriar
) -> Task:
    exigir(
        pode_criar_tarefa(ctx, dados.team_id),
        "Voce precisa fazer parte do time para criar tarefas nele.",
    )

    if dados.parent_id is not None:
        mae = await _carrega(session, dados.parent_id)
        valida_vinculo_de_subtarefa(
            task_id=None,
            parent_id=mae.id,
            parent_tem_mae=mae.parent_id is not None,
            parent_team_id=mae.team_id,
            team_id=dados.team_id,
        )

    tarefa = Task(
        title=dados.title.strip(),
        description=dados.description,
        team_id=dados.team_id,
        parent_id=dados.parent_id,
        priority=dados.priority,
        due_date=dados.due_date,
        created_by_id=ctx.user_id,
        status=TaskStatus.A_FAZER,
        position=await _posicao_na_coluna(
            session, team_id=dados.team_id, status=TaskStatus.A_FAZER, apos=None
        ),
    )
    session.add(tarefa)
    await session.flush()

    await _define_responsaveis(session, tarefa, dados.responsaveis)

    activity_service.registra(
        session,
        action=ActivityAction.TAREFA_CRIADA,
        actor_id=ctx.user_id,
        task_id=tarefa.id,
        team_id=tarefa.team_id,
        title=tarefa.title,
        e_subtarefa=tarefa.parent_id is not None,
    )
    return await _carrega(session, tarefa.id)


async def atualiza_tarefa(
    session: AsyncSession, ctx: ContextoDeAcesso, task_id: UUID, dados: TarefaAtualizar
) -> Task:
    tarefa = await _carrega(session, task_id)
    _exigir_edicao(ctx, tarefa)

    alteracoes = dados.model_dump(exclude_unset=True)
    registrado: dict[str, object] = {}

    if "title" in alteracoes and alteracoes["title"] is not None:
        tarefa.title = str(alteracoes["title"]).strip()
        registrado["title"] = tarefa.title
    if "description" in alteracoes:
        tarefa.description = alteracoes["description"]
    if "priority" in alteracoes and alteracoes["priority"] is not None:
        de, tarefa.priority = tarefa.priority, alteracoes["priority"]
        registrado["priority"] = {"de": de.value, "para": tarefa.priority.value}
    if "due_date" in alteracoes:
        de_prazo, tarefa.due_date = tarefa.due_date, alteracoes["due_date"]
        registrado["due_date"] = {
            "de": de_prazo.isoformat() if de_prazo else None,
            "para": tarefa.due_date.isoformat() if tarefa.due_date else None,
        }
    if alteracoes.get("responsaveis") is not None:
        await _define_responsaveis(session, tarefa, list(alteracoes["responsaveis"]))
        registrado["responsaveis"] = len(alteracoes["responsaveis"])

    if registrado:
        activity_service.registra(
            session,
            action=ActivityAction.TAREFA_EDITADA,
            actor_id=ctx.user_id,
            task_id=tarefa.id,
            team_id=tarefa.team_id,
            **registrado,
        )

    await session.flush()
    return await _carrega(session, tarefa.id)


async def move_tarefa(
    session: AsyncSession, ctx: ContextoDeAcesso, task_id: UUID, dados: MoverTarefa
) -> Task:
    """Um gesto de arrastar: muda coluna e/ou posicao.

    E aqui que a regra do prazo age -- ver aplica_transicao_de_status. A
    transicao e calculada pelo dominio antes de qualquer escrita, entao uma
    tarefa sem prazo nunca chega a sair de `a_fazer`.
    """
    tarefa = await _carrega(session, task_id)
    _exigir_edicao(ctx, tarefa)

    status_anterior = tarefa.status
    resultado = aplica_transicao_de_status(
        status_atual=status_anterior,
        novo_status=dados.status,
        prazo_atual=tarefa.due_date,
        prazo_informado=dados.due_date,
        completed_at_atual=tarefa.completed_at,
        agora=datetime.now(UTC),
    )

    prazo_recem_definido = tarefa.due_date is None and resultado.due_date is not None

    tarefa.status = resultado.status
    tarefa.due_date = resultado.due_date
    tarefa.completed_at = resultado.completed_at
    tarefa.position = await _posicao_na_coluna(
        session,
        team_id=tarefa.team_id,
        status=resultado.status,
        apos=dados.apos,
        ignorando=tarefa.id,
    )

    if prazo_recem_definido and resultado.due_date is not None:
        activity_service.registra(
            session,
            action=ActivityAction.PRAZO_DEFINIDO,
            actor_id=ctx.user_id,
            task_id=tarefa.id,
            team_id=tarefa.team_id,
            due_date=resultado.due_date.isoformat(),
        )

    if status_anterior is not resultado.status:
        activity_service.registra(
            session,
            action=ActivityAction.STATUS_ALTERADO,
            actor_id=ctx.user_id,
            task_id=tarefa.id,
            team_id=tarefa.team_id,
            de=status_anterior.value,
            para=resultado.status.value,
        )

    await session.flush()
    return await _carrega(session, tarefa.id)


async def exclui_tarefa(
    session: AsyncSession, ctx: ContextoDeAcesso, task_id: UUID
) -> None:
    tarefa = await _carrega(session, task_id)
    if not pode_ver_tarefas_do_time(ctx, tarefa.team_id):
        raise TarefaNaoEncontrada()
    exigir(
        pode_excluir_tarefa(ctx, tarefa.team_id),
        "Apenas o lead do time ou um administrador pode excluir tarefas.",
    )

    # Registrado antes de apagar: a FK do log e SET NULL, entao o evento
    # sobrevive a tarefa e o historico do time continua completo.
    activity_service.registra(
        session,
        action=ActivityAction.TAREFA_EXCLUIDA,
        actor_id=ctx.user_id,
        team_id=tarefa.team_id,
        title=tarefa.title,
        subtarefas_removidas=len(tarefa.subtasks),
    )
    await session.delete(tarefa)
    await session.flush()


# --- Apoio ---------------------------------------------------------------


def _com_relacionamentos(stmt: Select[tuple[Task]]) -> Select[tuple[Task]]:
    """Carrega responsaveis, subtarefas e autor de uma vez.

    Sem isto, montar um board de 30 cards dispararia uma consulta por card para
    cada relacionamento -- o N+1 classico, e logo na tela principal do app.
    """
    return stmt.options(
        selectinload(Task.assignees).selectinload(TaskAssignee.user),
        selectinload(Task.subtasks).selectinload(Task.assignees).selectinload(
            TaskAssignee.user
        ),
        selectinload(Task.created_by),
    )


async def _carrega(session: AsyncSession, task_id: UUID) -> Task:
    """Sempre a partir do banco.

    `populate_existing` pelo mesmo motivo de team_service: sem ele, uma colecao
    ja carregada no identity map nao e atualizada, e as regras que contam
    responsaveis ou subtarefas decidiriam sobre dado defasado.
    """
    stmt = (
        _com_relacionamentos(select(Task))
        .where(Task.id == task_id)
        .execution_options(populate_existing=True)
    )
    tarefa = (await session.execute(stmt)).scalar_one_or_none()
    if tarefa is None:
        raise TarefaNaoEncontrada()
    return tarefa


def _exigir_edicao(ctx: ContextoDeAcesso, tarefa: Task) -> None:
    if not pode_ver_tarefas_do_time(ctx, tarefa.team_id):
        raise TarefaNaoEncontrada()
    exigir(
        pode_editar_tarefa(ctx, tarefa.team_id),
        "Voce precisa fazer parte do time para alterar esta tarefa.",
    )


async def _define_responsaveis(
    session: AsyncSession, tarefa: Task, user_ids: list[UUID]
) -> None:
    """Substitui a lista inteira. Lista vazia devolve a tarefa ao time."""
    desejados = set(user_ids)

    if desejados:
        membros = set(
            (
                await session.execute(
                    select(TeamMember.user_id).where(
                        TeamMember.team_id == tarefa.team_id,
                        TeamMember.user_id.in_(desejados),
                    )
                )
            )
            .scalars()
            .all()
        )
        if membros != desejados:
            raise ResponsavelForaDoTime()

    # Consulta explicita em vez de `tarefa.assignees`: numa tarefa recem-criada
    # a colecao ainda nao foi carregada, e toca-la dispararia lazy load -- que
    # em contexto async estoura com MissingGreenlet em vez de so buscar.
    atuais = {
        vinculo.user_id: vinculo
        for vinculo in (
            await session.execute(
                select(TaskAssignee).where(TaskAssignee.task_id == tarefa.id)
            )
        )
        .scalars()
        .all()
    }

    for user_id in desejados - atuais.keys():
        session.add(TaskAssignee(task_id=tarefa.id, user_id=user_id))
    for user_id in atuais.keys() - desejados:
        await session.delete(atuais[user_id])

    await session.flush()


async def _posicao_na_coluna(
    session: AsyncSession,
    *,
    team_id: UUID,
    status: TaskStatus,
    apos: UUID | None,
    ignorando: UUID | None = None,
    ja_rebalanceou: bool = False,
) -> float:
    linhas = await _coluna(session, team_id=team_id, status=status)
    if ignorando is not None:
        linhas = [linha for linha in linhas if linha.id != ignorando]

    if apos is None:
        anterior: float | None = None
        proxima: float | None = linhas[0].position if linhas else None
    else:
        indice = next((i for i, linha in enumerate(linhas) if linha.id == apos), None)
        if indice is None:
            # O vizinho informado saiu da coluna entre o gesto e a requisicao.
            # Melhor jogar no fim do que recusar o movimento.
            anterior = linhas[-1].position if linhas else None
            proxima = None
        else:
            anterior = linhas[indice].position
            proxima = (
                linhas[indice + 1].position if indice + 1 < len(linhas) else None
            )

    try:
        return calcula_posicao(anterior=anterior, proxima=proxima)
    except PrecisaRebalancear:
        if ja_rebalanceou:
            raise
        await _rebalanceia(session, team_id=team_id, status=status)
        return await _posicao_na_coluna(
            session,
            team_id=team_id,
            status=status,
            apos=apos,
            ignorando=ignorando,
            ja_rebalanceou=True,
        )


async def _coluna(
    session: AsyncSession, *, team_id: UUID, status: TaskStatus
) -> list[Row[tuple[UUID, float]]]:
    stmt = (
        select(Task.id, Task.position)
        .where(
            Task.team_id == team_id,
            Task.status == status,
            Task.parent_id.is_(None),
        )
        .order_by(Task.position)
    )
    return list((await session.execute(stmt)).all())


async def _rebalanceia(
    session: AsyncSession, *, team_id: UUID, status: TaskStatus
) -> None:
    """Reespaca a coluna quando a precisao do float se esgota.

    Unico caminho que reescreve varias linhas de uma vez -- por isso e a
    excecao, e nao a estrategia padrao de ordenacao.
    """
    linhas = await _coluna(session, team_id=team_id, status=status)
    if not linhas:
        return

    novas = posicoes_rebalanceadas(len(linhas))
    await session.execute(
        update(Task),
        [
            {"id": linha.id, "position": posicao}
            for linha, posicao in zip(linhas, novas, strict=True)
        ],
    )
    await session.flush()
