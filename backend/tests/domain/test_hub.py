from uuid import UUID, uuid4

from app.realtime.events import Evento, TipoDeEvento
from app.realtime.hub import HubEmMemoria

TIME = uuid4()
OUTRO_TIME = uuid4()


def evento(team_id: UUID = TIME) -> Evento:
    return Evento(tipo=TipoDeEvento.TAREFAS_MUDARAM, team_id=team_id)


class TestRoteamento:
    async def test_evento_chega_a_quem_assina_o_time(self) -> None:
        hub = HubEmMemoria()
        fila = hub.inscreve(TIME)

        hub.publica(evento())

        assert fila.get_nowait().team_id == TIME

    async def test_evento_nao_vaza_para_outro_time(self) -> None:
        hub = HubEmMemoria()
        fila = hub.inscreve(OUTRO_TIME)

        hub.publica(evento(TIME))

        assert fila.empty()

    async def test_todas_as_conexoes_do_time_recebem(self) -> None:
        hub = HubEmMemoria()
        a, b = hub.inscreve(TIME), hub.inscreve(TIME)

        hub.publica(evento())

        assert not a.empty() and not b.empty()

    async def test_cancelar_para_de_receber(self) -> None:
        hub = HubEmMemoria()
        fila = hub.inscreve(TIME)
        hub.cancela(TIME, fila)

        hub.publica(evento())

        assert fila.empty()
        assert hub.total_de_conexoes == 0


class TestFilaCheia:
    async def test_conexao_zumbi_nao_acumula_para_sempre(self) -> None:
        hub = HubEmMemoria()
        fila = hub.inscreve(TIME)

        for _ in range(HubEmMemoria._LIMITE_POR_FILA + 10):
            hub.publica(evento())

        assert fila.qsize() == HubEmMemoria._LIMITE_POR_FILA

    async def test_publicar_em_fila_cheia_nunca_levanta(self) -> None:
        """Quem publica e o service dentro de um request: nao pode falhar por
        causa de um navegador que parou de consumir."""
        hub = HubEmMemoria()
        hub.inscreve(TIME)

        for _ in range(200):
            hub.publica(evento())


class TestSemAssinantes:
    async def test_publicar_sem_ninguem_e_no_op(self) -> None:
        HubEmMemoria().publica(evento())
