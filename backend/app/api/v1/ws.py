import asyncio
import contextlib
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, status
from sqlalchemy import select

from app.auth.session import COOKIE_DE_SESSAO, SessaoInvalida, le_token_de_sessao
from app.config import get_settings
from app.db.models import User
from app.db.session import get_sessionmaker
from app.domain.permissions import pode_ver_time
from app.realtime.hub import get_hub
from app.services.auth_service import monta_contexto_de_acesso

router = APIRouter()

_INTERVALO_DE_PING = 30.0


@router.websocket("/ws")
async def canal_do_time(
    websocket: WebSocket, team_id: Annotated[UUID, Query()]
) -> None:
    """Assina os eventos de um time.

    Mesma autenticacao do resto da API: o cookie HttpOnly de sessao, que o
    navegador envia tambem no handshake de WebSocket. Nao ha token na URL --
    URL vaza em log, cookie nao.

    A autorizacao e a mesma do board: quem nao pode ver o time nao assina o
    canal dele. Fechamos com 1008 (policy violation) sem detalhar o motivo,
    pelo mesmo principio do 404 indistinguivel da API.
    """
    token = websocket.cookies.get(COOKIE_DE_SESSAO)
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    settings = get_settings()
    try:
        user_id = le_token_de_sessao(settings, token)
    except SessaoInvalida:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Sessao curta so para autorizar o handshake: conexao WS vive minutos ou
    # horas, e segurar uma conexao de banco por esse tempo esgotaria o pool.
    async with get_sessionmaker()() as session:
        usuario = (
            await session.execute(select(User).where(User.id == user_id))
        ).scalar_one_or_none()
        if usuario is None or not usuario.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        contexto = await monta_contexto_de_acesso(session, usuario)

    if not pode_ver_time(contexto, team_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    hub = get_hub()
    fila = hub.inscreve(team_id)
    try:
        while True:
            try:
                evento = await asyncio.wait_for(fila.get(), timeout=_INTERVALO_DE_PING)
            except TimeoutError:
                # Sem evento ha 30s: ping aplicativo. Mantem a conexao viva
                # atraves de proxies (Caddy inclusive) e detecta cliente morto
                # -- o send falha e o finally limpa a inscricao.
                await websocket.send_json({"tipo": "ping"})
                continue
            await websocket.send_json(evento.como_json())
    except Exception:
        # Desconexao (aba fechada, rede caiu) nao e erro do servidor.
        with contextlib.suppress(Exception):
            await websocket.close()
    finally:
        hub.cancela(team_id, fila)
