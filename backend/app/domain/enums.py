from enum import StrEnum


class TaskStatus(StrEnum):
    A_FAZER = "a_fazer"
    EM_ANDAMENTO = "em_andamento"
    BLOQUEADO = "bloqueado"
    CONCLUIDO = "concluido"


class TaskPriority(StrEnum):
    URGENTE = "urgente"
    ALTA = "alta"
    NORMAL = "normal"
    BAIXA = "baixa"


class ActivityAction(StrEnum):
    """Eventos registrados no log de atividade.

    O log e o que devolve a rastreabilidade perdida ao adotar status unico
    compartilhado em tarefa de time: o estado nao diz quem fez o que, o log diz.
    """

    TAREFA_CRIADA = "tarefa_criada"
    TAREFA_EDITADA = "tarefa_editada"
    TAREFA_EXCLUIDA = "tarefa_excluida"
    STATUS_ALTERADO = "status_alterado"
    PRAZO_DEFINIDO = "prazo_definido"
    PRIORIDADE_ALTERADA = "prioridade_alterada"
    RESPONSAVEIS_ALTERADOS = "responsaveis_alterados"


class OrgRole(StrEnum):
    """Papel no nivel da organizacao."""

    ADMIN = "admin"
    MEMBER = "member"


class TeamRole(StrEnum):
    """Papel dentro de um time."""

    LEAD = "lead"
    MEMBER = "member"
