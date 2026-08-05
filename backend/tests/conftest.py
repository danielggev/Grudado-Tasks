import os
from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.models import Team, TeamMember, User
from app.domain.enums import OrgRole, TeamRole
from app.domain.permissions import ContextoDeAcesso

URL_TESTE = os.getenv("DATABASE_URL_TESTE")

SEM_BANCO = pytest.mark.skipif(
    not URL_TESTE,
    reason="Defina DATABASE_URL_TESTE para rodar os testes de integracao.",
)


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Sessao contra Postgres real, com o schema recriado a cada teste.

    Recriar em vez de limpar tabelas mantem cada teste independente de ordem, e
    a suite e pequena o bastante para o custo nao importar.
    """
    assert URL_TESTE is not None
    engine = create_async_engine(URL_TESTE)
    async with engine.begin() as conexao:
        await conexao.run_sync(Base.metadata.drop_all)
        await conexao.run_sync(Base.metadata.create_all)

    fabrica = async_sessionmaker(engine, expire_on_commit=False)
    async with fabrica() as sessao:
        yield sessao

    await engine.dispose()


async def cria_usuario(
    sessao: AsyncSession, *, nome: str = "Pessoa", papel: OrgRole = OrgRole.MEMBER
) -> User:
    usuario = User(
        email=f"{nome.lower().replace(' ', '.')}.{uuid4().hex[:6]}@grudadoemvoce.com.br",
        name=nome,
        org_role=papel,
    )
    sessao.add(usuario)
    await sessao.flush()
    return usuario


async def contexto_de(sessao: AsyncSession, usuario: User) -> ContextoDeAcesso:
    """Monta o contexto pelo mesmo caminho que a API usa em cada request."""
    from app.services.auth_service import monta_contexto_de_acesso

    return await monta_contexto_de_acesso(sessao, usuario)


async def cria_time_com_lead(
    sessao: AsyncSession, *, nome: str, lead: User
) -> Team:
    from app.domain.team_rules import gera_slug

    time = Team(name=nome, slug=gera_slug(nome))
    sessao.add(time)
    await sessao.flush()
    sessao.add(TeamMember(team_id=time.id, user_id=lead.id, role=TeamRole.LEAD))
    await sessao.flush()
    return time
