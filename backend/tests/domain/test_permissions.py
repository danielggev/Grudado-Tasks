from collections.abc import Callable
from uuid import UUID, uuid4

import pytest

from app.domain.enums import OrgRole
from app.domain.errors import AcessoNegado
from app.domain.permissions import (
    ContextoDeAcesso,
    exigir,
    pode_criar_tarefa,
    pode_criar_time,
    pode_editar_tarefa,
    pode_excluir_tarefa,
    pode_gerenciar_membros,
    pode_gerenciar_time,
    pode_ver_time,
)

TIME_A = uuid4()
TIME_B = uuid4()

Regra = Callable[[ContextoDeAcesso, UUID], bool]

TODAS_AS_REGRAS_DE_TIME: list[Regra] = [
    pode_ver_time,
    pode_gerenciar_time,
    pode_gerenciar_membros,
    pode_criar_tarefa,
    pode_editar_tarefa,
    pode_excluir_tarefa,
]


def contexto(
    *,
    org_role: OrgRole = OrgRole.MEMBER,
    times: frozenset[UUID] = frozenset(),
    leads: frozenset[UUID] = frozenset(),
) -> ContextoDeAcesso:
    return ContextoDeAcesso(
        user_id=uuid4(), org_role=org_role, times=times, times_como_lead=leads
    )


class TestAdmin:
    @pytest.mark.parametrize("regra", TODAS_AS_REGRAS_DE_TIME)
    def test_admin_pode_tudo_mesmo_fora_do_time(self, regra: Regra) -> None:
        admin = contexto(org_role=OrgRole.ADMIN)
        assert regra(admin, TIME_A)

    def test_admin_pode_criar_time(self) -> None:
        assert pode_criar_time(contexto(org_role=OrgRole.ADMIN))

    def test_membro_comum_nao_pode_criar_time(self) -> None:
        assert not pode_criar_time(contexto(times=frozenset({TIME_A})))


class TestIsolamentoEntreTimes:
    @pytest.mark.parametrize("regra", TODAS_AS_REGRAS_DE_TIME)
    def test_membro_de_um_time_nao_alcanca_outro(self, regra: Regra) -> None:
        membro_do_a = contexto(times=frozenset({TIME_A}), leads=frozenset({TIME_A}))
        assert not regra(membro_do_a, TIME_B)

    @pytest.mark.parametrize("regra", TODAS_AS_REGRAS_DE_TIME)
    def test_usuario_sem_time_nao_alcanca_nada(self, regra: Regra) -> None:
        assert not regra(contexto(), TIME_A)


class TestMembroComum:
    @pytest.fixture
    def membro(self) -> ContextoDeAcesso:
        return contexto(times=frozenset({TIME_A}))

    def test_ve_o_proprio_time(self, membro: ContextoDeAcesso) -> None:
        assert pode_ver_time(membro, TIME_A)

    def test_cria_e_edita_tarefas_do_proprio_time(self, membro: ContextoDeAcesso) -> None:
        assert pode_criar_tarefa(membro, TIME_A)
        assert pode_editar_tarefa(membro, TIME_A)

    def test_nao_gerencia_o_time_nem_exclui_tarefa(self, membro: ContextoDeAcesso) -> None:
        assert not pode_gerenciar_time(membro, TIME_A)
        assert not pode_gerenciar_membros(membro, TIME_A)
        assert not pode_excluir_tarefa(membro, TIME_A)


class TestLead:
    @pytest.fixture
    def lead(self) -> ContextoDeAcesso:
        return contexto(times=frozenset({TIME_A}), leads=frozenset({TIME_A}))

    def test_gerencia_o_proprio_time(self, lead: ContextoDeAcesso) -> None:
        assert pode_gerenciar_time(lead, TIME_A)
        assert pode_gerenciar_membros(lead, TIME_A)
        assert pode_excluir_tarefa(lead, TIME_A)

    def test_nao_cria_time_novo(self, lead: ContextoDeAcesso) -> None:
        assert not pode_criar_time(lead)


class TestExigir:
    def test_deixa_passar_quando_permitido(self) -> None:
        exigir(True)

    def test_levanta_quando_negado(self) -> None:
        with pytest.raises(AcessoNegado):
            exigir(False)
