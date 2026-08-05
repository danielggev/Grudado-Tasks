import html
import secrets
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse

from app.api.v1.deps import ContextoDep, SessaoDep, SettingsDep, UsuarioAtual
from app.auth.errors import AutenticacaoFalhou
from app.auth.factory import get_identity_provider
from app.auth.session import (
    COOKIE_DE_ESTADO_OAUTH,
    COOKIE_DE_SESSAO,
    SessaoInvalida,
    cria_token_de_estado,
    cria_token_de_sessao,
    le_token_de_estado,
)
from app.config import AuthProvider, Settings
from app.schemas.user import UsuarioAutenticado
from app.services.auth_service import obtem_ou_cria_usuario

router = APIRouter(prefix="/auth", tags=["auth"])


def _define_cookie(
    response: Response, settings: Settings, *, nome: str, valor: str, max_age: int
) -> None:
    response.set_cookie(
        key=nome,
        value=valor,
        max_age=max_age,
        httponly=True,
        secure=settings.is_prod,
        samesite="lax",
        path="/",
    )


@router.get("/login", name="iniciar_login")
async def iniciar_login(settings: SettingsDep) -> RedirectResponse:
    """Manda o navegador para o provider de identidade."""
    provider = get_identity_provider()
    desafio = provider.iniciar_login(state=secrets.token_urlsafe(32))

    resposta = RedirectResponse(desafio.url_de_autorizacao, status_code=status.HTTP_302_FOUND)
    _define_cookie(
        resposta,
        settings,
        nome=COOKIE_DE_ESTADO_OAUTH,
        valor=cria_token_de_estado(
            settings, state=desafio.state, code_verifier=desafio.code_verifier
        ),
        max_age=600,
    )
    return resposta


@router.get("/callback", name="concluir_login")
async def concluir_login(
    session: SessaoDep,
    settings: SettingsDep,
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
    oauth_state: Annotated[str | None, Cookie(alias=COOKIE_DE_ESTADO_OAUTH)] = None,
) -> RedirectResponse:
    """Volta do provider: confere o `state`, resolve a identidade e abre a sessao."""
    if not oauth_state:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fluxo de login nao iniciado.")

    try:
        state_esperado, code_verifier = le_token_de_estado(settings, oauth_state)
    except SessaoInvalida as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.args[0]) from exc

    # Barreira contra CSRF no login: o `state` que voltou tem que ser o mesmo que
    # saiu, e ele veio de um cookie assinado que o atacante nao consegue forjar.
    if not secrets.compare_digest(state, state_esperado):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Estado de login nao confere.")

    provider = get_identity_provider()
    try:
        identidade = await provider.concluir_login(code=code, code_verifier=code_verifier)
    except AutenticacaoFalhou as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, exc.mensagem) from exc

    usuario = await obtem_ou_cria_usuario(session, identidade)

    resposta = RedirectResponse(settings.frontend_url, status_code=status.HTTP_302_FOUND)
    _define_cookie(
        resposta,
        settings,
        nome=COOKIE_DE_SESSAO,
        valor=cria_token_de_sessao(settings, usuario.id),
        max_age=settings.session_max_age_seconds,
    )
    resposta.delete_cookie(COOKIE_DE_ESTADO_OAUTH, path="/")
    return resposta


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, name="encerrar_sessao")
async def encerrar_sessao(response: Response) -> None:
    response.delete_cookie(COOKIE_DE_SESSAO, path="/")


@router.get("/me", name="usuario_atual")
async def usuario_atual(usuario: UsuarioAtual, contexto: ContextoDep) -> UsuarioAutenticado:
    return UsuarioAutenticado(
        id=usuario.id,
        email=usuario.email,
        name=usuario.name,
        avatar_url=usuario.avatar_url,
        org_role=usuario.org_role,
        times=sorted(contexto.times),
        times_como_lead=sorted(contexto.times_como_lead),
    )


@router.get("/dev/authorize", include_in_schema=False)
async def autorizar_em_desenvolvimento(
    settings: SettingsDep, state: str = Query(...)
) -> HTMLResponse:
    """Tela de escolha de usuario do `DevProvider`.

    Faz o papel do consentimento do Google no ambiente local, para que o fluxo de
    login exercitado em desenvolvimento seja o mesmo que roda em producao.
    Trocar de usuario aqui e a forma mais rapida de conferir regra de permissao.
    """
    if settings.auth_provider is not AuthProvider.DEV:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    sugestoes = [
        f"daniel@{settings.allowed_hosted_domain}",
        f"lead.design@{settings.allowed_hosted_domain}",
        f"membro.producao@{settings.allowed_hosted_domain}",
    ]
    opcoes = "".join(
        f'<button name="code" value="{html.escape(e)}">{html.escape(e)}</button>'
        for e in sugestoes
    )
    return HTMLResponse(
        f"""<!doctype html>
<meta charset="utf-8"><title>Entrar (desenvolvimento)</title>
<style>
 body{{font:15px/1.5 system-ui,sans-serif;max-width:32rem;margin:6rem auto;padding:0 1rem}}
 h1{{font-size:1.1rem}} p{{color:#666}}
 form{{display:flex;flex-direction:column;gap:.5rem;margin-top:1.5rem}}
 button,input{{padding:.6rem .8rem;font:inherit;border:1px solid #ccc;border-radius:.4rem}}
 button{{cursor:pointer;background:#fff;text-align:left}} button:hover{{background:#f3f3f3}}
 hr{{margin:1.5rem 0;border:0;border-top:1px solid #eee}}
</style>
<h1>Entrar como</h1>
<p>Provider de desenvolvimento. Nenhuma senha e verificada.</p>
<form method="get" action="/api/v1/auth/callback">
  <input type="hidden" name="state" value="{html.escape(state)}">
  {opcoes}
  <hr>
  <input name="code" placeholder="outro@email.com" aria-label="Outro e-mail">
  <button type="submit">Entrar com o e-mail digitado</button>
</form>"""
    )
