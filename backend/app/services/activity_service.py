"""Registro de quem fez o que.

Existe porque tarefa de time tem status unico compartilhado: o estado nao guarda
autoria nenhuma. Sem o log, "o card foi para concluido" nao teria dono.

O registro e sempre gravado na mesma transacao da mudanca que o originou -- ou
os dois acontecem, ou nenhum. Log que pode divergir do fato nao serve para nada.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ActivityLog
from app.domain.enums import ActivityAction


def registra(
    session: AsyncSession,
    *,
    action: ActivityAction,
    actor_id: UUID,
    task_id: UUID | None = None,
    team_id: UUID | None = None,
    **payload: Any,
) -> ActivityLog:
    evento = ActivityLog(
        action=action,
        actor_id=actor_id,
        task_id=task_id,
        team_id=team_id,
        payload=payload,
    )
    session.add(evento)
    return evento


async def historico_da_tarefa(
    session: AsyncSession, task_id: UUID, *, limite: int = 100
) -> list[ActivityLog]:
    stmt = (
        select(ActivityLog)
        .where(ActivityLog.task_id == task_id)
        .options(selectinload(ActivityLog.actor))
        .order_by(ActivityLog.created_at.desc())
        .limit(limite)
    )
    return list((await session.execute(stmt)).scalars().all())
