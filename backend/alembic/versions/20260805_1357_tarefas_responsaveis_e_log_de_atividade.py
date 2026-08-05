"""Tarefas, responsaveis e log de atividade

Revision ID: 572526b52c43
Revises: 0001_fundacao
Create Date: 2026-08-05
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "572526b52c43"
down_revision: str | None = "0001_fundacao"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

task_status = sa.Enum(
    "a_fazer", "em_andamento", "bloqueado", "concluido", name="task_status"
)
task_priority = sa.Enum("urgente", "alta", "normal", "baixa", name="task_priority")
activity_action = sa.Enum(
    "tarefa_criada",
    "tarefa_editada",
    "tarefa_excluida",
    "status_alterado",
    "prazo_definido",
    "prioridade_alterada",
    "responsaveis_alterados",
    name="activity_action",
)


def _timestamps() -> list[sa.Column[Any]]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("team_id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("status", task_status, nullable=False),
        sa.Column("priority", task_priority, nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("position", sa.Float(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        # RESTRICT no autor: apagar um usuario nao pode levar embora o registro
        # de quem abriu a demanda. Desativa-se o usuario, nao se apaga.
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_tasks_created_by_id_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["tasks.id"],
            name=op.f("fk_tasks_parent_id_tasks"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["team_id"], ["teams.id"], name=op.f("fk_tasks_team_id_teams"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tasks")),
    )
    # Consulta do board: tarefas de um time, por coluna, ja na ordem de exibicao.
    op.create_index("ix_tasks_board", "tasks", ["team_id", "status", "position"])
    op.create_index(op.f("ix_tasks_parent_id"), "tasks", ["parent_id"])

    op.create_table(
        "task_assignees",
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name=op.f("fk_task_assignees_task_id_tasks"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_task_assignees_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("task_id", "user_id", name=op.f("pk_task_assignees")),
    )
    # "Minhas tarefas" consulta pelo lado do usuario.
    op.create_index(op.f("ix_task_assignees_user_id"), "task_assignees", ["user_id"])

    op.create_table(
        "activity_log",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=True),
        sa.Column("team_id", sa.Uuid(), nullable=True),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", activity_action, nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # SET NULL nas duas pontas: o historico sobrevive a exclusao da tarefa e
        # a remocao de quem agiu. Um log que some junto com o alvo nao e log.
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            name=op.f("fk_activity_log_actor_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name=op.f("fk_activity_log_task_id_tasks"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name=op.f("fk_activity_log_team_id_teams"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_log")),
    )
    op.create_index(
        "ix_activity_log_task_created", "activity_log", ["task_id", "created_at"]
    )
    op.create_index(op.f("ix_activity_log_team_id"), "activity_log", ["team_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_log_team_id"), table_name="activity_log")
    op.drop_index("ix_activity_log_task_created", table_name="activity_log")
    op.drop_table("activity_log")

    op.drop_index(op.f("ix_task_assignees_user_id"), table_name="task_assignees")
    op.drop_table("task_assignees")

    op.drop_index(op.f("ix_tasks_parent_id"), table_name="tasks")
    op.drop_index("ix_tasks_board", table_name="tasks")
    op.drop_table("tasks")

    # Apagar a tabela nao apaga o tipo enum no Postgres. Sem isto, um upgrade
    # apos downgrade falharia com "type already exists" -- e o autogenerate nao
    # gera estas linhas.
    activity_action.drop(op.get_bind(), checkfirst=True)
    task_priority.drop(op.get_bind(), checkfirst=True)
    task_status.drop(op.get_bind(), checkfirst=True)
