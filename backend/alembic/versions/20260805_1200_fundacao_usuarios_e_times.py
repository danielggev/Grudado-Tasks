"""Fundacao: usuarios, times e vinculo entre eles

Revision ID: 0001_fundacao
Revises:
Create Date: 2026-08-05
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa

from alembic import op

revision: str = "0001_fundacao"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

org_role = sa.Enum("admin", "member", name="org_role")
team_role = sa.Enum("lead", "member", name="team_role")


def _timestamps() -> list[sa.Column[Any]]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("avatar_url", sa.String(length=1000), nullable=True),
        sa.Column("google_sub", sa.String(length=255), nullable=True),
        sa.Column("org_role", org_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("google_sub", name=op.f("uq_users_google_sub")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "teams",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teams")),
    )
    op.create_index(op.f("ix_teams_slug"), "teams", ["slug"], unique=True)

    op.create_table(
        "team_members",
        sa.Column("team_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", team_role, nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name=op.f("fk_team_members_team_id_teams"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_team_members_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("team_id", "user_id", name=op.f("pk_team_members")),
    )
    # Indice pelo lado do usuario: "quais times eu participo" roda em todo request
    # autenticado, para montar o ContextoDeAcesso.
    op.create_index(op.f("ix_team_members_user_id"), "team_members", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_team_members_user_id"), table_name="team_members")
    op.drop_table("team_members")
    op.drop_index(op.f("ix_teams_slug"), table_name="teams")
    op.drop_table("teams")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    team_role.drop(op.get_bind(), checkfirst=True)
    org_role.drop(op.get_bind(), checkfirst=True)
