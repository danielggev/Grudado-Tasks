from uuid import uuid4

import pytest

from app.domain.task_rules import (
    SubtarefaDeOutroTime,
    SubtarefaNaoAceitaSubtarefa,
    TarefaNaoPodeSerPropriaMae,
    valida_vinculo_de_subtarefa,
)

TIME = uuid4()
OUTRO_TIME = uuid4()
MAE = uuid4()


def valida(**alteracoes: object) -> None:
    padrao: dict[str, object] = {
        "task_id": None,
        "parent_id": MAE,
        "parent_tem_mae": False,
        "parent_team_id": TIME,
        "team_id": TIME,
    }
    padrao.update(alteracoes)
    valida_vinculo_de_subtarefa(**padrao)  # type: ignore[arg-type]


class TestVinculoValido:
    def test_subtarefa_nova_sob_tarefa_do_mesmo_time(self) -> None:
        valida()

    def test_tarefa_existente_sob_outra_tarefa(self) -> None:
        valida(task_id=uuid4())


class TestProfundidade:
    def test_subtarefa_nao_aceita_subtarefa(self) -> None:
        """Um nivel apenas: tarefa e subtarefa, nada alem."""
        with pytest.raises(SubtarefaNaoAceitaSubtarefa) as exc:
            valida(parent_tem_mae=True)
        assert exc.value.campo == "parent_id"


class TestCiclo:
    def test_tarefa_nao_pode_ser_mae_de_si_mesma(self) -> None:
        with pytest.raises(TarefaNaoPodeSerPropriaMae):
            valida(task_id=MAE)


class TestTime:
    def test_subtarefa_precisa_ser_do_time_da_mae(self) -> None:
        with pytest.raises(SubtarefaDeOutroTime):
            valida(team_id=OUTRO_TIME)

    def test_o_ciclo_e_verificado_antes_do_time(self) -> None:
        """Com dois problemas ao mesmo tempo, o erro reportado e o mais estrutural."""
        with pytest.raises(TarefaNaoPodeSerPropriaMae):
            valida(task_id=MAE, team_id=OUTRO_TIME)
