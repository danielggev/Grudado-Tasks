"""Eventos que o servidor empurra para os navegadores conectados.

O payload e deliberadamente magro: diz O QUE mudou, nao COMO ficou. O cliente
reage invalidando a query correspondente e buscando o estado novo pela mesma
API REST de sempre -- uma fonte de verdade so, sem duplicar serializacao aqui.
"""

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class TipoDeEvento(StrEnum):
    TAREFAS_MUDARAM = "tarefas_mudaram"
    TIME_MUDOU = "time_mudou"
    MENSAGENS_MUDARAM = "mensagens_mudaram"


@dataclass(frozen=True)
class Evento:
    tipo: TipoDeEvento
    team_id: UUID

    # Presente quando o evento e de uma conversa de tarefa. Sem ele, o cliente
    # teria que recarregar todas as conversas do time a cada mensagem.
    task_id: UUID | None = None

    def como_json(self) -> dict[str, str | None]:
        return {
            "tipo": self.tipo.value,
            "team_id": str(self.team_id),
            "task_id": str(self.task_id) if self.task_id else None,
        }
