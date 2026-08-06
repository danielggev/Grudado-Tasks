import { apiFetch } from "../../lib/api-client";
import type { components } from "../../types/api";

export type Mensagem = components["schemas"]["Mensagem"];
export type Anexo = components["schemas"]["Anexo"];
export type PaginaDeMensagens = components["schemas"]["PaginaDeMensagens"];

const rota = (teamId: string) => `/api/v1/times/${teamId}/mensagens`;

/** URL do anexo. Passa pela API porque o acesso depende do time. */
export function urlDoAnexo(teamId: string, anexoId: string): string {
  return `${rota(teamId)}/anexos/${anexoId}`;
}

export function listaMensagens(
  teamId: string,
  antesDe?: string,
): Promise<PaginaDeMensagens> {
  const query = antesDe ? `?antes_de=${encodeURIComponent(antesDe)}` : "";
  return apiFetch<PaginaDeMensagens>(`${rota(teamId)}${query}`);
}

export function enviaMensagem(
  teamId: string,
  body: string,
  arquivos: File[] = [],
): Promise<Mensagem> {
  const dados = new FormData();
  dados.append("body", body);
  for (const arquivo of arquivos) dados.append("arquivos", arquivo);

  // Sem Content-Type: o navegador precisa gerar o boundary do multipart.
  // Defini-lo a mao quebraria o parse no servidor.
  return apiFetch<Mensagem>(rota(teamId), { method: "POST", body: dados });
}

export function excluiMensagem(teamId: string, messageId: string): Promise<Mensagem> {
  return apiFetch<Mensagem>(`${rota(teamId)}/${messageId}`, { method: "DELETE" });
}
