import base64
import hashlib
import secrets
from collections.abc import Mapping
from typing import Any, cast
from urllib.parse import urlencode

import httpx
from joserfc import jwt
from joserfc.jwk import KeySet

from app.auth.errors import AutenticacaoFalhou
from app.auth.provider import DesafioDeLogin, IdentidadeExterna

URL_AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth"
URL_TOKEN = "https://oauth2.googleapis.com/token"
URL_JWKS = "https://www.googleapis.com/oauth2/v3/certs"
EMISSORES_ACEITOS = frozenset({"accounts.google.com", "https://accounts.google.com"})
ESCOPOS = "openid email profile"

# Claims sensiveis a tempo. `iss` e `aud` sao conferidos em
# valida_claims_do_id_token, onde da para testa-los sem criptografia.
_REGISTRO_DE_CLAIMS = jwt.JWTClaimsRegistry(
    exp={"essential": True},
    iat={"essential": True},
)


def valida_claims_do_id_token(
    claims: Mapping[str, Any],
    *,
    client_id: str,
    hosted_domain: str,
) -> IdentidadeExterna:
    """Converte as claims de um ID token ja verificado criptograficamente em identidade.

    Funcao pura, e isso e o ponto: a restricao de dominio e a barreira de seguranca
    mais importante do app, e uma barreira que so pode ser exercitada por dentro de
    um mock de rede nao e uma barreira que da para testar de verdade. Aqui ela e um
    teste de tabela. Ver tests/domain/test_google_claims.py.

    Pressupoe que a assinatura, `exp` e `iat` ja foram validados por quem chamou.
    """
    if claims.get("iss") not in EMISSORES_ACEITOS:
        raise AutenticacaoFalhou("Token de identidade de origem desconhecida.")

    if claims.get("aud") != client_id:
        raise AutenticacaoFalhou("Token de identidade emitido para outro aplicativo.")

    if claims.get("email_verified") is not True:
        raise AutenticacaoFalhou("Este e-mail nao foi verificado pelo Google.")

    # A barreira que realmente importa. O consent screen "Internal" restringe quem
    # consegue consentir, mas isso e configuracao de console: pode ser alterada, e o
    # app nao tem como saber. Esta verificacao roda no servidor a cada login e nao
    # depende de nada externo -- e a unica que nao pode ser contornada.
    if claims.get("hd") != hosted_domain:
        raise AutenticacaoFalhou("Esta conta Google nao pertence a organizacao.")

    email = claims.get("email")
    subject = claims.get("sub")
    if not isinstance(email, str) or not isinstance(subject, str) or not subject:
        raise AutenticacaoFalhou("Token de identidade incompleto.")

    email = email.lower()
    # Redundante com o `hd` acima, mas barato: cobre o caso de um token com `hd`
    # correto e e-mail de outro dominio, que nao deveria existir.
    if not email.endswith(f"@{hosted_domain.lower()}"):
        raise AutenticacaoFalhou("Esta conta Google nao pertence a organizacao.")

    nome = claims.get("name")
    foto = claims.get("picture")
    return IdentidadeExterna(
        subject=subject,
        email=email,
        name=nome if isinstance(nome, str) and nome else email,
        avatar_url=foto if isinstance(foto, str) else None,
    )


class GoogleOIDCProvider:
    """Authorization Code Flow com PKCE contra o Google Identity."""

    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        hosted_domain: str,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._redirect_uri = redirect_uri
        self._hosted_domain = hosted_domain

    @property
    def nome(self) -> str:
        return "google"

    def iniciar_login(self, *, state: str) -> DesafioDeLogin:
        code_verifier = secrets.token_urlsafe(64)
        desafio = (
            base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest())
            .rstrip(b"=")
            .decode()
        )
        params = {
            "client_id": self._client_id,
            "response_type": "code",
            "scope": ESCOPOS,
            "redirect_uri": self._redirect_uri,
            "state": state,
            "code_challenge": desafio,
            "code_challenge_method": "S256",
            # Dica de interface para o Google ja filtrar a lista de contas.
            # Nao e controle de seguranca -- quem valida e valida_claims_do_id_token.
            "hd": self._hosted_domain,
            "prompt": "select_account",
        }
        return DesafioDeLogin(
            url_de_autorizacao=f"{URL_AUTORIZACAO}?{urlencode(params)}",
            state=state,
            code_verifier=code_verifier,
        )

    async def concluir_login(
        self, *, code: str, code_verifier: str | None
    ) -> IdentidadeExterna:
        if not code_verifier:
            raise AutenticacaoFalhou("Fluxo de login incompleto. Tente entrar novamente.")

        async with httpx.AsyncClient(timeout=10.0) as client:
            resposta = await client.post(
                URL_TOKEN,
                data={
                    "code": code,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "redirect_uri": self._redirect_uri,
                    "grant_type": "authorization_code",
                    "code_verifier": code_verifier,
                },
            )
            if resposta.status_code != httpx.codes.OK:
                raise AutenticacaoFalhou("O Google recusou a troca do codigo de login.")

            id_token = resposta.json().get("id_token")
            if not isinstance(id_token, str):
                raise AutenticacaoFalhou("O Google nao devolveu um token de identidade.")

            jwks = (await client.get(URL_JWKS)).json()

        try:
            # Fixar `algorithms` e obrigatorio: sem isso o token escolheria o proprio
            # algoritmo de verificacao, que e a familia classica de ataque de
            # confusao de algoritmo. O Google assina ID token com RS256.
            token = jwt.decode(id_token, KeySet.import_key_set(jwks), algorithms=["RS256"])
            _REGISTRO_DE_CLAIMS.validate(token.claims)
        except Exception as exc:
            raise AutenticacaoFalhou("Token de identidade invalido ou expirado.") from exc

        return valida_claims_do_id_token(
            cast(Mapping[str, Any], token.claims),
            client_id=self._client_id,
            hosted_domain=self._hosted_domain,
        )
