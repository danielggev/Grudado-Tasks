from itertools import islice

import pytest

from app.domain.team_rules import (
    SLUG_MAXIMO,
    UltimoLeadDoTime,
    gera_slug,
    valida_saida_de_lead,
    variacoes_de_slug,
)


class TestGeraSlug:
    @pytest.mark.parametrize(
        ("nome", "esperado"),
        [
            ("Design", "design"),
            ("Design e Criacao", "design-e-criacao"),
            ("Criação", "criacao"),
            ("Produção Gráfica", "producao-grafica"),
            ("Atendimento & Vendas", "atendimento-vendas"),
            ("  espacos  nas  bordas  ", "espacos-nas-bordas"),
            ("Time 2", "time-2"),
            ("MAIUSCULAS", "maiusculas"),
            ("hifens---repetidos", "hifens-repetidos"),
            ("pontuacao!!!", "pontuacao"),
        ],
    )
    def test_normaliza(self, nome: str, esperado: str) -> None:
        assert gera_slug(nome) == esperado

    def test_nome_sem_caractere_aproveitavel_cai_na_reserva(self) -> None:
        assert gera_slug("!!!") == "time"
        assert gera_slug("日本語") == "time"

    def test_respeita_o_limite_sem_deixar_hifen_solto(self) -> None:
        slug = gera_slug("palavra " * 40)
        assert len(slug) <= SLUG_MAXIMO
        assert not slug.endswith("-")

    def test_acentuado_e_nao_acentuado_colidem_de_proposito(self) -> None:
        """A colisao e desejada: o servico desempata com sufixo numerico."""
        assert gera_slug("Criação") == gera_slug("Criacao")


class TestVariacoesDeSlug:
    def test_primeiro_candidato_e_o_proprio_slug(self) -> None:
        assert next(iter(variacoes_de_slug("design"))) == "design"

    def test_desempata_com_sufixo_numerico(self) -> None:
        assert list(islice(variacoes_de_slug("design"), 4)) == [
            "design",
            "design-2",
            "design-3",
            "design-4",
        ]

    def test_sufixo_nao_estoura_o_limite(self) -> None:
        base = "a" * SLUG_MAXIMO
        assert all(len(s) <= SLUG_MAXIMO for s in islice(variacoes_de_slug(base), 30))


class TestUltimoLead:
    def test_time_com_dois_leads_permite_saida(self) -> None:
        valida_saida_de_lead(total_de_leads=2)

    @pytest.mark.parametrize("total", [0, 1])
    def test_time_ficaria_sem_lead(self, total: int) -> None:
        with pytest.raises(UltimoLeadDoTime):
            valida_saida_de_lead(total_de_leads=total)
