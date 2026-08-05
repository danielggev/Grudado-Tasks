import { apiFetch } from "../../lib/api-client";
import type { components } from "../../types/api";

export type TimeResumo = components["schemas"]["TimeResumo"];
export type TimeDetalhe = components["schemas"]["TimeDetalhe"];
export type TimeCriar = components["schemas"]["TimeCriar"];
export type TimeAtualizar = components["schemas"]["TimeAtualizar"];
export type MembroDoTime = components["schemas"]["MembroDoTime"];
export type AdicionarMembro = components["schemas"]["AdicionarMembro"];
export type TeamRole = components["schemas"]["TeamRole"];

const BASE = "/api/v1/times";

export function listaTimes(incluirArquivados = false): Promise<TimeResumo[]> {
  return apiFetch<TimeResumo[]>(`${BASE}?incluir_arquivados=${incluirArquivados}`);
}

export function obtemTime(teamId: string): Promise<TimeDetalhe> {
  return apiFetch<TimeDetalhe>(`${BASE}/${teamId}`);
}

export function criaTime(dados: TimeCriar): Promise<TimeDetalhe> {
  return apiFetch<TimeDetalhe>(BASE, { method: "POST", body: JSON.stringify(dados) });
}

export function atualizaTime(teamId: string, dados: TimeAtualizar): Promise<TimeDetalhe> {
  return apiFetch<TimeDetalhe>(`${BASE}/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function arquivaTime(teamId: string, arquivar: boolean): Promise<TimeDetalhe> {
  const acao = arquivar ? "arquivar" : "reativar";
  return apiFetch<TimeDetalhe>(`${BASE}/${teamId}/${acao}`, { method: "POST" });
}

export function adicionaMembro(
  teamId: string,
  dados: AdicionarMembro,
): Promise<MembroDoTime> {
  return apiFetch<MembroDoTime>(`${BASE}/${teamId}/membros`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function alteraPapel(
  teamId: string,
  userId: string,
  role: TeamRole,
): Promise<MembroDoTime> {
  return apiFetch<MembroDoTime>(`${BASE}/${teamId}/membros/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMembro(teamId: string, userId: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${teamId}/membros/${userId}`, { method: "DELETE" });
}
