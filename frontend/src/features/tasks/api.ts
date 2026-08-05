import { apiFetch } from "../../lib/api-client";
import type { components } from "../../types/api";

export type TarefaResumo = components["schemas"]["TarefaResumo"];
export type TarefaDetalhe = components["schemas"]["TarefaDetalhe"];
export type TarefaCriar = components["schemas"]["TarefaCriar"];
export type TarefaAtualizar = components["schemas"]["TarefaAtualizar"];
export type MoverTarefa = components["schemas"]["MoverTarefa"];
export type EventoDeAtividade = components["schemas"]["EventoDeAtividade"];
export type TaskStatus = components["schemas"]["TaskStatus"];
export type TaskPriority = components["schemas"]["TaskPriority"];
export type ActivityAction = components["schemas"]["ActivityAction"];

const BASE = "/api/v1/tarefas";

export function boardDoTime(teamId: string): Promise<TarefaResumo[]> {
  return apiFetch<TarefaResumo[]>(`${BASE}/board?team_id=${teamId}`);
}

/** Tarefas de todos os times visiveis, numa requisicao so. */
export function panorama(): Promise<TarefaResumo[]> {
  return apiFetch<TarefaResumo[]>(`${BASE}/panorama`);
}

export function minhasTarefas(): Promise<TarefaResumo[]> {
  return apiFetch<TarefaResumo[]>(`${BASE}/minhas`);
}

export function obtemTarefa(taskId: string): Promise<TarefaDetalhe> {
  return apiFetch<TarefaDetalhe>(`${BASE}/${taskId}`);
}

export function criaTarefa(dados: TarefaCriar): Promise<TarefaDetalhe> {
  return apiFetch<TarefaDetalhe>(BASE, { method: "POST", body: JSON.stringify(dados) });
}

export function atualizaTarefa(
  taskId: string,
  dados: TarefaAtualizar,
): Promise<TarefaDetalhe> {
  return apiFetch<TarefaDetalhe>(`${BASE}/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

/**
 * Um gesto de arrastar. Pode devolver 422 com `campo: "due_date"` quando a
 * tarefa sai de "a fazer" sem prazo definido -- ver ApiError.campo.
 */
export function moveTarefa(taskId: string, dados: MoverTarefa): Promise<TarefaDetalhe> {
  return apiFetch<TarefaDetalhe>(`${BASE}/${taskId}/mover`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function excluiTarefa(taskId: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${taskId}`, { method: "DELETE" });
}

export function atividadeDaTarefa(taskId: string): Promise<EventoDeAtividade[]> {
  return apiFetch<EventoDeAtividade[]>(`${BASE}/${taskId}/atividade`);
}
