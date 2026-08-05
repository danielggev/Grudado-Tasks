from urllib.parse import quote

from app.auth.errors import AutenticacaoFalhou
from app.auth.provider import DesafioDeLogin, IdentidadeExterna

ROTA_DE_AUTORIZACAO_DEV = "/api/v1/auth/dev/authorize"


class DevProvider:
    """Provider de desenvolvimento: autentica como qualquer e-mail, sem verificar nada.

    Existe para que times, permissoes e tarefas possam ser construidos e testados
    sem credencial do Google -- e para permitir trocar de usuario em um clique ao
    conferir regra de permissao.

    Segue o mesmo fluxo de redirecionamento do provider real de proposito: o
    caminho exercitado no dia a dia e o mesmo que roda em producao.

    Nunca sobe em producao: `Settings` recusa o boot com AUTH_PROVIDER=dev e
    ENVIRONMENT=prod (ver app/config.py).
    """

    @property
    def nome(self) -> str:
        return "dev"

    def iniciar_login(self, *, state: str) -> DesafioDeLogin:
        return DesafioDeLogin(
            url_de_autorizacao=f"{ROTA_DE_AUTORIZACAO_DEV}?state={quote(state)}",
            state=state,
            code_verifier=None,
        )

    async def concluir_login(
        self, *, code: str, code_verifier: str | None
    ) -> IdentidadeExterna:
        """Aqui o `code` e simplesmente o e-mail escolhido na tela de autorizacao."""
        email = code.strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise AutenticacaoFalhou("Informe um e-mail valido para entrar.")

        return IdentidadeExterna(
            subject=f"dev:{email}",
            email=email,
            name=_nome_a_partir_do_email(email),
        )


def _nome_a_partir_do_email(email: str) -> str:
    local = email.split("@", 1)[0]
    partes = [p for p in local.replace(".", " ").replace("_", " ").split() if p]
    return " ".join(p.capitalize() for p in partes) or local
