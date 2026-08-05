"""Remove o status bloqueado

Revision ID: 0003_sem_bloqueado
Revises: 572526b52c43
Create Date: 2026-08-05

Decisao de produto: o board passa a ter tres fases (pendente, em progresso,
concluido). "Bloqueado" nao descrevia uma fase do trabalho, e sim um motivo --
e motivo cabe na descricao ou no log, nao numa coluna.

O Postgres nao permite remover um valor de um tipo enum. O caminho e criar o
tipo novo, converter a coluna e trocar os nomes.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_sem_bloqueado"
down_revision: str | None = "572526b52c43"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

VALORES_NOVOS = ("a_fazer", "em_andamento", "concluido")
VALORES_ANTIGOS = ("a_fazer", "em_andamento", "bloqueado", "concluido")


def _troca_tipo(valores: tuple[str, ...]) -> None:
    novo = sa.Enum(*valores, name="task_status_novo")
    novo.create(op.get_bind())
    op.execute(
        "ALTER TABLE tasks ALTER COLUMN status TYPE task_status_novo "
        "USING status::text::task_status_novo"
    )
    op.execute("DROP TYPE task_status")
    op.execute("ALTER TYPE task_status_novo RENAME TO task_status")


def upgrade() -> None:
    # Tarefa bloqueada estava fora da fila e com alguem acompanhando: "em
    # progresso" e o destino honesto. Precisa vir antes da troca de tipo --
    # a conversao falharia com valor que o tipo novo nao conhece.
    op.execute("UPDATE tasks SET status = 'em_andamento' WHERE status = 'bloqueado'")
    _troca_tipo(VALORES_NOVOS)


def downgrade() -> None:
    # Volta o valor ao tipo, mas nao ha como saber quais tarefas estavam
    # bloqueadas: essa informacao se perdeu no upgrade. O log de atividade
    # guarda as transicoes antigas, se alguem precisar reconstituir.
    _troca_tipo(VALORES_ANTIGOS)
