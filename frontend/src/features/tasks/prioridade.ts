import type { TaskPriority, TaskStatus } from "./api";

export const ROTULO_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

/**
 * Cada prioridade recebe uma cor da marca, do quente ao frio. A escala e
 * legivel antes da leitura do rotulo, que e o que importa num board escaneado
 * de relance.
 */
export const COR_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "bg-urgente text-white",
  alta: "bg-alta text-azul-escuro",
  normal: "bg-normal/15 text-normal",
  baixa: "bg-baixa/25 text-azul-escuro",
};

/** Faixa lateral do cartao — sinaliza prioridade sem ocupar espaco de texto. */
export const FAIXA_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "bg-urgente",
  alta: "bg-alta",
  normal: "bg-normal",
  baixa: "bg-baixa",
};

export const ORDEM_PRIORIDADE: TaskPriority[] = ["urgente", "alta", "normal", "baixa"];

export const ROTULO_STATUS: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
};

/** Ponto colorido no topo da coluna: identifica a fase sem precisar ler. */
export const COR_STATUS: Record<TaskStatus, string> = {
  a_fazer: "bg-texto-suave",
  em_andamento: "bg-azul-claro",
  bloqueado: "bg-laranja",
  concluido: "bg-verde",
};
