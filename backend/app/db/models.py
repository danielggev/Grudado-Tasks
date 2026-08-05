from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, enum_col
from app.domain.enums import OrgRole, TeamRole


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
