import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../../lib/api-client";
import type { components } from "../../types/api";

export type UsuarioPublico = components["schemas"]["UsuarioPublico"];

export function listaUsuarios(): Promise<UsuarioPublico[]> {
  return apiFetch<UsuarioPublico[]>("/api/v1/usuarios");
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: listaUsuarios,
    // O quadro de pessoas de uma empresa de 15 muda raramente; nao vale
    // rebuscar a cada abertura do seletor de membros.
    staleTime: 10 * 60 * 1000,
  });
}
