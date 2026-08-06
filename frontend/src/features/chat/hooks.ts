import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { conectaAoCanal } from "../../lib/ws-client";
import {
  enviaMensagem,
  excluiMensagem,
  idDoEscopo,
  listaMensagens,
  type Escopo,
  type Mensagem,
} from "./api";

const chaveDaConversa = (escopo: Escopo) => ["mensagens", idDoEscopo(escopo)] as const;

/**
 * Uma conversa, seja a do time ou a de uma tarefa.
 *
 * Guarda o historico anterior em estado separado da query: a query mantem
 * sempre o trecho mais recente (que o tempo real invalida), e o que foi
 * carregado para tras fica preservado -- se tudo vivesse na mesma query, cada
 * mensagem nova apagaria o historico que a pessoa acabou de abrir.
 */
export function useConversa(escopo: Escopo) {
  const chave = idDoEscopo(escopo);

  const recentes = useQuery({
    queryKey: chaveDaConversa(escopo),
    queryFn: () => listaMensagens(escopo),
  });

  const [anteriores, setAnteriores] = useState<Mensagem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);

  // Trocar de conversa zera o historico acumulado da anterior.
  useEffect(() => {
    setAnteriores([]);
    setCursor(null);
  }, [chave]);

  const cursorAtual = cursor ?? recentes.data?.cursor ?? null;

  async function carregaAnteriores() {
    if (!cursorAtual || carregandoAnteriores) return;
    setCarregandoAnteriores(true);
    try {
      const pagina = await listaMensagens(escopo, cursorAtual);
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

export function useEnviarMensagem(escopo: Escopo) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, arquivos }: { body: string; arquivos: File[] }) =>
      enviaMensagem(escopo, body, arquivos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chaveDaConversa(escopo) }),
  });
}

export function useExcluirMensagem(escopo: Escopo) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => excluiMensagem(escopo, messageId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chaveDaConversa(escopo) }),
  });
}

/**
 * Mensagem nova chega pelo canal do time -- inclusive as de tarefa, porque o
 * canal e por time.
 *
 * O evento carrega `task_id` justamente para nao invalidar todas as conversas
 * do time a cada mensagem: so a conversa afetada recarrega.
 */
export function useSincronizacaoDaConversa(escopo: Escopo) {
  const queryClient = useQueryClient();
  const chave = idDoEscopo(escopo);
  const { teamId } = escopo;
  const taskId = escopo.tipo === "tarefa" ? escopo.taskId : null;

  useEffect(() => {
    if (!teamId) return;

    return conectaAoCanal(teamId, (evento) => {
      if (evento.tipo !== "mensagens_mudaram") return;
      // O evento sem task_id e da conversa do time; com, e da tarefa.
      if ((evento.task_id ?? null) !== taskId) return;

      void queryClient.invalidateQueries({ queryKey: ["mensagens", chave] });
    });
  }, [teamId, taskId, chave, queryClient]);
}
