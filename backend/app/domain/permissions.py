"""Regras de autorizacao.

Puro como task_rules: recebe um retrato do usuario e responde sim ou nao. Quem
monta esse retrato a partir do banco e a camada de servico, e quem traduz a
negativa em 403 e a camada HTTP.

Separar assim tem um efeito pratico: da para cobrir a matriz inteira de
permissoes com testes de tabela, sem subir aplicacao nem popular banco.
"""

from dataclasses import dataclass
from uuid import UUID

from app.domain.enums import OrgRole
from app.domain.errors import AcessoNegado


@dataclass(frozen=True)
class ContextoDeAcesso:
    """Retrato do usuario autenticado, o suficiente para decidir acesso."""

    user_id: UUID
    org_role: OrgRole
    times: frozenset[UUID]
    times_como_lead: frozenset[UUID]

    @property
    def e_admin(self) -> bool:
        return self.org_role is OrgRole.ADMIN

    def e_membro_de(self, team_id: UUID) -> bool:
        return team_id in self.times

    def e_lead_de(self, team_id: UUID) -> bool:
        return team_id in self.times_como_lead


# --- Times ---------------------------------------------------------------


def pode_criar_time(ctx: ContextoDeAcesso) -> bool:
    """Criar time e ato estrutural e raro; fica com o admin da organizacao."""
    return ctx.e_admin


def pode_ver_time(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    return ctx.e_admin or ctx.e_membro_de(team_id)


def pode_gerenciar_time(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    """Renomear, editar descricao, arquivar."""
    return ctx.e_admin or ctx.e_lead_de(team_id)


def pode_gerenciar_membros(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    return ctx.e_admin or ctx.e_lead_de(team_id)


def pode_excluir_time(ctx: ContextoDeAcesso) -> bool:
    """Excluir e mais restrito que arquivar, e de proposito.

    Arquivar preserva tudo e da para desfazer -- por isso e do lead. Excluir
    leva junto as tarefas e o historico do time, sem volta, entao fica so com o
    admin da organizacao.
    """
    return ctx.e_admin


# --- Tarefas -------------------------------------------------------------


def pode_ver_tarefas_do_time(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    return pode_ver_time(ctx, team_id)


def pode_criar_tarefa(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    return ctx.e_admin or ctx.e_membro_de(team_id)


def pode_editar_tarefa(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    """Qualquer membro do time edita qualquer tarefa do time.

    Coerente com "progresso unico compartilhado": se o time inteiro toca no
    status, nao faz sentido travar a edicao por responsavel. O log de atividade
    e que registra a autoria.
    """
    return ctx.e_admin or ctx.e_membro_de(team_id)


def pode_excluir_tarefa(ctx: ContextoDeAcesso, team_id: UUID) -> bool:
    """Excluir e destrutivo e some com o historico; fica com lead e admin."""
    return ctx.e_admin or ctx.e_lead_de(team_id)


# --- Borda ---------------------------------------------------------------


def exigir(permitido: bool, mensagem: str = "Voce nao tem acesso a este recurso.") -> None:
    if not permitido:
        raise AcessoNegado(mensagem)
