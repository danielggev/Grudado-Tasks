import type { TaskPriority } from "./api";

export const ROTULO_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

/** Classes Tailwind por prioridade, lendo as cores definidas em index.css. */
export const COR_PRIORIDADE: Record<TaskPriority, string> = {
  urgente: "bg-urgente/10 text-urgente border-urgente/30",
  alta: "bg-alta/10 text-alta border-alta/30",
  normal: "bg-normal/10 text-normal border-normal/30",
  baixa: "bg-baixa/10 text-baixa border-baixa/30",
};

export const ORDEM_PRIORIDADE: TaskPriority[] = ["urgente", "alta", "normal", "baixa"];
