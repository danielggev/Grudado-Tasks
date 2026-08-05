"""Barreira de dominio do login com Google.

Estes testes cobrem a regra de seguranca mais importante do app: so entra quem
pertence a organizacao. Rodam sem rede e sem mock porque
`valida_claims_do_id_token` e pura -- que foi exatamente o motivo de extrai-la.
"""

from typing import Any

import pytest

from app.auth.errors import AutenticacaoFalhou
from app.auth.google import valida_claims_do_id_token

CLIENT_ID = "123456.apps.googleusercontent.com"
DOMINIO = "grudadoemvoce.com.br"


def claims(**alteracoes: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "108120121234567890123",
        "email": "daniel@grudadoemvoce.com.br",
        "email_verified": True,
        "hd": DOMINIO,
        "name": "Daniel Gomes",
        "picture": "https://lh3.googleusercontent.com/foto",
    }
    base.update(alteracoes)
    return base


def valida(**alteracoes: Any) -> Any:
    return valida_claims_do_id_token(
        claims(**alteracoes), client_id=CLIENT_ID, hosted_domain=DOMINIO
    )


class TestRestricaoDeDominio:
    def test_conta_de_outro_dominio_e_rejeitada(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(hd="outraempresa.com.br", email="alguem@outraempresa.com.br")

    def test_conta_gmail_pessoal_e_rejeitada(self) -> None:
        """Conta pessoal nao carrega `hd` nenhum -- e o caso mais provavel na pratica."""
        sem_hd = claims(email="pessoa@gmail.com")
        del sem_hd["hd"]
        with pytest.raises(AutenticacaoFalhou):
            valida_claims_do_id_token(sem_hd, client_id=CLIENT_ID, hosted_domain=DOMINIO)

    def test_hd_nulo_e_rejeitado(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(hd=None)

    def test_hd_correto_mas_email_de_outro_dominio_e_rejeitado(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(email="intruso@outrolugar.com")

    def test_dominio_parecido_nao_passa(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(hd="grudadoemvoce.com", email="daniel@grudadoemvoce.com")


class TestIntegridadeDoToken:
    def test_emissor_desconhecido_e_rejeitado(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(iss="https://accounts.evil.com")

    def test_token_de_outro_aplicativo_e_rejeitado(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(aud="999999.apps.googleusercontent.com")

    @pytest.mark.parametrize("valor", [False, None, "true"])
    def test_email_nao_verificado_e_rejeitado(self, valor: Any) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(email_verified=valor)

    def test_sem_subject_e_rejeitado(self) -> None:
        with pytest.raises(AutenticacaoFalhou):
            valida(sub="")


class TestIdentidadeResultante:
    def test_conta_da_organizacao_e_aceita(self) -> None:
        identidade = valida()
        assert identidade.subject == "108120121234567890123"
        assert identidade.email == "daniel@grudadoemvoce.com.br"
        assert identidade.name == "Daniel Gomes"
        assert identidade.avatar_url == "https://lh3.googleusercontent.com/foto"

    def test_email_e_normalizado_para_minusculas(self) -> None:
        assert valida(email="Daniel@Grudadoemvoce.com.br").email == "daniel@grudadoemvoce.com.br"

    def test_sem_nome_usa_o_email(self) -> None:
        assert valida(name="").email == valida(name="").name

    def test_sem_foto_fica_nulo(self) -> None:
        sem_foto = claims()
        del sem_foto["picture"]
        identidade = valida_claims_do_id_token(
            sem_foto, client_id=CLIENT_ID, hosted_domain=DOMINIO
        )
        assert identidade.avatar_url is None
