"""Onde os anexos ficam guardados.

Atras de um Protocol pelo mesmo motivo do IdentityProvider: hoje e o disco do
VPS, que para ~15 pessoas trocando prints e mais que suficiente e nao custa
nada. Se um dia precisar de S3 ou R2, entra uma implementacao nova sem tocar
no servico que chama.
"""

import asyncio
from pathlib import Path
from typing import Protocol
from uuid import uuid4


class ArquivoNaoEncontrado(Exception):
    pass


class ArmazenamentoDeArquivos(Protocol):
    def nova_chave(self, extensao: str) -> str: ...

    async def guarda(self, chave: str, conteudo: bytes) -> None: ...

    async def le(self, chave: str) -> bytes: ...

    async def remove(self, chave: str) -> None: ...


class ArmazenamentoLocal:
    """Grava sob um diretorio unico, em subpastas de dois caracteres.

    O nome no disco e sempre gerado aqui -- nunca o nome que veio do cliente.
    Isso elimina de uma vez travessia de caminho ("../../etc/passwd"), colisao
    entre arquivos de mesmo nome e nomes que o sistema de arquivos recusa.
    """

    def __init__(self, raiz: Path) -> None:
        self._raiz = raiz
        self._raiz.mkdir(parents=True, exist_ok=True)

    def nova_chave(self, extensao: str) -> str:
        identificador = uuid4().hex
        limpa = "".join(c for c in extensao.lower() if c.isalnum())[:8]
        # Espalha em 256 subpastas: um diretorio unico com dezenas de milhares
        # de arquivos fica lento de listar em muitos sistemas de arquivos.
        nome = f"{identificador}.{limpa}" if limpa else identificador
        return f"{identificador[:2]}/{nome}"

    async def guarda(self, chave: str, conteudo: bytes) -> None:
        destino = self._caminho(chave)
        destino.parent.mkdir(parents=True, exist_ok=True)
        # Em thread: escrever arquivo bloqueia, e travar o loop de eventos
        # pararia todas as outras requisicoes enquanto o disco responde.
        await asyncio.to_thread(destino.write_bytes, conteudo)

    async def le(self, chave: str) -> bytes:
        caminho = self._caminho(chave)
        if not caminho.is_file():
            raise ArquivoNaoEncontrado(chave)
        return await asyncio.to_thread(caminho.read_bytes)

    async def remove(self, chave: str) -> None:
        caminho = self._caminho(chave)
        await asyncio.to_thread(caminho.unlink, True)

    def _caminho(self, chave: str) -> Path:
        """Resolve a chave garantindo que ela nao escape da raiz.

        Defesa em profundidade: as chaves sao geradas por `nova_chave` e nunca
        vem do cliente, mas se um dia vierem -- de um import, de um banco
        adulterado -- o caminho resolvido tem que continuar dentro da raiz.
        """
        alvo = (self._raiz / chave).resolve()
        raiz = self._raiz.resolve()
        if not alvo.is_relative_to(raiz):
            raise ArquivoNaoEncontrado(chave)
        return alvo
