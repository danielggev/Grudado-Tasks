"""Ponte entre os endpoints de mutacao e o hub.

Os eventos sao agendados como BackgroundTasks de proposito: elas executam
depois do teardown das dependencies -- ou seja, depois do commit da sessao
(FastAPI >= 0.106). Publicar dentro do service seria uma corrida: o navegador
receberia o aviso, refetcharia, e poderia ler o estado de antes do commit.
"""

from uuid import UUID

from fastapi import BackgroundTasks

from app.realtime.events import Evento, TipoDeEvento
from app.realtime.hub import get_hub


def _publica(tipo: TipoDeEvento, team_id: UUID, task_id: UUID | None = None) -> None:
    get_hub().publica(Evento(tipo=tipo, team_id=team_id, task_id=task_id))


def notifica_tarefas(background: BackgroundTasks, team_id: UUID) -> None:
    background.add_task(_publica, TipoDeEvento.TAREFAS_MUDARAM, team_id)


def notifica_time(background: BackgroundTasks, team_id: UUID) -> None:
    background.add_task(_publica, TipoDeEvento.TIME_MUDOU, team_id)


def notifica_mensagens(
    background: BackgroundTasks, team_id: UUID, *, task_id: UUID | None = None
) -> None:
    background.add_task(_publica, TipoDeEvento.MENSAGENS_MUDARAM, team_id, task_id)
