"""Regras de negocio da tarefa.

Modulo puro de proposito: sem FastAPI, sem SQLAlchemy, sem I/O. Tudo aqui e
funcao de entrada para saida, o que torna as regras testaveis em milissegundos
e sem banco. Ver tests/domain/.
"""

from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID

from app.domain.enums import TaskStatus
from app.domain.errors import PrazoObrigatorioNoEngajamento, RegraDeDominioViolada

STATUS_INICIAL = TaskStatus.A_FAZER


def e_primeiro_engajamento(*, status_atual: TaskStatus, novo_status: TaskStatus) -> bool:
    """A tarefa esta saindo da fila e entrando em trabalho?

    Definicao operacional de "receber a tarefa": sair de `a_fazer` para qualquer
    outro status. Nao existe estado de aceite no produto -- a tarefa nasce ativa --
    entao este e o unico momento em que da para exigir o prazo de quem assumiu.
    """
    return status_atual is STATUS_INICIAL and novo_status is not STATUS_INICIAL


@dataclass(frozen=True)
class ResultadoDaTransicao:
    """Estado que a tarefa deve assumir apos a transicao."""

    status: TaskStatus
    due_date: date | None
    completed_at: datetime | None


def aplica_transicao_de_status(
    *,
    status_atual: TaskStatus,
    novo_status: TaskStatus,
    prazo_atual: date | None,
    prazo_informado: date | None,
    completed_at_atual: datetime | None,
    agora: datetime,
) -> ResultadoDaTransicao:
    """Calcula o novo estado da tarefa, ou levanta se a regra do prazo for violada.

    Nao restringe quais transicoes sao possiveis: o board e drag-and-drop, entao
    qualquer coluna alcanca qualquer outra. A unica regra e a do prazo.
    """
    prazo_final = prazo_informado if prazo_informado is not None else prazo_atual

    engajando = e_primeiro_engajamento(status_atual=status_atual, novo_status=novo_status)
    if engajando and prazo_final is None:
        raise PrazoObrigatorioNoEngajamento()

    if novo_status is TaskStatus.CONCLUIDO:
        # Reconclusao nao remarca a data: o que vale e quando ficou pronta a
        # primeira vez. Idempotente de proposito.
        completed_at = completed_at_atual if completed_at_atual is not None else agora
    else:
        completed_at = None

    return ResultadoDaTransicao(
        status=novo_status,
        due_date=prazo_final,
        completed_at=completed_at,
    )


class ResponsavelForaDoTime(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__(
            "So e possivel atribuir a tarefa a quem faz parte do time.",
            campo="responsaveis",
        )


class SubtarefaNaoAceitaSubtarefa(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__(
            "Uma subtarefa nao pode ter subtarefas. Quebre a tarefa principal.",
            campo="parent_id",
        )


class TarefaNaoPodeSerPropriaMae(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__("Uma tarefa nao pode ser subtarefa de si mesma.", campo="parent_id")


class SubtarefaDeOutroTime(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__(
            "A subtarefa precisa pertencer ao mesmo time da tarefa principal.",
            campo="parent_id",
        )


def valida_vinculo_de_subtarefa(
    *,
    task_id: UUID | None,
    parent_id: UUID,
    parent_tem_mae: bool,
    parent_team_id: UUID,
    team_id: UUID,
) -> None:
    """Regras de hierarquia. `task_id` e None quando a tarefa ainda vai ser criada.

    A profundidade e limitada a um nivel de proposito: tarefa e subtarefa, nada
    alem. A feature 3 materializa uma tarefa-mae e N subtarefas -- exatamente um
    nivel -- e aceitar profundidade arbitraria exigiria CTE recursiva em toda
    consulta de board para entregar algo que o produto nunca pediu.
    """
    if task_id is not None and task_id == parent_id:
        raise TarefaNaoPodeSerPropriaMae()
    if parent_tem_mae:
        raise SubtarefaNaoAceitaSubtarefa()
    if parent_team_id != team_id:
        raise SubtarefaDeOutroTime()


def e_tarefa_do_time(*, quantidade_de_responsaveis: int) -> bool:
    """Tarefa sem responsavel designado pertence ao time inteiro.

    O progresso e unico e compartilhado: um status so, que qualquer membro do
    time altera. Nao ha progresso por pessoa -- a rastreabilidade de quem fez o
    que vem do log de atividade, nao do estado.
    """
    return quantidade_de_responsaveis == 0
