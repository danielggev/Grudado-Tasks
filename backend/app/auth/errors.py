class AutenticacaoFalhou(Exception):
    """Login rejeitado. A borda traduz para 401.

    A mensagem pode ir para o usuario, entao nao deve conter detalhe de token,
    claim ou configuracao -- so o motivo em termos humanos.
    """

    def __init__(self, mensagem: str = "Nao foi possivel autenticar.") -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
