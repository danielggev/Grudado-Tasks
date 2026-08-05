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


class OrgRole(StrEnum):
    """Papel no nivel da organizacao."""

    ADMIN = "admin"
    MEMBER = "member"


class TeamRole(StrEnum):
    """Papel dentro de um time."""

    LEAD = "lead"
    MEMBER = "member"
