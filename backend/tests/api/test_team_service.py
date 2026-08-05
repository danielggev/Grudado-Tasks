"""Testes de integracao do team_service, contra Postgres real.

Rodam com DATABASE_URL_TESTE apontando para um banco descartavel:

    DATABASE_URL_TESTE=postgresql+psycopg://grudado:grudado@localhost:5432/grudado_teste \
        pytest -m integracao

O que e regra pura (slug, ultimo lead) ja esta coberto em tests/domain/ sem
banco. O que se verifica aqui e a costura: consultas, RBAC ponta a ponta e as
restricoes que so o banco garante.
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import OrgRole, TeamRole
from app.domain.errors import AcessoNegado, RecursoNaoEncontrado
from app.domain.team_rules import MembroJaNoTime, TimeArquivado, UltimoLeadDoTime
from app.schemas.team import AdicionarMembro, TimeAtualizar, TimeCriar
from app.services import team_service
from tests.conftest import SEM_BANCO, contexto_de, cria_time_com_lead, cria_usuario

pytestmark = [pytest.mark.integracao, SEM_BANCO]


class TestCriacao:
    async def test_admin_cria_time_e_entra_como_lead(self, session: AsyncSession) -> None:
        admin = await cria_usuario(session, nome="Admin", papel=OrgRole.ADMIN)
        ctx = await contexto_de(session, admin)

        time = await team_service.cria_time(session, ctx, TimeCriar(name="Design"))

        assert time.slug == "design"
        assert len(time.members) == 1
        assert time.members[0].user_id == admin.id
        assert time.members[0].role is TeamRole.LEAD

    async def test_membro_comum_nao_cria_time(self, session: AsyncSession) -> None:
        pessoa = await cria_usuario(session)
        ctx = await contexto_de(session, pessoa)

        with pytest.raises(AcessoNegado):
            await team_service.cria_time(session, ctx, TimeCriar(name="Design"))

    async def test_nome_repetido_ganha_slug_com_sufixo(self, session: AsyncSession) -> None:
        admin = await cria_usuario(session, nome="Admin", papel=OrgRole.ADMIN)
        ctx = await contexto_de(session, admin)

        primeiro = await team_service.cria_time(session, ctx, TimeCriar(name="Criacao"))
        # Acentuado normaliza para o mesmo slug -- a colisao e proposital.
        segundo = await team_service.cria_time(session, ctx, TimeCriar(name="Criação"))

        assert primeiro.slug == "criacao"
        assert segundo.slug == "criacao-2"


class TestVisibilidade:
    async def test_membro_ve_apenas_os_proprios_times(self, session: AsyncSession) -> None:
        admin = await cria_usuario(session, nome="Admin", papel=OrgRole.ADMIN)
        pessoa = await cria_usuario(session, nome="Pessoa")
        await cria_time_com_lead(session, nome="Design", lead=pessoa)
        await cria_time_com_lead(session, nome="Producao", lead=admin)

        visiveis = await team_service.lista_times(session, await contexto_de(session, pessoa))

        assert [time.name for time, _ in visiveis] == ["Design"]

    async def test_admin_ve_todos(self, session: AsyncSession) -> None:
        admin = await cria_usuario(session, nome="Admin", papel=OrgRole.ADMIN)
        outra = await cria_usuario(session, nome="Outra")
        await cria_time_com_lead(session, nome="Design", lead=outra)
        await cria_time_com_lead(session, nome="Producao", lead=outra)

        visiveis = await team_service.lista_times(session, await contexto_de(session, admin))

        assert [time.name for time, _ in visiveis] == ["Design", "Producao"]

    async def test_lista_traz_a_contagem_de_membros(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        outra = await cria_usuario(session, nome="Outra")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        ctx_lead = await contexto_de(session, lead)
        await team_service.adiciona_membro(
            session, ctx_lead, time.id, AdicionarMembro(user_id=outra.id)
        )

        visiveis = await team_service.lista_times(session, await contexto_de(session, lead))

        assert visiveis[0][1] == 2

    async def test_quem_nao_e_do_time_recebe_nao_encontrado(
        self, session: AsyncSession
    ) -> None:
        """Nao encontrado, e nao acesso negado.

        A distincao importa: AcessoNegado vira 403 na borda, o que confirmaria
        que o time existe. RecursoNaoEncontrado vira 404, igual ao que um time
        inexistente devolveria.
        """
        dono = await cria_usuario(session, nome="Dono")
        estranho = await cria_usuario(session, nome="Estranho")
        time = await cria_time_com_lead(session, nome="Design", lead=dono)

        with pytest.raises(RecursoNaoEncontrado):
            await team_service.obtem_time(
                session, await contexto_de(session, estranho), time.id
            )

    async def test_time_inexistente_e_time_alheio_sao_indistinguiveis(
        self, session: AsyncSession
    ) -> None:
        dono = await cria_usuario(session, nome="Dono")
        estranho = await cria_usuario(session, nome="Estranho")
        time = await cria_time_com_lead(session, nome="Design", lead=dono)
        ctx = await contexto_de(session, estranho)

        with pytest.raises(RecursoNaoEncontrado) as alheio:
            await team_service.obtem_time(session, ctx, time.id)

        with pytest.raises(RecursoNaoEncontrado) as inexistente:
            await team_service.obtem_time(session, ctx, uuid4())

        assert alheio.value.mensagem == inexistente.value.mensagem

    async def test_arquivado_some_da_lista_por_padrao(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        ctx = await contexto_de(session, lead)
        await team_service.arquiva_time(session, ctx, time.id, arquivar=True)

        assert await team_service.lista_times(session, ctx) == []
        assert len(await team_service.lista_times(session, ctx, incluir_arquivados=True)) == 1


class TestMembros:
    async def test_lead_adiciona_membro(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        nova = await cria_usuario(session, nome="Nova")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)

        vinculo = await team_service.adiciona_membro(
            session,
            await contexto_de(session, lead),
            time.id,
            AdicionarMembro(user_id=nova.id),
        )

        assert vinculo.role is TeamRole.MEMBER

    async def test_membro_comum_nao_gerencia_membros(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        comum = await cria_usuario(session, nome="Comum")
        alvo = await cria_usuario(session, nome="Alvo")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        await team_service.adiciona_membro(
            session,
            await contexto_de(session, lead),
            time.id,
            AdicionarMembro(user_id=comum.id),
        )

        with pytest.raises(AcessoNegado):
            await team_service.adiciona_membro(
                session,
                await contexto_de(session, comum),
                time.id,
                AdicionarMembro(user_id=alvo.id),
            )

    async def test_nao_adiciona_a_mesma_pessoa_duas_vezes(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)

        with pytest.raises(MembroJaNoTime):
            await team_service.adiciona_membro(
                session,
                await contexto_de(session, lead),
                time.id,
                AdicionarMembro(user_id=lead.id),
            )


class TestUltimoLead:
    async def test_nao_remove_o_unico_lead(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)

        with pytest.raises(UltimoLeadDoTime):
            await team_service.remove_membro(
                session, await contexto_de(session, lead), time.id, lead.id
            )

    async def test_nao_rebaixa_o_unico_lead(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)

        with pytest.raises(UltimoLeadDoTime):
            await team_service.altera_papel(
                session, await contexto_de(session, lead), time.id, lead.id, TeamRole.MEMBER
            )

    async def test_com_outro_lead_promovido_a_saida_e_permitida(
        self, session: AsyncSession
    ) -> None:
        lead = await cria_usuario(session, nome="Lead")
        sucessora = await cria_usuario(session, nome="Sucessora")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        ctx = await contexto_de(session, lead)

        await team_service.adiciona_membro(
            session, ctx, time.id, AdicionarMembro(user_id=sucessora.id, role=TeamRole.LEAD)
        )
        await team_service.remove_membro(session, ctx, time.id, lead.id)

        restante, total = await team_service.obtem_time(
            session, await contexto_de(session, sucessora), time.id
        )
        assert total == 1
        assert restante.members[0].user_id == sucessora.id


class TestArquivamento:
    async def test_time_arquivado_recusa_alteracao(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        ctx = await contexto_de(session, lead)
        await team_service.arquiva_time(session, ctx, time.id, arquivar=True)

        with pytest.raises(TimeArquivado):
            await team_service.atualiza_time(
                session, ctx, time.id, TimeAtualizar(name="Outro nome")
            )

    async def test_reativar_devolve_a_edicao(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        ctx = await contexto_de(session, lead)

        await team_service.arquiva_time(session, ctx, time.id, arquivar=True)
        await team_service.arquiva_time(session, ctx, time.id, arquivar=False)
        atualizado = await team_service.atualiza_time(
            session, ctx, time.id, TimeAtualizar(name="Design e Criacao")
        )

        assert atualizado.name == "Design e Criacao"
        assert atualizado.archived_at is None


class TestAtualizacao:
    async def test_omitir_descricao_preserva_e_null_limpa(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        ctx = await contexto_de(session, lead)

        await team_service.atualiza_time(
            session, ctx, time.id, TimeAtualizar(description="Time de design")
        )
        so_o_nome = await team_service.atualiza_time(
            session, ctx, time.id, TimeAtualizar(name="Design Grafico")
        )
        assert so_o_nome.description == "Time de design"

        limpo = await team_service.atualiza_time(
            session, ctx, time.id, TimeAtualizar(description=None)
        )
        assert limpo.description is None
