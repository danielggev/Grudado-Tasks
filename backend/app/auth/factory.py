from functools import lru_cache

from app.auth.dev import DevProvider
from app.auth.google import GoogleOIDCProvider
from app.auth.provider import IdentityProvider
from app.config import AuthProvider, Settings, get_settings


@lru_cache
def get_identity_provider() -> IdentityProvider:
    return _constroi(get_settings())


def _constroi(settings: Settings) -> IdentityProvider:
    if settings.auth_provider is AuthProvider.DEV:
        # `Settings` ja recusou o boot se isso acontecesse em producao.
        return DevProvider()

    # Os campos abaixo sao obrigatorios quando AUTH_PROVIDER=google; a validacao
    # esta em Settings, entao aqui e so desempacotar.
    assert settings.google_client_id is not None
    assert settings.google_client_secret is not None
    assert settings.google_redirect_uri is not None

    return GoogleOIDCProvider(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret.get_secret_value(),
        redirect_uri=settings.google_redirect_uri,
        hosted_domain=settings.allowed_hosted_domain,
    )
