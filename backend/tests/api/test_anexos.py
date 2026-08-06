"""Anexos ponta a ponta: banco, disco e isolamento entre times."""

from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Attachment
from app.domain.anexos import AnexoInvalido, ArquivoRecebido
from app.domain.errors import RecursoNaoEncontrado
from app.schemas.chat import MensagemCriar
from app.services import chat_service
from app.services.chat_service import Conversa
from app.storage.arquivos import ArmazenamentoLocal, ArquivoNaoEncontrado
from tests.conftest import (
    SEM_BANCO,
    adiciona_ao_time,
    contexto_de,
    cria_time_com_lead,
    cria_usuario,
)

pytestmark = [pytest.mark.integracao, SEM_BANCO]

PNG = b"\x89PNG\r\n\x1a\n" + b"conteudo da imagem"


def png(nome: str = "print.png") -> ArquivoRecebido:
    return ArquivoRecebido(filename=nome, content_type="image/png", conteudo=PNG)


@pytest.fixture
def armazenamento(tmp_path: Path) -> ArmazenamentoLocal:
    return ArmazenamentoLocal(tmp_path / "uploads")


async def cenario(session: AsyncSession):  # type: ignore[no-untyped-def]
    lead = await cria_usuario(session, nome="Lead")
    membro = await cria_usuario(session, nome="Membro")
    time = await cria_time_com_lead(session, nome="Design", lead=lead)
    await adiciona_ao_time(session, time=time, usuario=membro)
    return time, lead, membro


class TestEnvioComAnexo:
    async def test_grava_metadado_e_conteudo(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)

        mensagem = await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.do_time(time.id),
            MensagemCriar(body="segue o print"),
            arquivos=[png()],
            armazenamento=armazenamento,
        )

        assert len(mensagem.anexos) == 1
        anexo = mensagem.anexos[0]
        assert anexo.filename == "print.png"
        assert anexo.size_bytes == len(PNG)
        # O conteudo foi mesmo para o disco, na chave registrada.
        assert await armazenamento.le(anexo.storage_key) == PNG

    async def test_o_nome_em_disco_nao_e_o_do_cliente(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        """Travessia de caminho morre aqui: a chave e gerada pelo servidor."""
        time, lead, _ = await cenario(session)

        mensagem = await chat_service.envia_mensagem(
            session,
            await contexto_de(session, lead),
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png("../../../etc/passwd.png")],
            armazenamento=armazenamento,
        )

        chave = mensagem.anexos[0].storage_key
        assert ".." not in chave
        # E o nome exibido perde o caminho, ficando so o arquivo.
        assert mensagem.anexos[0].filename == "passwd.png"

    async def test_mensagem_so_com_anexo_e_valida(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        time, lead, _ = await cenario(session)

        mensagem = await chat_service.envia_mensagem(
            session,
            await contexto_de(session, lead),
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )
        assert mensagem.body == ""
        assert len(mensagem.anexos) == 1

    async def test_mensagem_sem_texto_e_sem_anexo_e_recusada(self, session: AsyncSession) -> None:
        time, lead, _ = await cenario(session)

        with pytest.raises(chat_service.MensagemVazia):
            await chat_service.envia_mensagem(
                session,
                await contexto_de(session, lead),
                Conversa.do_time(time.id),
                MensagemCriar(body="   "),
            )

    async def test_arquivo_invalido_nao_deixa_mensagem_no_banco(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        """A validacao roda antes de criar a mensagem: recusar depois deixaria
        uma mensagem vazia na conversa sem o anexo que a justificava."""
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)

        with pytest.raises(AnexoInvalido):
            await chat_service.envia_mensagem(
                session,
                ctx,
                Conversa.do_time(time.id),
                MensagemCriar(body="tentativa"),
                arquivos=[
                    ArquivoRecebido(
                        filename="x.svg", content_type="image/svg+xml", conteudo=b"<svg/>"
                    )
                ],
                armazenamento=armazenamento,
            )

        mensagens, _ = await chat_service.lista_mensagens(session, ctx, Conversa.do_time(time.id))
        assert mensagens == []


class TestDownload:
    async def test_membro_baixa_o_anexo(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        time, lead, membro = await cenario(session)
        mensagem = await chat_service.envia_mensagem(
            session,
            await contexto_de(session, lead),
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )

        anexo = await chat_service.obtem_anexo(
            session,
            await contexto_de(session, membro),
            Conversa.do_time(time.id),
            mensagem.anexos[0].id,
        )
        assert await armazenamento.le(anexo.storage_key) == PNG

    async def test_quem_nao_e_do_time_nao_baixa(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        time, lead, _ = await cenario(session)
        mensagem = await chat_service.envia_mensagem(
            session,
            await contexto_de(session, lead),
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )
        estranho = await cria_usuario(session, nome="Estranho")

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.obtem_anexo(
                session,
                await contexto_de(session, estranho),
                Conversa.do_time(time.id),
                mensagem.anexos[0].id,
            )

    async def test_anexo_de_outro_time_nao_e_alcancavel_pelo_id(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        """Quem participa de dois times nao pode usar o id de um para pegar
        anexo do outro: a consulta amarra anexo, mensagem e time."""
        time, lead, _ = await cenario(session)
        outro = await cria_time_com_lead(session, nome="Producao", lead=lead)
        ctx = await contexto_de(session, lead)
        mensagem = await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )

        with pytest.raises(RecursoNaoEncontrado):
            await chat_service.obtem_anexo(
                session, ctx, Conversa.do_time(outro.id), mensagem.anexos[0].id
            )


class TestArmazenamento:
    async def test_chaves_nao_colidem_entre_arquivos_de_mesmo_nome(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)

        primeira = await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )
        segunda = await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )

        assert primeira.anexos[0].storage_key != segunda.anexos[0].storage_key

    async def test_chave_que_escapa_da_raiz_e_recusada(
        self, armazenamento: ArmazenamentoLocal
    ) -> None:
        """Defesa em profundidade: as chaves sao geradas pelo servidor, mas se
        uma vier adulterada o caminho resolvido nao pode sair da raiz."""
        with pytest.raises(ArquivoNaoEncontrado):
            await armazenamento.le("../../../etc/passwd")

    async def test_excluir_mensagem_mantem_o_anexo_no_banco(
        self, session: AsyncSession, armazenamento: ArmazenamentoLocal
    ) -> None:
        """Exclusao de mensagem e logica: o registro do anexo sobrevive, e e o
        acesso pela conversa que deixa de existir."""
        time, lead, _ = await cenario(session)
        ctx = await contexto_de(session, lead)
        mensagem = await chat_service.envia_mensagem(
            session,
            ctx,
            Conversa.do_time(time.id),
            MensagemCriar(body=""),
            arquivos=[png()],
            armazenamento=armazenamento,
        )

        await chat_service.exclui_mensagem(session, ctx, Conversa.do_time(time.id), mensagem.id)

        ainda = (
            (await session.execute(select(Attachment).where(Attachment.message_id == mensagem.id)))
            .scalars()
            .all()
        )
        assert len(ainda) == 1
