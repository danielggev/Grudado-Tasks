import pytest

from app.domain.ordering import (
    ESPACO_PADRAO,
    PrecisaRebalancear,
    calcula_posicao,
    posicoes_rebalanceadas,
)


class TestPontas:
    def test_coluna_vazia(self) -> None:
        assert calcula_posicao(anterior=None, proxima=None) == ESPACO_PADRAO

    def test_no_topo_fica_antes_do_primeiro(self) -> None:
        posicao = calcula_posicao(anterior=None, proxima=1000.0)
        assert posicao < 1000.0

    def test_no_fim_fica_depois_do_ultimo(self) -> None:
        posicao = calcula_posicao(anterior=3000.0, proxima=None)
        assert posicao > 3000.0


class TestEntreVizinhos:
    def test_fica_no_meio(self) -> None:
        assert calcula_posicao(anterior=1000.0, proxima=2000.0) == 1500.0

    def test_mantem_a_ordem_apos_insercoes_repetidas(self) -> None:
        """O ponto do esquema: inserir sempre no mesmo lugar continua ordenando."""
        anterior, proxima = 1000.0, 2000.0
        posicoes = []
        for _ in range(20):
            nova = calcula_posicao(anterior=anterior, proxima=proxima)
            posicoes.append(nova)
            proxima = nova

        assert posicoes == sorted(posicoes, reverse=True)
        assert all(1000.0 < p < 2000.0 for p in posicoes)


class TestEsgotamentoDePrecisao:
    def test_sinaliza_quando_nao_ha_intervalo(self) -> None:
        with pytest.raises(PrecisaRebalancear):
            calcula_posicao(anterior=1.0, proxima=1.0)

    def test_sinaliza_quando_o_intervalo_e_menor_que_o_minimo(self) -> None:
        with pytest.raises(PrecisaRebalancear):
            calcula_posicao(anterior=1.0, proxima=1.0 + 1e-9)

    def test_sinaliza_no_topo_quando_o_primeiro_esta_colado_no_zero(self) -> None:
        with pytest.raises(PrecisaRebalancear):
            calcula_posicao(anterior=None, proxima=1e-9)


class TestRebalanceamento:
    def test_devolve_posicoes_crescentes_e_espacadas(self) -> None:
        posicoes = posicoes_rebalanceadas(4)
        assert posicoes == [1000.0, 2000.0, 3000.0, 4000.0]

    def test_coluna_vazia_nao_gera_posicao(self) -> None:
        assert posicoes_rebalanceadas(0) == []

    def test_apos_rebalancear_ha_espaco_de_novo(self) -> None:
        primeira, segunda = posicoes_rebalanceadas(2)
        assert calcula_posicao(anterior=primeira, proxima=segunda) == 1500.0
