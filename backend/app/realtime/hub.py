"""Distribuicao de eventos para as conexoes WebSocket abertas.

O hub e in-memory e isso e uma decisao, nao um descuido: com 1 worker uvicorn
(fixado no Dockerfile) todas as conexoes vivem no mesmo processo, e para ~15
pessoas isso sobra. O Protocol existe para que um hub Redis pub/sub entre no
lugar sem tocar em quem publica -- os services conhecem so `publica()`.
"""

import asyncio
import contextlib
from collections import defaultdict
from typing import Protocol
from uuid import UUID

from app.realtime.events import Evento


class Hub(Protocol):
    def inscreve(self, team_id: UUID) -> asyncio.Queue[Evento]: ...

    def cancela(self, team_id: UUID, fila: asyncio.Queue[Evento]) -> None: ...

    def publica(self, evento: Evento) -> None: ...


class HubEmMemoria:
    """Uma fila por conexao, indexada por time.

    Fila com limite: um navegador que parou de consumir (aba congelada,
    conexao zumbi) nao pode acumular eventos para sempre. Estourou, o evento
    mais antigo cai -- o cliente re-sincroniza no proximo que receber, porque
    o payload nao carrega estado, so o aviso de que algo mudou.
    """

    _LIMITE_POR_FILA = 64

    def __init__(self) -> None:
        self._filas: defaultdict[UUID, set[asyncio.Queue[Evento]]] = defaultdict(set)

    def inscreve(self, team_id: UUID) -> asyncio.Queue[Evento]:
        fila: asyncio.Queue[Evento] = asyncio.Queue(maxsize=self._LIMITE_POR_FILA)
        self._filas[team_id].add(fila)
        return fila

    def cancela(self, team_id: UUID, fila: asyncio.Queue[Evento]) -> None:
        self._filas[team_id].discard(fila)
        if not self._filas[team_id]:
            del self._filas[team_id]

    def publica(self, evento: Evento) -> None:
        for fila in self._filas.get(evento.team_id, set()):
            if fila.full():
                # Descarta o mais antigo em favor do novo: o aviso mais recente
                # e o que importa, e nunca bloqueamos quem publica.
                with contextlib.suppress(asyncio.QueueEmpty):
                    fila.get_nowait()
            with contextlib.suppress(asyncio.QueueFull):
                fila.put_nowait(evento)

    @property
    def total_de_conexoes(self) -> int:
        return sum(len(filas) for filas in self._filas.values())


_hub = HubEmMemoria()


def get_hub() -> HubEmMemoria:
    return _hub
