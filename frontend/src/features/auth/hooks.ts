import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../lib/api-client";
import { buscaUsuarioAtual, encerraSessao } from "./api";

export const CHAVE_USUARIO_ATUAL = ["usuario-atual"] as const;

export function useUsuarioAtual() {
  return useQuery({
    queryKey: CHAVE_USUARIO_ATUAL,
    queryFn: buscaUsuarioAtual,
    staleTime: 5 * 60 * 1000,
    // 401 nao e falha transitoria: e a resposta correta para quem nao entrou.
    // Retentar so atrasaria a tela de login.
    retry: (tentativas, erro) =>
      erro instanceof ApiError && erro.naoAutenticado ? false : tentativas < 2,
  });
}

export function useEncerrarSessao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: encerraSessao,
    onSuccess: () => queryClient.clear(),
  });
}
