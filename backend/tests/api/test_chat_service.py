"""Testes de integracao do chat do time, contra Postgres real."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import OrgRole
from app.domain.errors import AcessoNegado, RecursoNaoEncontrado
from app.schemas.chat import MensagemCriar
from app.services import chat_service
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
    return time, lead, membro


class TestEnvio:
    async def test_membro_envia_e_a_mensagem_aparece(self, session: AsyncSession) -> None:
        time, _, membro = await cenario(session)
        ctx = await contexto_de(session, membro)

        await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="Bom dia, time")
        )

        mensagens, _ = await chat_service.lista_mensagens(session, ctx, Conversa.do_time(time.id))
        assert [m.body for m in mensagens] == ["Bom dia, time"]
        assert mensagens[0].author_id == membro.id

    async def test_espacos_nas_bordas_sao_removidos(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)

        mensagem = await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="  com espacos  ")
        )
        assert mensagem.body == "com espacos"


class TestAcesso:
    async def test_quem_nao_e_do_time_nao_le_a_conversa(self, session: AsyncSession) -> None:
        """Nao encontrado, e nao acesso negado: um 403 confirmaria que o time
        existe a quem esta de fora."""
        time, _, _ = await cenario(session)
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.lista_mensagens(
                session, await contexto_de(session, estranho), Conversa.do_time(time.id)
            )

    async def test_quem_nao_e_do_time_nao_escreve(self, session: AsyncSession) -> None:
        time, _, _ = await cenario(session)
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.envia_mensagem(
                session,
                await contexto_de(session, estranho),
                Conversa.do_time(time.id),
                MensagemCriar(body="oi"),
            )

    async def test_admin_alcanca_qualquer_conversa(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        admin = await cria_usuario(session, nome="Admin", papel=OrgRole.ADMIN)
        await chat_service.envia_mensagem(
            session,
            await contexto_de(session, lead),
            Conversa.do_time(time.id),
            MensagemCriar(body="oi"),
        )

        mensagens, _ = await chat_service.lista_mensagens(
            session, await contexto_de(session, admin), Conversa.do_time(time.id)
        )
        assert len(mensagens) == 1


class TestOrdemEPaginacao:
    async def test_vem_em_ordem_cronologica(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)
        for texto in ("primeira", "segunda", "terceira"):
            await chat_service.envia_mensagem(
                session, ctx, Conversa.do_time(time.id), MensagemCriar(body=texto)
            )

        mensagens, _ = await chat_service.lista_mensagens(session, ctx, Conversa.do_time(time.id))

        assert [m.body for m in mensagens] == ["primeira", "segunda", "terceira"]

    async def test_conversa_curta_nao_oferece_cursor(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)
        await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="oi")
        )

        _, cursor = await chat_service.lista_mensagens(session, ctx, Conversa.do_time(time.id))

        # Sem cursor o cliente sabe que chegou ao inicio e para de pedir mais.
        assert cursor is None

    async def test_conversa_longa_pagina_para_tras(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)
        total = chat_service.PAGINA + 10
        for i in range(total):
            await chat_service.envia_mensagem(
                session, ctx, Conversa.do_time(time.id), MensagemCriar(body=f"mensagem {i:03d}")
            )

        recentes, cursor = await chat_service.lista_mensagens(
            session, ctx, Conversa.do_time(time.id)
        )
        assert len(recentes) == chat_service.PAGINA
        # A pagina mais recente termina na ultima enviada.
        assert recentes[-1].body == f"mensagem {total - 1:03d}"
        assert cursor is not None

        anteriores, _ = await chat_service.lista_mensagens(
            session, ctx, Conversa.do_time(time.id), antes_de=cursor
        )
        assert anteriores
        # E nao repete o que ja veio.
        assert {m.id for m in anteriores}.isdisjoint({m.id for m in recentes})


class TestExclusao:
    async def test_autor_apaga_a_propria(self, session: AsyncSession) -> None:
        time, _, membro = await cenario(session)
        ctx = await contexto_de(session, membro)
        mensagem = await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="erro de digitacao")
        )

        apagada = await chat_service.exclui_mensagem(
            session, ctx, Conversa.do_time(time.id), mensagem.id
        )

        assert apagada.deleted_at is not None
        # O corpo some de verdade: manter o texto so mudaria quem consegue ler.
        assert apagada.body == ""

    async def test_apagada_continua_na_conversa(self, session: AsyncSession) -> None:
        """Some-la da lista reordenaria tudo abaixo dela."""
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)
        for texto in ("antes", "some", "depois"):
            await chat_service.envia_mensagem(
                session, ctx, Conversa.do_time(time.id), MensagemCriar(body=texto)
            )

        mensagens, _ = await chat_service.lista_mensagens(session, ctx, Conversa.do_time(time.id))
        alvo = next(m for m in mensagens if m.body == "some")
        await chat_service.exclui_mensagem(session, ctx, Conversa.do_time(time.id), alvo.id)

        depois, _ = await chat_service.lista_mensagens(session, ctx, Conversa.do_time(time.id))
        assert len(depois) == 3
        assert [m.deleted_at is not None for m in depois] == [False, True, False]

    async def test_membro_comum_nao_apaga_a_dos_outros(self, session: AsyncSession) -> None:
        time, lead, membro = await cenario(session)
        do_lead = await chat_service.envia_mensagem(
            session,
            await contexto_de(session, lead),
            Conversa.do_time(time.id),
            MensagemCriar(body="mensagem do lead"),
        )

        with pytest.raises(AcessoNegado):
            await chat_service.exclui_mensagem(
                session, await contexto_de(session, membro), Conversa.do_time(time.id), do_lead.id
            )

    async def test_lead_modera_a_conversa(self, session: AsyncSession) -> None:
        time, lead, membro = await cenario(session)
        do_membro = await chat_service.envia_mensagem(
            session,
            await contexto_de(session, membro),
            Conversa.do_time(time.id),
            MensagemCriar(body="mensagem do membro"),
        )

        apagada = await chat_service.exclui_mensagem(
            session, await contexto_de(session, lead), Conversa.do_time(time.id), do_membro.id
        )
        assert apagada.deleted_at is not None

    async def test_apagar_duas_vezes_nao_muda_a_data(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)
        mensagem = await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="oi")
        )

        primeira = await chat_service.exclui_mensagem(
            session, ctx, Conversa.do_time(time.id), mensagem.id
        )
        quando = primeira.deleted_at
        segunda = await chat_service.exclui_mensagem(
            session, ctx, Conversa.do_time(time.id), mensagem.id
        )

        assert segunda.deleted_at == quando

    async def test_mensagem_de_outro_time_nao_e_alcancavel(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)
        # cria_time_com_lead ja vincula o lead; adiciona-lo de novo violaria a
        # chave composta de team_members.
        outro = await cria_time_com_lead(session, nome="Producao", lead=lead)
        ctx = await contexto_de(session, lead)
        mensagem = await chat_service.envia_mensagem(
            session, ctx, Conversa.do_time(time.id), MensagemCriar(body="oi")
        )

        # Mesmo com acesso aos dois times, o id do time na rota precisa bater.
        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.exclui_mensagem(
                session, ctx, Conversa.do_time(outro.id), mensagem.id
            )
