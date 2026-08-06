"""Anexos do chat

Revision ID: f1c2d3e4a5b6
Revises: eb7b43a8ec82
Create Date: 2026-08-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f1c2d3e4a5b6"
down_revision: str | None = "eb7b43a8ec82"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attachments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("message_id", sa.Uuid(), nullable=False),
        # Nome exibido ao baixar. O caminho em disco vem de storage_key, que o
        # servidor gera -- nunca deste campo.
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.id"],
            name=op.f("fk_attachments_message_id_messages"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attachments")),
    )
    op.create_index(op.f("ix_attachments_message_id"), "attachments", ["message_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_attachments_message_id"), table_name="attachments")
    op.drop_table("attachments")
