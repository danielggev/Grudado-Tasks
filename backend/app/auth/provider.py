from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class IdentidadeExterna:
    """O que um provider afirma sobre quem esta entrando.

    Nao e um usuario do app: e a afirmacao de identidade, ainda por casar com um
    `User` do banco. Quem faz esse casamento e o auth_service -- e essa fronteira
    e justamente o que permite trocar de provider sem tocar no resto.
    """

    subject: str
    email: str
    name: str
    avatar_url: str | None = None


@dataclass(frozen=True)
class DesafioDeLogin:
    """Para onde mandar o navegador, e o que guardar para conferir na volta."""

    url_de_autorizacao: str
    state: str
    code_verifier: str | None = None


class IdentityProvider(Protocol):
    """Contrato de autenticacao.

    Ha duas implementacoes -- `DevProvider` e `GoogleOIDCProvider` -- e ambas
    passam pelo mesmo fluxo de redirecionamento. Manter o dev com o formato do
    real e proposital: o caminho exercitado em desenvolvimento e o mesmo que roda
    em producao, entao o fluxo nao estreia no deploy.
    """

    @property
    def nome(self) -> str: ...

    def iniciar_login(self, *, state: str) -> DesafioDeLogin: ...

    async def concluir_login(
        self, *, code: str, code_verifier: str | None
    ) -> IdentidadeExterna: ...
