import asyncio
import os
from collections.abc import Callable
from logging.config import fileConfig

from sqlalchemy.engine import Connection

from alembic import context
from app.config import get_settings
from app.db import models  # noqa: F401  -- import registra os models no metadata
from app.db.base import Base
from app.db.session import get_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = get_engine()
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def _fabrica_de_loop() -> Callable[[], asyncio.AbstractEventLoop] | None:
    """No Windows o asyncio usa ProactorEventLoop, e o psycopg async nao roda
    sobre ele -- sem isto, `alembic upgrade` falha nativamente no Windows.

    Em producao nao muda nada: o container e Linux e cai no ramo padrao.
    """
    return asyncio.SelectorEventLoop if os.name == "nt" else None


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online(), loop_factory=_fabrica_de_loop())
