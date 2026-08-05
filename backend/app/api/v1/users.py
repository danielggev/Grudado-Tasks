from fastapi import APIRouter
from sqlalchemy import select

from app.api.v1.deps import SessaoDep, UsuarioAtual
from app.db.models import User
from app.schemas.user import UsuarioPublico

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("", name="listar_usuarios")
async def listar_usuarios(session: SessaoDep, usuario: UsuarioAtual) -> list[UsuarioPublico]:
    """Usuarios ativos da organizacao, para escolher responsaveis e membros.

    Aberto a qualquer autenticado: numa empresa de 15 pessoas todo mundo ja se
    conhece, e restringir isso so quebraria o seletor de membros sem proteger
    nada que ja nao esteja no Workspace.
    """
    del usuario  # a dependencia existe para exigir autenticacao

    stmt = select(User).where(User.is_active.is_(True)).order_by(User.name)
    usuarios = (await session.execute(stmt)).scalars().all()
    return [UsuarioPublico.model_validate(u) for u in usuarios]
