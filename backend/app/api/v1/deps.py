from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.session import COOKIE_DE_SESSAO, SessaoInvalida, le_token_de_sessao
from app.config import Settings, get_settings
from app.db.models import User
from app.db.session import get_session
from app.domain.permissions import ContextoDeAcesso
from app.services.auth_service import monta_contexto_de_acesso

SessaoDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

NAO_AUTENTICADO = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sessao ausente ou expirada.",
)


async def get_usuario_atual(
    session: SessaoDep,
    settings: SettingsDep,
    token: Annotated[str | None, Cookie(alias=COOKIE_DE_SESSAO)] = None,
) -> User:
    if not token:
        raise NAO_AUTENTICADO

    try:
        user_id = le_token_de_sessao(settings, token)
    except SessaoInvalida as exc:
        raise NAO_AUTENTICADO from exc

    usuario = (
        await session.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    # Usuario desativado perde o acesso na hora, mesmo com cookie ainda valido.
    if usuario is None or not usuario.is_active:
        raise NAO_AUTENTICADO

    return usuario


UsuarioAtual = Annotated[User, Depends(get_usuario_atual)]


async def get_contexto_de_acesso(
    session: SessaoDep, usuario: UsuarioAtual
) -> ContextoDeAcesso:
    return await monta_contexto_de_acesso(session, usuario)


ContextoDep = Annotated[ContextoDeAcesso, Depends(get_contexto_de_acesso)]
