"""Chat por tarefa

Revision ID: a7b8c9d0e1f2
Revises: f1c2d3e4a5b6
Create Date: 2026-08-06

A conversa da tarefa e a mesma coisa que a do time, com escopo menor -- entao
mora na mesma tabela. `task_id` nulo continua sendo a conversa do time, e as
mensagens que ja existem seguem validas sem migracao de dados.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | None = "f1c2d3e4a5b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("task_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        op.f("fk_messages_task_id_tasks"),
        "messages",
        "tasks",
        ["task_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # O indice antigo nao distinguia conversa do time da conversa de tarefa;
    # sem task_id nele, listar a do time varreria as duas.
    op.drop_index("ix_messages_team_created", table_name="messages")
    op.create_index(
        "ix_messages_team_created", "messages", ["team_id", "task_id", "created_at"]
    )
    op.create_index("ix_messages_task_created", "messages", ["task_id", "created_at"])


def downgrade() -> None:
    # As mensagens de tarefa perdem o vinculo e virariam conversa do time --
    # apaga-las antes evita esse embaralhamento.
    op.execute("DELETE FROM messages WHERE task_id IS NOT NULL")

    op.drop_index("ix_messages_task_created", table_name="messages")
    op.drop_index("ix_messages_team_created", table_name="messages")
    op.create_index("ix_messages_team_created", "messages", ["team_id", "created_at"])

    op.drop_constraint(op.f("fk_messages_task_id_tasks"), "messages", type_="foreignkey")
    op.drop_column("messages", "task_id")
