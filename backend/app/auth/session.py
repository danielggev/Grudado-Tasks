from uuid import UUID

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import Settings

COOKIE_DE_SESSAO = "grudado_session"
COOKIE_DE_ESTADO_OAUTH = "grudado_oauth"

_SALT_SESSAO = "grudado-tasks.sessao"
_SALT_OAUTH = "grudado-tasks.oauth"


class SessaoInvalida(Exception):
    pass


def _serializer(settings: Settings, salt: str) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.session_secret.get_secret_value(), salt=salt)


def cria_token_de_sessao(settings: Settings, user_id: UUID) -> str:
    return _serializer(settings, _SALT_SESSAO).dumps(str(user_id))


def le_token_de_sessao(settings: Settings, token: str) -> UUID:
    try:
        bruto = _serializer(settings, _SALT_SESSAO).loads(
            token, max_age=settings.session_max_age_seconds
        )
    except (SignatureExpired, BadSignature) as exc:
        raise SessaoInvalida(str(exc)) from exc

    if not isinstance(bruto, str):
        raise SessaoInvalida("Conteudo de sessao inesperado.")
    try:
        return UUID(bruto)
    except ValueError as exc:
        raise SessaoInvalida("Identificador de usuario invalido na sessao.") from exc


def cria_token_de_estado(settings: Settings, *, state: str, code_verifier: str | None) -> str:
    """Guarda `state` e `code_verifier` num cookie assinado e efemero.

    Mantem o servidor sem estado entre o redirecionamento e o callback -- nao
    precisa de Redis nem de tabela so para segurar 5 minutos de fluxo de login.
    """
    return _serializer(settings, _SALT_OAUTH).dumps(
        {"state": state, "code_verifier": code_verifier}
    )


def le_token_de_estado(settings: Settings, token: str) -> tuple[str, str | None]:
    try:
        bruto = _serializer(settings, _SALT_OAUTH).loads(token, max_age=600)
    except (SignatureExpired, BadSignature) as exc:
        raise SessaoInvalida("Fluxo de login expirado ou adulterado.") from exc

    if not isinstance(bruto, dict) or "state" not in bruto:
        raise SessaoInvalida("Conteudo de estado inesperado.")

    state = bruto["state"]
    verifier = bruto.get("code_verifier")
    if not isinstance(state, str) or not (verifier is None or isinstance(verifier, str)):
        raise SessaoInvalida("Conteudo de estado inesperado.")
    return state, verifier
