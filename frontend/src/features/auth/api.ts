import { apiFetch } from "../../lib/api-client";
import type { paths } from "../../types/api";

/**
 * O tipo vem do OpenAPI gerado pelo backend, nao de uma interface escrita a mao.
 * Se o Pydantic mudar, `npm run typecheck` quebra -- que e exatamente o ponto de
 * ter backend e frontend em linguagens diferentes sem pagar o preco da deriva.
 */
export type UsuarioAutenticado =
  paths["/api/v1/auth/me"]["get"]["responses"]["200"]["content"]["application/json"];

export const URL_DE_LOGIN = "/api/v1/auth/login";

export function buscaUsuarioAtual(): Promise<UsuarioAutenticado> {
  return apiFetch<UsuarioAutenticado>("/api/v1/auth/me");
}

export function encerraSessao(): Promise<void> {
  return apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
}
