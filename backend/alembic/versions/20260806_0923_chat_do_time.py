"""Chat do time

Revision ID: eb7b43a8ec82
Revises: 0003_sem_bloqueado
Create Date: 2026-08-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "eb7b43a8ec82"
down_revision: str | None = "0003_sem_bloqueado"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("team_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        # clock_timestamp() e nao now(): now() devolve o horario de inicio da
        # transacao, igual para todas as linhas inseridas nela -- numa conversa,
        # isso deixaria mensagens seguidas com o mesmo carimbo e sem ordem
        # definida.
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        # RESTRICT no autor, como em tasks.created_by: quem tem conteudo no
        # sistema e desativado, nao apagado.
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_messages_author_id_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name=op.f("fk_messages_team_id_teams"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_messages")),
    )
    # A conversa e sempre lida do fim para o inicio, por time.
    op.create_index("ix_messages_team_created", "messages", ["team_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_messages_team_created", table_name="messages")
    op.drop_table("messages")
