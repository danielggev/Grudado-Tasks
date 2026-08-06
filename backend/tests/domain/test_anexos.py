"""Regras de aceitacao de anexo.

Upload e a superficie mais explorada de um app; estas regras sao a barreira, e
por serem puras da para cobrir cada uma sem tocar em disco.
"""

import pytest

from app.domain.anexos import (
    MAXIMO_POR_MENSAGEM,
    TAMANHO_MAXIMO,
    AnexoInvalido,
    ArquivoRecebido,
    e_imagem,
    valida,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"resto"
JPEG = b"\xff\xd8\xff\xe0" + b"resto"
GIF = b"GIF89a" + b"resto"
WEBP = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"resto"


def arquivo(**alteracoes: object) -> ArquivoRecebido:
    padrao: dict[str, object] = {
        "filename": "print.png",
        "content_type": "image/png",
        "conteudo": PNG,
    }
    padrao.update(alteracoes)
    return ArquivoRecebido(**padrao)  # type: ignore[arg-type]


class TestTiposAceitos:
    @pytest.mark.parametrize(
        ("tipo", "conteudo"),
        [
            ("image/png", PNG),
            ("image/jpeg", JPEG),
            ("image/gif", GIF),
            ("image/webp", WEBP),
        ],
    )
    def test_imagens(self, tipo: str, conteudo: bytes) -> None:
        valida([arquivo(content_type=tipo, conteudo=conteudo)])
        assert e_imagem(tipo)

    @pytest.mark.parametrize(
        "tipo",
        [
            "application/pdf",
            "text/plain",
            "text/csv",
            "application/zip",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
    )
    def test_documentos_passam_mas_nao_sao_imagem(self, tipo: str) -> None:
        valida([arquivo(filename="doc", content_type=tipo, conteudo=b"conteudo")])
        # Documento nunca e exibido na conversa: e baixado, nao aberto.
        assert not e_imagem(tipo)

    def test_content_type_com_charset_e_aceito(self) -> None:
        """O navegador manda "text/plain; charset=utf-8"."""
        valida([arquivo(content_type="text/plain; charset=utf-8", conteudo=b"oi")])


class TestTiposRecusados:
    def test_svg_e_bloqueado(self) -> None:
        """SVG e XML e aceita <script>; servido na mesma origem, executaria
        com a sessao de quem abriu."""
        with pytest.raises(AnexoInvalido):
            valida([arquivo(filename="a.svg", content_type="image/svg+xml", conteudo=b"<svg/>")])

    @pytest.mark.parametrize(
        "tipo",
        ["text/html", "application/javascript", "application/x-msdownload", "text/xml"],
    )
    def test_executaveis_e_markup(self, tipo: str) -> None:
        with pytest.raises(AnexoInvalido):
            valida([arquifo_de(tipo)])


def arquifo_de(tipo: str) -> ArquivoRecebido:
    return arquivo(filename="x", content_type=tipo, conteudo=b"conteudo")


class TestAssinatura:
    def test_html_renomeado_para_png_nao_passa(self) -> None:
        """O content-type do multipart vem do cliente: sem conferir os bytes,
        um HTML viraria "imagem" e seria servido como tal."""
        with pytest.raises(AnexoInvalido, match="não parece ser uma imagem"):
            valida([arquivo(conteudo=b"<html><script>alert(1)</script>")])

    def test_jpeg_declarado_como_png_nao_passa(self) -> None:
        with pytest.raises(AnexoInvalido):
            valida([arquivo(content_type="image/png", conteudo=JPEG)])

    def test_riff_que_nao_e_webp_nao_passa(self) -> None:
        """RIFF sozinho tambem e WAV e AVI -- o marcador WEBP fica no offset 8."""
        wav = b"RIFF" + b"\x00\x00\x00\x00" + b"WAVE" + b"resto"
        with pytest.raises(AnexoInvalido):
            valida([arquivo(content_type="image/webp", conteudo=wav)])

    def test_documento_nao_tem_assinatura_conferida(self) -> None:
        """Nao ha lista confiavel de assinaturas para todo formato de
        documento -- e eles nunca sao renderizados, so baixados."""
        valida([arquivo(filename="x.pdf", content_type="application/pdf", conteudo=b"qualquer")])


class TestTamanhoEQuantidade:
    def test_vazio_e_recusado(self) -> None:
        with pytest.raises(AnexoInvalido, match="está vazio"):
            valida([arquivo(conteudo=b"")])

    def test_acima_do_limite(self) -> None:
        gigante = PNG + b"\x00" * TAMANHO_MAXIMO
        with pytest.raises(AnexoInvalido, match="passa de"):
            valida([arquivo(conteudo=gigante)])

    def test_no_limite_exato_passa(self) -> None:
        no_limite = PNG + b"\x00" * (TAMANHO_MAXIMO - len(PNG))
        valida([arquivo(conteudo=no_limite)])

    def test_acima_do_maximo_de_arquivos(self) -> None:
        with pytest.raises(AnexoInvalido, match="Máximo de"):
            valida([arquivo() for _ in range(MAXIMO_POR_MENSAGEM + 1)])

    def test_no_maximo_exato_passa(self) -> None:
        valida([arquivo() for _ in range(MAXIMO_POR_MENSAGEM)])

    def test_lote_inteiro_cai_se_um_falhar(self) -> None:
        """Aceitar parcialmente deixaria a pessoa sem saber o que subiu."""
        with pytest.raises(AnexoInvalido):
            valida([arquivo(), arquivo(content_type="image/svg+xml", conteudo=b"<svg/>")])


class TestSemAnexo:
    def test_lista_vazia_e_valida(self) -> None:
        valida([])
