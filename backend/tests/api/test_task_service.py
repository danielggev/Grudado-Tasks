"""Testes de integracao do task_service, contra Postgres real.

As regras puras (prazo no engajamento, hierarquia, ordenacao) ja estao cobertas
em tests/domain/ sem banco. Aqui se verifica a costura: as regras agindo sobre
dados reais, permissoes ponta a ponta e o log de atividade.
"""

from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActivityLog
from app.domain.enums import ActivityAction, TaskPriority, TaskStatus, TeamRole
from app.domain.errors import (
    AcessoNegado,
    PrazoObrigatorioNoEngajamento,
    RecursoNaoEncontrado,
)
from app.domain.task_rules import (
    ResponsavelForaDoTime,
    SubtarefaDeOutroTime,
    SubtarefaNaoAceitaSubtarefa,
)
from app.schemas.task import MoverTarefa, TarefaAtualizar, TarefaCriar
from app.services import task_service
from tests.conftest import (
    SEM_BANCO,
    adiciona_ao_time,
    contexto_de,
    cria_time_com_lead,
    cria_usuario,
)

pytestmark = [pytest.mark.integracao, SEM_BANCO]

PRAZO = date(2026, 9, 15)


async def cenario(session: AsyncSession):  # type: ignore[no-untyped-def]
    """Um time com lead e um membro comum, que e o arranjo de quase todo teste."""
    lead = await cria_usuario(session, nome="Lead")
    membro = await cria_usuario(session, nome="Membro")
    time = await cria_time_com_lead(session, nome="Design", lead=lead)
    await adiciona_ao_time(session, time=time, usuario=membro)
    return time, lead, membro, await contexto_de(session, lead)


class TestCriacao:
    async def test_sem_responsavel_a_tarefa_e_do_time(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)

        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte do banner", team_id=time.id)
        )

        assert tarefa.assignees == []
        assert tarefa.status is TaskStatus.A_FAZER
        assert tarefa.due_date is None

    async def test_com_responsaveis_designados(self, session: AsyncSession) -> None:
        time, lead, membro, ctx = await cenario(session)

        tarefa = await task_service.cria_tarefa(
            session,
            ctx,
            TarefaCriar(
                title="Arte do banner",
                team_id=time.id,
                responsaveis=[lead.id, membro.id],
                priority=TaskPriority.URGENTE,
            ),
        )

        assert {v.user_id for v in tarefa.assignees} == {lead.id, membro.id}
        assert tarefa.priority is TaskPriority.URGENTE

    async def test_nao_atribui_a_quem_esta_fora_do_time(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(ResponsavelForaDoTime):
            await task_service.cria_tarefa(
                session,
                ctx,
                TarefaCriar(title="Arte", team_id=time.id, responsaveis=[estranho.id]),
            )

    async def test_quem_nao_e_do_time_nao_cria(self, session: AsyncSession) -> None:
        time, _, _, _ = await cenario(session)
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(AcessoNegado):
            await task_service.cria_tarefa(
                session,
                await contexto_de(session, estranho),
                TarefaCriar(title="Arte", team_id=time.id),
            )

    async def test_criacao_fica_registrada_no_log(self, session: AsyncSession) -> None:
        time, lead, _, ctx = await cenario(session)

        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte do banner", team_id=time.id)
        )
        await session.flush()

        eventos = (
            (await session.execute(select(ActivityLog).where(ActivityLog.task_id == tarefa.id)))
            .scalars()
            .all()
        )
        assert [e.action for e in eventos] == [ActivityAction.TAREFA_CRIADA]
        assert eventos[0].actor_id == lead.id


