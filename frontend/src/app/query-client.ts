import { QueryClient } from "@tanstack/react-query";

export function criaQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // O WebSocket e que vai invalidar o cache quando algo mudar (fase 2).
        // Ate la, refetch ao focar a janela cobre o basico sem poluir a rede.
        refetchOnWindowFocus: true,
        staleTime: 30_000,
      },
    },
  });
}
