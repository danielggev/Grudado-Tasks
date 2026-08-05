import type { TaskPriority, TaskStatus } from "./api";

export const ROTULO_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

/**
 * Cor da bandeira de prioridade, encaixada na paleta da marca:
 * vermelho -> Rosa, amarelo -> Amarelo, azul -> Azul Claro, cinza -> texto suave.
 */
export const COR_BANDEIRA: Record<TaskPriority, string> = {
  urgente: "text-rosa",
  alta: "text-amarelo",
  normal: "text-azul-claro",
  baixa: "text-texto-suave",
};

/** Faixa lateral do cartao do board — prioridade legivel varrendo a coluna. */
export const FAIXA_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "bg-rosa",
  alta: "bg-amarelo",
  normal: "bg-azul-claro",
  baixa: "bg-texto-suave",
};

export const ORDEM_PRIORIDADE: TaskPriority[] = ["urgente", "alta", "normal", "baixa"];

export const ORDEM_STATUS: TaskStatus[] = [
  "a_fazer",
  "em_andamento",
  "bloqueado",
  "concluido",
];

export const ROTULO_STATUS: Record<TaskStatus, string> = {
  a_fazer: "Pendente",
  em_andamento: "Em progresso",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
};

/** Ponto colorido: identifica a fase antes da leitura do rotulo. */
export const COR_STATUS: Record<TaskStatus, string> = {
  a_fazer: "bg-texto-suave",
  em_andamento: "bg-azul-claro",
  bloqueado: "bg-laranja",
  concluido: "bg-verde",
};

/** Selo de status para os cartoes compactos. */
export const SELO_STATUS: Record<TaskStatus, string> = {
  a_fazer: "bg-superficie-2 text-texto-suave",
  em_andamento: "bg-azul-claro/15 text-azul-claro",
  bloqueado: "bg-laranja/15 text-laranja",
  concluido: "bg-verde/25 text-azul-escuro",
};