class TestRegraDoPrazo:
    async def test_nao_sai_de_a_fazer_sem_prazo(self, session: AsyncSession) -> None:
        """A regra central do produto, agora sobre dados reais."""
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )

        with pytest.raises(PrazoObrigatorioNoEngajamento):
            await task_service.move_tarefa(
                session, ctx, tarefa.id, MoverTarefa(status=TaskStatus.EM_ANDAMENTO)
            )

    async def test_informar_o_prazo_no_movimento_libera(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )

        movida = await task_service.move_tarefa(
            session,
            ctx,
            tarefa.id,
            MoverTarefa(status=TaskStatus.EM_ANDAMENTO, due_date=PRAZO),
        )

        assert movida.status is TaskStatus.EM_ANDAMENTO
        assert movida.due_date == PRAZO

    async def test_tarefa_que_nasceu_com_prazo_move_direto(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id, due_date=PRAZO)
        )

        movida = await task_service.move_tarefa(
            session, ctx, tarefa.id, MoverTarefa(status=TaskStatus.EM_ANDAMENTO)
        )
        assert movida.due_date == PRAZO

    async def test_definir_o_prazo_gera_evento_proprio(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )
        await task_service.move_tarefa(
            session,
            ctx,
            tarefa.id,
            MoverTarefa(status=TaskStatus.EM_ANDAMENTO, due_date=PRAZO),
        )
        await session.flush()

        acoes = set(
            (
                await session.execute(
                    select(ActivityLog.action).where(ActivityLog.task_id == tarefa.id)
                )
            )
            .scalars()
            .all()
        )
        assert ActivityAction.PRAZO_DEFINIDO in acoes
        assert ActivityAction.STATUS_ALTERADO in acoes


class TestConclusao:
    async def test_concluir_carimba_a_data(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id, due_date=PRAZO)
        )

        concluida = await task_service.move_tarefa(
            session, ctx, tarefa.id, MoverTarefa(status=TaskStatus.CONCLUIDO)
        )
        assert concluida.completed_at is not None

        reaberta = await task_service.move_tarefa(
            session, ctx, tarefa.id, MoverTarefa(status=TaskStatus.EM_ANDAMENTO)
        )
        assert reaberta.completed_at is None


class TestSubtarefas:
    async def test_cria_subtarefa_sob_a_mae(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        mae = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Campanha", team_id=time.id)
        )

        filha = await task_service.cria_tarefa(
            session,
            ctx,
            TarefaCriar(title="Arte do post", team_id=time.id, parent_id=mae.id),
        )
        assert filha.parent_id == mae.id

        recarregada = await task_service.obtem_tarefa(session, ctx, mae.id)
        assert len(recarregada.subtasks) == 1

    async def test_subtarefa_nao_aceita_subtarefa(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        mae = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Campanha", team_id=time.id)
        )
        filha = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id, parent_id=mae.id)
        )

        with pytest.raises(SubtarefaNaoAceitaSubtarefa):
            await task_service.cria_tarefa(
                session,
                ctx,
                TarefaCriar(title="Detalhe", team_id=time.id, parent_id=filha.id),
            )

    async def test_subtarefa_precisa_ser_do_time_da_mae(self, session: AsyncSession) -> None:
        time, lead, _, _ = await cenario(session)
        outro = await cria_time_com_lead(session, nome="Producao", lead=lead)
        ctx = await contexto_de(session, lead)
        mae = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Campanha", team_id=time.id)
        )

        with pytest.raises(SubtarefaDeOutroTime):
            await task_service.cria_tarefa(
                session,
                ctx,
                TarefaCriar(title="Arte", team_id=outro.id, parent_id=mae.id),
            )

    async def test_subtarefa_nao_polui_o_board(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        mae = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Campanha", team_id=time.id)
        )
        await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id, parent_id=mae.id)
        )

        board = await task_service.lista_do_board(session, ctx, time.id)
        assert [t.id for t in board] == [mae.id]


