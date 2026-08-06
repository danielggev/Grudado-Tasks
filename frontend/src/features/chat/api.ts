import { apiFetch } from "../../lib/api-client";
import type { components } from "../../types/api";

export type Mensagem = components["schemas"]["Mensagem"];
export type Anexo = components["schemas"]["Anexo"];
export type PaginaDeMensagens = components["schemas"]["PaginaDeMensagens"];

/**
 * Onde a conversa acontece.
 *
 * Espelha o `Conversa` do backend: as duas sao a mesma conversa com escopo
 * diferente, e tratar assim aqui tambem evita duplicar componente, hook e
 * cache para algo que so muda de endereco.
 */
export type Escopo =
  | { tipo: "time"; teamId: string }
  | { tipo: "tarefa"; teamId: string; taskId: string };

function rota(escopo: Escopo): string {
  return escopo.tipo === "time"
    ? `/api/v1/times/${escopo.teamId}/mensagens`
    : `/api/v1/tarefas/${escopo.taskId}/mensagens`;
}

/** Identidade estavel do escopo, para chave de cache. */
export function idDoEscopo(escopo: Escopo): string {
  return escopo.tipo === "time" ? `time:${escopo.teamId}` : `tarefa:${escopo.taskId}`;
}

/** URL do anexo. Passa pela API porque o acesso depende do time. */
export function urlDoAnexo(escopo: Escopo, anexoId: string): string {
  return `${rota(escopo)}/anexos/${anexoId}`;
}

export function listaMensagens(
  escopo: Escopo,
  antesDe?: string,
): Promise<PaginaDeMensagens> {
  const query = antesDe ? `?antes_de=${encodeURIComponent(antesDe)}` : "";
  return apiFetch<PaginaDeMensagens>(`${rota(escopo)}${query}`);
}

export function enviaMensagem(
  escopo: Escopo,
  body: string,
  arquivos: File[] = [],
): Promise<Mensagem> {
  const dados = new FormData();
  dados.append("body", body);
  for (const arquivo of arquivos) dados.append("arquivos", arquivo);

  // Sem Content-Type: o navegador precisa gerar o boundary do multipart.
  // Defini-lo a mao quebraria o parse no servidor.
  return apiFetch<Mensagem>(rota(escopo), { method: "POST", body: dados });
}

export function excluiMensagem(escopo: Escopo, messageId: string): Promise<Mensagem> {
  return apiFetch<Mensagem>(`${rota(escopo)}/${messageId}`, { method: "DELETE" });
}
