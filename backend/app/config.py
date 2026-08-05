from enum import StrEnum
from functools import lru_cache
from typing import Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SESSION_SECRET_PADRAO = "dev-secret-nao-use-em-producao"


class Environment(StrEnum):
    DEV = "dev"
    PROD = "prod"


class AuthProvider(StrEnum):
    DEV = "dev"
    GOOGLE = "google"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Environment = Environment.DEV

    database_url: str = "postgresql+psycopg://grudado:grudado@localhost:5432/grudado_tasks"

    session_secret: SecretStr = SecretStr(SESSION_SECRET_PADRAO)
    session_max_age_seconds: int = 60 * 60 * 24 * 14

    auth_provider: AuthProvider = AuthProvider.DEV
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None
    google_redirect_uri: str | None = None

    # Dominio do Workspace aceito na claim `hd` do ID token. A restricao no consent
    # screen do Google e a primeira barreira; esta e a que realmente vale, porque
    # roda no servidor. Ver app/auth/google.py.
    allowed_hosted_domain: str = "grudadoemvoce.com.br"

    frontend_url: str = "http://localhost:5173"
    cors_origins: list[str] = ["http://localhost:5173"]

    @property
    def is_prod(self) -> bool:
        return self.environment is Environment.PROD

    @model_validator(mode="after")
    def _valida_producao(self) -> Self:
        """Invariantes que so fazem sentido cobrar em producao.

        Falhar no boot e proposital: um app que sobe com autenticacao falsa ou com
        segredo publico e pior do que um app que nao sobe.
        """
        if not self.is_prod:
            return self

        if self.auth_provider is AuthProvider.DEV:
            raise ValueError(
                "AUTH_PROVIDER=dev nao pode rodar em producao: ele emite sessao sem "
                "verificar identidade nenhuma."
            )
        if self.session_secret.get_secret_value() == SESSION_SECRET_PADRAO:
            raise ValueError("SESSION_SECRET precisa ser definido em producao.")
        return self

    @model_validator(mode="after")
    def _valida_google(self) -> Self:
        if self.auth_provider is not AuthProvider.GOOGLE:
            return self

        faltando = [
            nome
            for nome, valor in (
                ("GOOGLE_CLIENT_ID", self.google_client_id),
                ("GOOGLE_CLIENT_SECRET", self.google_client_secret),
                ("GOOGLE_REDIRECT_URI", self.google_redirect_uri),
            )
            if not valor
        ]
        if faltando:
            raise ValueError(
                f"AUTH_PROVIDER=google exige: {', '.join(faltando)}."
            )
        if not self.allowed_hosted_domain:
            raise ValueError(
                "ALLOWED_HOSTED_DOMAIN nao pode ser vazio com AUTH_PROVIDER=google: "
                "sem ele qualquer conta Google entraria."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
