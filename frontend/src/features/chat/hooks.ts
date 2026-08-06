import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { conectaAoCanal } from "../../lib/ws-client";
import { enviaMensagem, excluiMensagem, listaMensagens, type Mensagem } from "./api";

const chaveDaConversa = (teamId: string) => ["mensagens", teamId] as const;

/**
 * Conversa do time.
 *
 * Guarda o historico anterior em estado separado da query: a query mantem
 * sempre o trecho mais recente (que o tempo real invalida), e o que foi
 * carregado para tras fica preservado -- se tudo vivesse na mesma query, cada
 * mensagem nova apagaria o historico que a pessoa acabou de abrir.
 */
export function useConversa(teamId: string) {
  const recentes = useQuery({
    queryKey: chaveDaConversa(teamId),
    queryFn: () => listaMensagens(teamId),
  });

  const [anteriores, setAnteriores] = useState<Mensagem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);

  // Trocar de time zera o historico acumulado do time anterior.
  useEffect(() => {
    setAnteriores([]);
    setCursor(null);
  }, [teamId]);

  const cursorAtual = cursor ?? recentes.data?.cursor ?? null;

  async function carregaAnteriores() {
    if (!cursorAtual || carregandoAnteriores) return;
    setCarregandoAnteriores(true);
    try {
      const pagina = await listaMensagens(teamId, cursorAtual);
      setAnteriores((atual) => [...pagina.mensagens, ...atual]);
      setCursor(pagina.cursor);
    } finally {
      setCarregandoAnteriores(false);
    }
  }

  return {
    mensagens: [...anteriores, ...(recentes.data?.mensagens ?? [])],
    carregando: recentes.isPending,
    erro: recentes.error,
    haAnteriores: cursorAtual !== null,
    carregandoAnteriores,
    carregaAnteriores,
  };
}

export function useEnviarMensagem(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, arquivos }: { body: string; arquivos: File[] }) =>
      enviaMensagem(teamId, body, arquivos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chaveDaConversa(teamId) }),
  });
}

export function useExcluirMensagem(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => excluiMensagem(teamId, messageId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chaveDaConversa(teamId) }),
  });
}

/**
 * Mensagem nova de um colega chega pelo mesmo canal do board.
 *
 * Como nos outros eventos, o servidor so avisa que algo mudou -- quem busca o
 * conteudo e a query. Uma fonte de verdade so.
 */
export function useSincronizacaoDaConversa(teamId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    return conectaAoCanal(teamId, (evento) => {
      if (evento.tipo === "mensagens_mudaram") {
        void queryClient.invalidateQueries({ queryKey: chaveDaConversa(teamId) });
      }
    });
  }, [teamId, queryClient]);
}
