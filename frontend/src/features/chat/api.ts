import { apiFetch } from "../../lib/api-client";
import type { components } from "../../types/api";

export type Mensagem = components["schemas"]["Mensagem"];
export type PaginaDeMensagens = components["schemas"]["PaginaDeMensagens"];

const rota = (teamId: string) => `/api/v1/times/${teamId}/mensagens`;

export function listaMensagens(
  teamId: string,
  antesDe?: string,
): Promise<PaginaDeMensagens> {
  const query = antesDe ? `?antes_de=${encodeURIComponent(antesDe)}` : "";
  return apiFetch<PaginaDeMensagens>(`${rota(teamId)}${query}`);
}

export function enviaMensagem(teamId: string, body: string): Promise<Mensagem> {
  return apiFetch<Mensagem>(rota(teamId), {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function excluiMensagem(teamId: string, messageId: string): Promise<Mensagem> {
  return apiFetch<Mensagem>(`${rota(teamId)}/${messageId}`, { method: "DELETE" });
}
