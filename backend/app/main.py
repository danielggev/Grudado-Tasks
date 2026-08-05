from typing import Any, cast

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute

from app.api.v1.router import router as router_v1
from app.auth.errors import AutenticacaoFalhou
from app.config import get_settings
from app.domain.errors import AcessoNegado, RecursoNaoEncontrado, RegraDeDominioViolada


def _id_de_operacao(route: APIRoute) -> str:
    """Usa o nome da rota como operationId do OpenAPI.

    Sem isso o FastAPI gera nomes como `usuario_atual_api_v1_auth_me_get`, que
    viram nomes de funcao no cliente TypeScript. O `name=` de cada rota passa a
    ser, na pratica, a API publica vista pelo frontend.
    """
    return route.name


async def _erro_de_regra(request: Request, exc: Exception) -> JSONResponse:
    """Regra de dominio violada -> 422, apontando o campo culpado quando houver."""
    del request
    regra = cast(RegraDeDominioViolada, exc)
    corpo: dict[str, Any] = {"detail": regra.mensagem}
    if regra.campo:
        corpo["campo"] = regra.campo
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=corpo)


async def _erro_de_acesso(request: Request, exc: Exception) -> JSONResponse:
    del request
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": cast(AcessoNegado, exc).mensagem},
    )


async def _nao_encontrado(request: Request, exc: Exception) -> JSONResponse:
    """404 tambem para "existe, mas nao e seu".

    Ver RecursoNaoEncontrado: responder 403 nesse caso confirmaria a existencia
    do recurso a quem nao deveria saber dela.
    """
    del request
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": cast(RecursoNaoEncontrado, exc).mensagem},
    )


async def _erro_de_autenticacao(request: Request, exc: Exception) -> JSONResponse:
    del request
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": cast(AutenticacaoFalhou, exc).mensagem},
    )


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Grudado Tasks API",
        version="0.1.0",
        generate_unique_id_function=_id_de_operacao,
    )

    # allow_credentials e obrigatorio: a sessao viaja em cookie HttpOnly, entao o
    # navegador so a envia se a origem estiver explicitamente autorizada.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Fronteira entre dominio e HTTP: e aqui, e so aqui, que erro de negocio vira
    # status code. Nada dentro de app/domain conhece FastAPI.
    app.add_exception_handler(RegraDeDominioViolada, _erro_de_regra)
    app.add_exception_handler(AcessoNegado, _erro_de_acesso)
    app.add_exception_handler(RecursoNaoEncontrado, _nao_encontrado)
    app.add_exception_handler(AutenticacaoFalhou, _erro_de_autenticacao)

    app.include_router(router_v1, prefix="/api/v1")

    @app.get("/health", tags=["infra"], name="health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "auth_provider": settings.auth_provider.value}

    return app


app = create_app()
