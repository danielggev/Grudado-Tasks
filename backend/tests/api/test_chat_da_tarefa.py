"""Conversa da tarefa.

O foco aqui e o isolamento: as duas conversas moram na mesma tabela, entao o
risco novo e uma vazar na outra.
"""

from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import RecursoNaoEncontrado
from app.schemas.chat import MensagemCriar
from app.schemas.task import TarefaCriar
from app.services import chat_service, task_service
from app.services.chat_service import Conversa
from tests.conftest import (
    SEM_BANCO,
    adiciona_ao_time,
    contexto_de,
    cria_time_com_lead,
    cria_usuario,
)

pytestmark = [pytest.mark.integracao, SEM_BANCO]


async def cenario(session: AsyncSession):  # type: ignore[no-untyped-def]
    lead = await cria_usuario(session, nome="Lead")
    membro = await cria_usuario(session, nome="Membro")
    time = await cria_time_com_lead(session, nome="Design", lead=lead)
    await adiciona_ao_time(session, time=time, usuario=membro)
    ctx = await contexto_de(session, lead)
    tarefa = await task_service.cria_tarefa(
        session, ctx, TarefaCriar(title="Arte do banner", team_id=time.id)
    )
    return time, tarefa, lead, membro, ctx


class TestConversaDaTarefa:
    async def test_membro_conversa_na_tarefa(self, session: AsyncSession) -> None:
        time, tarefa, _, membro, _ = await cenario(session)
        ctx = await contexto_de(session, membro)
        conversa = Conversa.da_tarefa(time.id, tarefa.id)

        await chat_service.envia_mensagem(
            session, ctx, conversa, MensagemCriar(body="Qual formato do banner?")
        )

        mensagens, _ = await chat_service.lista_mensagens(session, ctx, conversa)
        assert [m.body for m in mensagens] == ["Qual formato do banner?"]
        assert mensagens[0].task_id == tarefa.id

    async def test_quem_nao_e_do_time_nao_le(self, session: AsyncSession) -> None:
        time, tarefa, _, _, _ = await cenario(session)
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.lista_mensagens(
                session,
                await contexto_de(session, estranho),
                Conversa.da_tarefa(time.id, tarefa.id),
            )


class TestIsolamento:
    async def test_conversa_do_time_nao_mistura_com_a_da_tarefa(
        self, session: AsyncSession
    ) -> None:
        """O risco central de guardar as duas na mesma tabela."""
        time, tarefa, _, _, ctx = await cenario(session)
        do_time = Conversa.do_time(time.id)
        da_tarefa = Conversa.da_tarefa(time.id, tarefa.id)

        await chat_service.envia_mensagem(session, ctx, do_time, MensagemCriar(body="no time"))
        await chat_service.envia_mensagem(
            session, ctx, da_tarefa, MensagemCriar(body="na tarefa")
        )

        no_time, _ = await chat_service.lista_mensagens(session, ctx, do_time)
        na_tarefa, _ = await chat_service.lista_mensagens(session, ctx, da_tarefa)

        assert [m.body for m in no_time] == ["no time"]
        assert [m.body for m in na_tarefa] == ["na tarefa"]

    async def test_tarefas_diferentes_tem_conversas_diferentes(
        self, session: AsyncSession
    ) -> None:
        time, primeira, _, _, ctx = await cenario(session)
        segunda = await task_service.cria_tarefa(
            session, ctx, TarefaCriar(title="Outra arte", team_id=time.id)
        )

        await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.da_tarefa(time.id, primeira.id),
            MensagemCriar(body="na primeira"),
        )

        na_segunda, _ = await chat_service.lista_mensagens(
            session, ctx, Conversa.da_tarefa(time.id, segunda.id)
        )
        assert na_segunda == []

    async def test_id_da_conversa_do_time_nao_apaga_pela_rota_da_tarefa(
        self, session: AsyncSession
    ) -> None:
        """Sem checar `task_id` na exclusao, o id de uma mensagem do time
        serviria para apaga-la por dentro do escopo de uma tarefa."""
        time, tarefa, _, _, ctx = await cenario(session)
        do_time = await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="no time")
        )

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.exclui_mensagem(
                session, ctx, Conversa.da_tarefa(time.id, tarefa.id), do_time.id
            )

    async def test_anexo_da_tarefa_nao_e_alcancavel_pela_rota_do_time(
        self, session: AsyncSession, tmp_path: Path
    ) -> None:
        from app.domain.anexos import ArquivoRecebido
        from app.storage.arquivos import ArmazenamentoLocal

        armazenamento = ArmazenamentoLocal(tmp_path / "uploads")
        time, tarefa, _, _, ctx = await cenario(session)

        mensagem = await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.da_tarefa(time.id, tarefa.id),
            MensagemCriar(body=""),
            arquivos=[
                ArquivoRecebido(
                    filename="print.png",
                    content_type="image/png",
                    conteudo=b"\x89PNG\r\n\x1a\nconteudo",
                )
            ],
            armazenamento=armazenamento,
        )

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.obtem_anexo(
                session, ctx, Conversa.do_time(time.id), mensagem.anexos[0].id
            )


class TestExclusaoEmCascata:
    async def test_apagar_a_tarefa_leva_a_conversa_junto(
        self, session: AsyncSession
    ) -> None:
        """Conversa de tarefa que nao existe mais nao teria onde ser lida."""
        from sqlalchemy import func, select

        from app.db.models import Message

        time, tarefa, _, _, ctx = await cenario(session)
        await chat_service.envia_mensagem(
            session, ctx, Conversa.da_tarefa(time.id, tarefa.id), MensagemCriar(body="oi")
        )

        await task_service.exclui_tarefa(session, ctx, tarefa.id)

        restantes = (
            await session.execute(
                select(func.count(Message.id)).where(Message.task_id == tarefa.id)
            )
        ).scalar_one()
        assert restantes == 0
