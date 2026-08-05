"""Regras de negocio do time. Puro, como o resto de app/domain."""

import re
import unicodedata
from collections.abc import Iterator

from app.domain.errors import RegraDeDominioViolada

SLUG_MAXIMO = 120
SLUG_RESERVA = "time"


class UltimoLeadDoTime(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__(
            "Este e o unico lead do time. Promova outro membro antes de remove-lo.",
            campo="role",
        )


class TimeArquivado(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__("Este time esta arquivado. Reative-o para poder altera-lo.")


class MembroJaNoTime(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__("Esta pessoa ja faz parte do time.", campo="user_id")


def gera_slug(nome: str) -> str:
    """Transforma o nome do time num identificador estavel para URL.

    Acento vira letra simples ("Criacao" e "Criação" produzem o mesmo slug), e
    qualquer coisa que nao seja letra ou numero vira hifen.
    """
    sem_acento = (
        unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii")
    )
    com_hifen = re.sub(r"[^a-z0-9]+", "-", sem_acento.lower())
    # Truncar antes de limpar as bordas: cortar em 120 pode deixar um hifen solto.
    return com_hifen[:SLUG_MAXIMO].strip("-") or SLUG_RESERVA


def variacoes_de_slug(base: str, tentativas: int = 50) -> Iterator[str]:
    """Candidatos em ordem para resolver colisao: `design`, `design-2`, `design-3`...

    O servico percorre ate achar um livre. Separado da consulta ao banco para
    que a estrategia de desempate seja testavel sozinha.
    """
    yield base
    for numero in range(2, tentativas + 1):
        sufixo = f"-{numero}"
        yield base[: SLUG_MAXIMO - len(sufixo)].strip("-") + sufixo


def valida_saida_de_lead(*, total_de_leads: int) -> None:
    """Impede que um time fique sem lead.

    Sem essa regra, remover ou rebaixar o ultimo lead deixaria o time sem
    ninguem capaz de gerenciar membros -- so um admin da organizacao poderia
    desfazer, e nem sempre ha um por perto.
    """
    if total_de_leads <= 1:
        raise UltimoLeadDoTime()
