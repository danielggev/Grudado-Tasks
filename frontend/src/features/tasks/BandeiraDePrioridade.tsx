import type { TaskPriority } from "./api";
import { COR_BANDEIRA, ROTULO_PRIORIDADE } from "./prioridade";

/**
 * Prioridade como bandeira, sem texto.
 *
 * A cor carrega o significado e ocupa muito menos espaco que um selo escrito --
 * num cartao compacto isso libera a linha inteira para o titulo. O rotulo
 * continua acessivel por `title` e por leitor de tela, entao quem nao
 * distingue as cores nao fica sem a informacao.
 */
export function BandeiraDePrioridade({
  prioridade,
  tamanho = 14,
}: {
  prioridade: TaskPriority;
  tamanho?: number;
}) {
  const rotulo = ROTULO_PRIORIDADE[prioridade];

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={`Prioridade ${rotulo}`}
      className={`shrink-0 ${COR_BANDEIRA[prioridade]}`}
    >
      <title>{rotulo}</title>
      <path
        d="M6 21V4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M7.2 4.6h10.4l-2.3 3.9 2.3 3.9H7.2z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