class TestOrdenacao:
    async def test_mover_para_o_topo_e_para_o_meio(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        criadas = [
            await task_service.cria_tarefa(
                session, ctx, TarefaCriar(title=f"Tarefa {i}", team_id=time.id)
            )
            for i in range(3)
        ]

        # Nova tarefa entra sempre no topo, entao a ordem e o inverso da criacao.
        board = await task_service.lista_do_board(session, ctx, time.id)
        assert [t.id for t in board] == [c.id for c in reversed(criadas)]

        # Move a primeira criada para logo apos a ultima do board.
        await task_service.move_tarefa(
            session,
            ctx,
            criadas[0].id,
            MoverTarefa(status=TaskStatus.A_FAZER, apos=board[0].id),
        )

        depois = await task_service.lista_do_board(session, ctx, time.id)
        assert [t.id for t in depois][:2] == [board[0].id, criadas[0].id]


class TestPermissoes:
    async def test_membro_comum_edita_tarefa_do_time(self, session: AsyncSession) -> None:
        """Coerente com progresso unico compartilhado: o time inteiro toca."""
        time, _, membro, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )

        editada = await task_service.atualiza_tarefa(
            session,
            await contexto_de(session, membro),
            tarefa.id,
            TarefaAtualizar(title="Arte revisada"),
        )
        assert editada.title == "Arte revisada"

    async def test_membro_comum_nao_exclui(self, session: AsyncSession) -> None:
        time, _, membro, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )

        with pytest.raises(AcessoNegado):
            await task_service.exclui_tarefa(
                session, await contexto_de(session, membro), tarefa.id
            )

    async def test_lead_exclui_e_o_log_sobrevive(self, session: AsyncSession) -> None:
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )

        await task_service.exclui_tarefa(session, ctx, tarefa.id)

        eventos = (
            (
                await session.execute(
                    select(ActivityLog).where(ActivityLog.team_id == time.id)
                )
            )
            .scalars()
            .all()
        )
        assert ActivityAction.TAREFA_EXCLUIDA in {e.action for e in eventos}

    async def test_quem_nao_e_do_time_nao_alcanca_a_tarefa(
        self, session: AsyncSession
    ) -> None:
        time, _, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(RecursoNaoEncontrado):
            await task_service.obtem_tarefa(
                session, await contexto_de(session, estranho), tarefa.id
            )


class TestMinhasTarefas:
    async def test_traz_as_designadas_e_as_do_time_sem_dono(
        self, session: AsyncSession
    ) -> None:
        time, lead, membro, ctx = await cenario(session)
        do_time = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Sem dono", team_id=time.id)
        )
        minha = await task_service.cria_tarefa(
            session,
            ctx,
            TarefaCriar(title="Minha", team_id=time.id, responsaveis=[membro.id]),
        )
        await task_service.cria_tarefa(
            session,
            ctx,
            TarefaCriar(title="Do lead", team_id=time.id, responsaveis=[lead.id]),
        )

        tarefas = await task_service.minhas_tarefas(
            session, await contexto_de(session, membro)
        )

        assert {t.id for t in tarefas} == {do_time.id, minha.id}

    async def test_concluidas_saem_da_lista(self, session: AsyncSession) -> None:
        time, lead, _, ctx = await cenario(session)
        tarefa = await task_service.cria_tarefa(
            session,
            ctx,
            TarefaCriar(
                title="Minha", team_id=time.id, responsaveis=[lead.id], due_date=PRAZO
            ),
        )
        await task_service.move_tarefa(
            session, ctx, tarefa.id, MoverTarefa(status=TaskStatus.CONCLUIDO)
        )

        assert await task_service.minhas_tarefas(session, ctx) == []


class TestTimeArquivadoNaoBloqueiaLeitura:
    async def test_papel_de_lead_permite_excluir(self, session: AsyncSession) -> None:
        lead = await cria_usuario(session, nome="Lead")
        time = await cria_time_com_lead(session, nome="Design", lead=lead)
        outro = await cria_usuario(session, nome="Outro")
        await adiciona_ao_time(session, time=time, usuario=outro, papel=TeamRole.LEAD)

        ctx = await contexto_de(session, outro)
        tarefa = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Arte", team_id=time.id)
        )
        await task_service.exclui_tarefa(session, ctx, tarefa.id)
