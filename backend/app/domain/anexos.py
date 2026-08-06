"""Regras de anexo. Puro: decide o que entra, sem tocar em disco nem em HTTP.

Upload e a superficie mais explorada de um app. Concentrar a decisao aqui, sem
I/O, permite cobrir cada regra com teste rapido -- e deixa explicito que a
validacao acontece antes de qualquer byte ser gravado.
"""

from dataclasses import dataclass

from app.domain.errors import RegraDeDominioViolada

TAMANHO_MAXIMO = 10 * 1024 * 1024
MAXIMO_POR_MENSAGEM = 5

# Tipos exibidos direto na conversa.
IMAGENS = frozenset({"image/png", "image/jpeg", "image/gif", "image/webp"})

# Demais tipos aceitos, sempre baixados em vez de abertos na pagina.
DOCUMENTOS = frozenset(
    {
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
)

PERMITIDOS = IMAGENS | DOCUMENTOS

# Assinaturas dos formatos de imagem aceitos. Um arquivo declarado como PNG
# que nao comeca com bytes de PNG e, na melhor hipotese, um engano.
_ASSINATURAS: dict[str, tuple[bytes, ...]] = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    # WebP e RIFF....WEBP; o tamanho fica nos 4 bytes do meio.
    "image/webp": (b"RIFF",),
}


class AnexoInvalido(RegraDeDominioViolada):
    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem, campo="arquivos")


@dataclass(frozen=True)
class ArquivoRecebido:
    """Um arquivo que chegou na requisicao, ainda nao gravado."""

    filename: str
    content_type: str
    conteudo: bytes

    @property
    def tamanho(self) -> int:
        return len(self.conteudo)


def e_imagem(content_type: str) -> bool:
    return content_type in IMAGENS


def valida(arquivos: list[ArquivoRecebido]) -> None:
    """Recusa o lote inteiro se qualquer arquivo falhar.

    Aceitar parcialmente deixaria a pessoa sem saber o que subiu e o que nao --
    pior que recusar tudo e deixar ela escolher de novo.
    """
    if len(arquivos) > MAXIMO_POR_MENSAGEM:
        raise AnexoInvalido(
            f"Máximo de {MAXIMO_POR_MENSAGEM} arquivos por mensagem."
        )

    for arquivo in arquivos:
        _valida_um(arquivo)


def _valida_um(arquivo: ArquivoRecebido) -> None:
    if arquivo.tamanho == 0:
        raise AnexoInvalido(f'"{arquivo.filename}" está vazio.')

    if arquivo.tamanho > TAMANHO_MAXIMO:
        limite = TAMANHO_MAXIMO // (1024 * 1024)
        raise AnexoInvalido(f'"{arquivo.filename}" passa de {limite} MB.')

    tipo = arquivo.content_type.split(";")[0].strip().lower()
    if tipo not in PERMITIDOS:
        # SVG cai aqui de proposito: e XML, aceita <script> dentro, e servido
        # na mesma origem executaria com a sessao de quem abriu.
        raise AnexoInvalido(f'Tipo de arquivo não aceito: "{tipo}".')

    if tipo in _ASSINATURAS and not _assinatura_confere(tipo, arquivo.conteudo):
        raise AnexoInvalido(
            f'"{arquivo.filename}" não parece ser uma imagem {tipo.split("/")[1]}.'
        )


def _assinatura_confere(tipo: str, conteudo: bytes) -> bool:
    """Confere os bytes iniciais contra o tipo declarado.

    O `Content-Type` do multipart vem do navegador e o cliente escolhe o que
    quiser -- sem esta checagem, um HTML renomeado para .png passaria e seria
    servido como imagem.
    """
    inicios = _ASSINATURAS[tipo]
    if not any(conteudo.startswith(inicio) for inicio in inicios):
        return False

    # RIFF sozinho tambem e WAV e AVI; o marcador WEBP fica no offset 8.
    if tipo == "image/webp":
        return len(conteudo) >= 12 and conteudo[8:12] == b"WEBP"

    return True
