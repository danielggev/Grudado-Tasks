from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.domain.enums import OrgRole


class UsuarioPublico(BaseModel):
    """Usuario como aparece para os outros: em avatar, lista de responsaveis, autoria."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    avatar_url: str | None = None


class UsuarioAutenticado(UsuarioPublico):
    """Usuario como ele mesmo se ve: inclui o que a interface usa para decidir o
    que mostrar. O backend nunca confia nisso -- e conveniencia de UI, e as
    permissoes sao reavaliadas a cada request."""

    org_role: OrgRole
    times: list[UUID]
    times_como_lead: list[UUID]
