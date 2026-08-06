import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ApiError } from "../../lib/api-client";
import { conectaAoCanal } from "../../lib/ws-client";
import {
  atualizaTarefa,
  atividadeDaTarefa,
  boardDoTime,
  criaTarefa,
  excluiTarefa,
  minhasTarefas,
  moveTarefa,
  obtemTarefa,
  panorama,
  type MoverTarefa,
  type TarefaAtualizar,
  type TarefaCriar,
  type TarefaResumo,
} from "./api";

const CHAVE_TAREFAS = ["tarefas"] as const;
export const chaveDoBoard = (teamId: string) =>
  [...CHAVE_TAREFAS, "board", teamId] as const;
const chaveDaTarefa = (taskId: string) => [...CHAVE_TAREFAS, taskId] as const;
export const CHAVE_MINHAS = [...CHAVE_TAREFAS, "minhas"] as const;
const chaveDeAtividade = (taskId: string) => [...chaveDaTarefa(taskId), "atividade"] as const;

export function useBoard(teamId: string) {
  return useQuery({
    queryKey: chaveDoBoard(teamId),
    queryFn: () => boardDoTime(teamId),
  });
}

export function useMinhasTarefas() {
  return useQuery({ queryKey: CHAVE_MINHAS, queryFn: minhasTarefas });
}

export const CHAVE_PANORAMA = [...CHAVE_TAREFAS, "panorama"] as const;

export function usePanorama() {
  return useQuery({ queryKey: CHAVE_PANORAMA, queryFn: panorama });
}

export function useTarefa(taskId: string) {
  return useQuery({
    queryKey: chaveDaTarefa(taskId),
    queryFn: () => obtemTarefa(taskId),
  });
}

export function useAtividade(taskId: string) {
  return useQuery({
    queryKey: chaveDeAtividade(taskId),
    queryFn: () => atividadeDaTarefa(taskId),
  });
}

function invalidaTudoDoTime(queryClient: QueryClient, teamId: string) {
  void queryClient.invalidateQueries({ queryKey: chaveDoBoard(teamId) });
  void queryClient.invalidateQueries({ queryKey: CHAVE_MINHAS });
  // A visao geral por time mostra as mesmas tarefas: sem isto, criar uma tarefa
  // no board deixaria a tela de Times mostrando o estado anterior.
  void queryClient.invalidateQueries({ queryKey: CHAVE_PANORAMA });
}

export function useCriarTarefa(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: TarefaCriar) => criaTarefa(dados),
    onSuccess: () => invalidaTudoDoTime(queryClient, teamId),
  });
}

export function useAtualizarTarefa(taskId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: TarefaAtualizar) => atualizaTarefa(taskId, dados),
    onSuccess: (tarefa) => {
      queryClient.setQueryData(chaveDaTarefa(taskId), tarefa);
      invalidaTudoDoTime(queryClient, teamId);
    },
  });
}

export function useExcluirTarefa(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => excluiTarefa(taskId),
    onSuccess: () => invalidaTudoDoTime(queryClient, teamId),
  });
}

/**
 * Mover um card no board.
 *
 * Otimista de proposito: arrastar precisa parecer instantaneo, e a latencia de
 * rede faria o card "voltar" visualmente antes de assentar na coluna certa.
 *
 * O rollback cobre o caso central do produto -- soltar em qualquer coluna que
 * nao "a fazer" sem prazo definido devolve 422 (campo `due_date`). Sem
 * desfazer a atualizacao otimista, o card ficaria preso numa coluna que o
 * servidor recusou.
 */
export type VariaveisDeMover = {
  taskId: string;
  /** Time da tarefa; usado para invalidar o board certo depois. */
  teamId: string;
  dados: MoverTarefa;
};

/**
 * `chaveOtimista` e a lista que a tela esta exibindo -- o board de um time ou
 * "minhas tarefas". Precisa ser parametro porque a mesma acao de arrastar
 * acontece nas duas telas, e cada uma tem a propria copia em cache.
 */
export function useMoverTarefa(chaveOtimista: readonly unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, dados }: VariaveisDeMover) => moveTarefa(taskId, dados),

    onMutate: async ({ taskId, dados }) => {
      await queryClient.cancelQueries({ queryKey: chaveOtimista });
      const anterior = queryClient.getQueryData<TarefaResumo[]>(chaveOtimista);

      queryClient.setQueryData<TarefaResumo[]>(chaveOtimista, (atual) =>
        atual?.map((tarefa) =>
          tarefa.id === taskId
            ? { ...tarefa, status: dados.status, due_date: dados.due_date ?? tarefa.due_date }
            : tarefa,
        ),
      );

      return { anterior };
    },

    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chaveOtimista, contexto.anterior);
    },

    // Sempre resincroniza com o servidor: o otimista acerta status e prazo,
    // mas a posicao fracionaria final e calculada no backend.
    onSettled: (_dados, _erro, variaveis) => {
      void queryClient.invalidateQueries({ queryKey: chaveOtimista });
      void queryClient.invalidateQueries({ queryKey: chaveDoBoard(variaveis.teamId) });
      void queryClient.invalidateQueries({ queryKey: CHAVE_MINHAS });
      void queryClient.invalidateQueries({ queryKey: CHAVE_PANORAMA });
    },
  });
}

/** Extrai a mensagem de prazo obrigatorio, para exibir junto ao card certo. */
export function erroDePrazoObrigatorio(erro: unknown): string | null {
  if (erro instanceof ApiError && erro.campo === "due_date") return erro.message;
  return null;
}

/**
 * Mantem o board sincronizado com o que os colegas fazem.
 *
 * O evento do servidor nao carrega estado -- so avisa que algo mudou naquele
 * time. Invalidar e deixar o TanStack Query refetchar mantem uma fonte de
 * verdade so (a API REST) e evita ter que serializar tarefa em dois lugares.
 *
 * Nao invalida o detalhe da tarefa aberta de proposito: refetchar embaixo de
 * quem esta digitando sobrescreveria o texto em edicao.
 */
export function useSincronizacaoDoTime(teamId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    return conectaAoCanal(teamId, (evento) => {
      if (evento.tipo === "tarefas_mudaram") {
        void queryClient.invalidateQueries({ queryKey: chaveDoBoard(teamId) });
        void queryClient.invalidateQueries({ queryKey: CHAVE_MINHAS });
      }
    });
  }, [teamId, queryClient]);
}
