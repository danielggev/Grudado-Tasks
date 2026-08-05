class RegraDeDominioViolada(Exception):
    """Regra de negocio violada.

    O dominio nao conhece HTTP. A borda (app/api) traduz esta excecao para 422,
    e por isso ela carrega `campo`: e o que permite devolver o erro apontando
    para o input certo sem que o dominio saiba o que e um formulario.
    """

    def __init__(self, mensagem: str, *, campo: str | None = None) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.campo = campo


class PrazoObrigatorioNoEngajamento(RegraDeDominioViolada):
    def __init__(self) -> None:
        super().__init__(
            "Esta tarefa foi criada sem prazo. Defina o prazo para comecar a trabalhar nela.",
            campo="due_date",
        )


class AcessoNegado(Exception):
    """Falta de permissao. A borda traduz para 403 (ou 404, quando revelar a
    existencia do recurso ja seria vazamento)."""

    def __init__(self, mensagem: str = "Voce nao tem acesso a este recurso.") -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
