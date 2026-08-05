"""Posicionamento de cards dentro de uma coluna do board.

Arrastar um card nao pode reescrever a coluna inteira: com N tarefas isso seriam
N updates por gesto. Em vez disso cada tarefa carrega uma posicao fracionaria, e
inserir entre dois vizinhos e a media entre eles -- um update so, qualquer que
seja o tamanho da coluna.

O preco e que sucessivas insercoes no mesmo ponto encolhem o intervalo ate
esgotar a precisao do float. Quando isso acontece, `calcula_posicao` sinaliza
que a coluna precisa ser reespacada, e o servico rebalanceia antes de tentar de
novo. Na pratica nao acontece: sao necessarias ~50 insercoes consecutivas
exatamente entre o mesmo par.
"""

ESPACO_PADRAO = 1000.0
GAP_MINIMO = 1e-6


class PrecisaRebalancear(Exception):
    """Nao ha intervalo utilizavel entre os vizinhos.

    Nao e erro de dominio nem chega ao usuario: e um sinal interno para o
    servico reespacar a coluna e repetir a operacao.
    """


def calcula_posicao(*, anterior: float | None, proxima: float | None) -> float:
    """Posicao para um card solto entre `anterior` e `proxima`.

    `None` de um lado significa que o card vai para a ponta correspondente.
    """
    if anterior is None and proxima is None:
        return ESPACO_PADRAO

    if anterior is None:
        assert proxima is not None
        if proxima <= GAP_MINIMO:
            raise PrecisaRebalancear
        return proxima / 2

    if proxima is None:
        return anterior + ESPACO_PADRAO

    if proxima - anterior <= GAP_MINIMO:
        raise PrecisaRebalancear
    return (anterior + proxima) / 2


def posicoes_rebalanceadas(quantidade: int) -> list[float]:
    """Posicoes uniformemente espacadas para reescrever uma coluna inteira.

    Usado apenas quando `calcula_posicao` sinaliza esgotamento de precisao.
    """
    return [ESPACO_PADRAO * (indice + 1) for indice in range(quantidade)]
