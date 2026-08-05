from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, enum_col
from app.domain.enums import ActivityAction, OrgRole, TaskPriority, TaskStatus, TeamRole


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    avatar_url: Mapped[str | None] = mapped_column(String(1000), default=None)

    # `sub` do ID token do Google: o identificador estavel da conta. E ele que
    # deve casar o login, nao o e-mail -- e-mail pode ser renomeado no Workspace.
    # Fica nulo enquanto o usuario existir so no provider de desenvolvimento.
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, default=None)

    org_role: Mapped[OrgRole] = mapped_column(
        enum_col(OrgRole, "org_role"), default=OrgRole.MEMBER
    )
    is_active: Mapped[bool] = mapped_column(default=True)

    memberships: Mapped[list["TeamMember"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)

    # Arquivamento em vez de exclusao: tarefa concluida de time extinto ainda e
    # historico que alguem vai querer consultar.
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    members: Mapped[list["TeamMember"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[TeamRole] = mapped_column(
        enum_col(TeamRole, "team_role"), default=TeamRole.MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    team: Mapped[Team] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="memberships")


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"
    __table_args__ = (
        # Cobre a consulta do board: as tarefas de um time, agrupadas por coluna
        # e ja na ordem de exibicao. E o caminho mais quente do app.
        Index("ix_tasks_board", "team_id", "status", "position"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, default=None)

    team_id: Mapped[UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))

    # Hierarquia de um nivel: tarefa e subtarefa. Excluir a mae leva as
    # subtarefas junto -- subtarefa orfa nao significa nada.
    parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), default=None, index=True
    )

    status: Mapped[TaskStatus] = mapped_column(
        enum_col(TaskStatus, "task_status"), default=TaskStatus.A_FAZER
    )
    priority: Mapped[TaskPriority] = mapped_column(
        enum_col(TaskPriority, "task_priority"), default=TaskPriority.NORMAL
    )

    # Nulo enquanto ninguem comecou a tarefa. Ao sair de `a_fazer` passa a ser
    # obrigatorio -- ver domain/task_rules.aplica_transicao_de_status.
    due_date: Mapped[date | None] = mapped_column(Date, default=None)

    # Fracionaria: mover um card e um update so, nao a reescrita da coluna.
    # Ver domain/ordering.py.
    position: Mapped[float] = mapped_column(Float)

    created_by_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    team: Mapped[Team] = relationship()
    created_by: Mapped[User] = relationship()
    assignees: Mapped[list["TaskAssignee"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    subtasks: Mapped[list["Task"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    parent: Mapped["Task | None"] = relationship(
        back_populates="subtasks", remote_side="Task.id"
    )


class TaskAssignee(Base):
    """Zero linhas para uma tarefa significa tarefa do time inteiro."""

    __tablename__ = "task_assignees"

    task_id: Mapped[UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    task: Mapped[Task] = relationship(back_populates="assignees")
    user: Mapped[User] = relationship()


class ActivityLog(Base):
    """Historico de quem fez o que.

    Existe porque tarefa de time tem status unico compartilhado: o estado nao
    guarda autoria nenhuma, entao sem o log seria impossivel saber quem moveu o
    card. Nao ha `updated_at` -- registro de auditoria nao se edita.
    """

    __tablename__ = "activity_log"
    __table_args__ = (Index("ix_activity_log_task_created", "task_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)

    # Nulo quando o evento sobrevive ao alvo (exclusao de tarefa, por exemplo).
    task_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), default=None
    )
    team_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), default=None, index=True
    )
    actor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )

    action: Mapped[ActivityAction] = mapped_column(enum_col(ActivityAction, "activity_action"))

    # De/para do que mudou. JSONB para permitir consultar por dentro do payload
    # sem precisar de uma coluna por tipo de evento.
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    actor: Mapped[User | None] = relationship()
