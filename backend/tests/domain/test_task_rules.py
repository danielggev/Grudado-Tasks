from datetime import UTC, date, datetime

import pytest

from app.domain.enums import TaskStatus
from app.domain.errors import PrazoObrigatorioNoEngajamento
from app.domain.task_rules import (
    aplica_transicao_de_status,
    e_primeiro_engajamento,
    e_tarefa_do_time,
)

AGORA = datetime(2026, 8, 5, 12, 0, tzinfo=UTC)
PRAZO = date(2026, 8, 20)
OUTRO_PRAZO = date(2026, 9, 1)


class TestPrimeiroEngajamento:
    @pytest.mark.parametrize(
        "novo_status",
        [TaskStatus.EM_ANDAMENTO, TaskStatus.BLOQUEADO, TaskStatus.CONCLUIDO],
    )
    def test_sair_de_a_fazer_e_engajamento(self, novo_status: TaskStatus) -> None:
        assert e_primeiro_engajamento(
            status_atual=TaskStatus.A_FAZER, novo_status=novo_status
        )

    def test_permanecer_em_a_fazer_nao_e_engajamento(self) -> None:
        assert not e_primeiro_engajamento(
            status_atual=TaskStatus.A_FAZER, novo_status=TaskStatus.A_FAZER
        )

    @pytest.mark.parametrize(
        "status_atual",
        [TaskStatus.EM_ANDAMENTO, TaskStatus.BLOQUEADO, TaskStatus.CONCLUIDO],
    )
    def test_transicao_entre_status_ja_engajados_nao_recobra(
        self, status_atual: TaskStatus
    ) -> None:
        assert not e_primeiro_engajamento(
            status_atual=status_atual, novo_status=TaskStatus.CONCLUIDO
        )


class TestRegraDoPrazo:
    def test_sem_prazo_algum_no_engajamento_levanta(self) -> None:
        with pytest.raises(PrazoObrigatorioNoEngajamento) as exc:
            aplica_transicao_de_status(
                status_atual=TaskStatus.A_FAZER,
                novo_status=TaskStatus.EM_ANDAMENTO,
                prazo_atual=None,
                prazo_informado=None,
                completed_at_atual=None,
                agora=AGORA,
            )
        assert exc.value.campo == "due_date"

    def test_prazo_informado_na_transicao_satisfaz_a_regra(self) -> None:
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.A_FAZER,
            novo_status=TaskStatus.EM_ANDAMENTO,
            prazo_atual=None,
            prazo_informado=PRAZO,
            completed_at_atual=None,
            agora=AGORA,
        )
        assert resultado.due_date == PRAZO
        assert resultado.status is TaskStatus.EM_ANDAMENTO

    def test_prazo_ja_existente_dispensa_informar_de_novo(self) -> None:
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.A_FAZER,
            novo_status=TaskStatus.EM_ANDAMENTO,
            prazo_atual=PRAZO,
            prazo_informado=None,
            completed_at_atual=None,
            agora=AGORA,
        )
        assert resultado.due_date == PRAZO

    def test_prazo_informado_sobrescreve_o_existente(self) -> None:
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.A_FAZER,
            novo_status=TaskStatus.EM_ANDAMENTO,
            prazo_atual=PRAZO,
            prazo_informado=OUTRO_PRAZO,
            completed_at_atual=None,
            agora=AGORA,
        )
        assert resultado.due_date == OUTRO_PRAZO

    def test_voltar_para_a_fazer_sem_prazo_nao_e_cobrado(self) -> None:
        """A regra vale para quem assume a tarefa, nao para quem a devolve a fila."""
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.EM_ANDAMENTO,
            novo_status=TaskStatus.A_FAZER,
            prazo_atual=None,
            prazo_informado=None,
            completed_at_atual=None,
            agora=AGORA,
        )
        assert resultado.due_date is None
        assert resultado.status is TaskStatus.A_FAZER


class TestConclusao:
    def test_concluir_carimba_a_data(self) -> None:
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.EM_ANDAMENTO,
            novo_status=TaskStatus.CONCLUIDO,
            prazo_atual=PRAZO,
            prazo_informado=None,
            completed_at_atual=None,
            agora=AGORA,
        )
        assert resultado.completed_at == AGORA

    def test_reconcluir_preserva_a_data_original(self) -> None:
        original = datetime(2026, 7, 1, 9, 0, tzinfo=UTC)
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.CONCLUIDO,
            novo_status=TaskStatus.CONCLUIDO,
            prazo_atual=PRAZO,
            prazo_informado=None,
            completed_at_atual=original,
            agora=AGORA,
        )
        assert resultado.completed_at == original

    def test_reabrir_tarefa_limpa_a_data_de_conclusao(self) -> None:
        resultado = aplica_transicao_de_status(
            status_atual=TaskStatus.CONCLUIDO,
            novo_status=TaskStatus.EM_ANDAMENTO,
            prazo_atual=PRAZO,
            prazo_informado=None,
            completed_at_atual=AGORA,
            agora=AGORA,
        )
        assert resultado.completed_at is None


class TestTarefaDoTime:
    def test_sem_responsavel_pertence_ao_time(self) -> None:
        assert e_tarefa_do_time(quantidade_de_responsaveis=0)

    @pytest.mark.parametrize("quantidade", [1, 2, 5])
    def test_com_responsavel_nao_e_do_time(self, quantidade: int) -> None:
        assert not e_tarefa_do_time(quantidade_de_responsaveis=quantidade)
