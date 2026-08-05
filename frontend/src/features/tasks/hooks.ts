import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { ApiError } from "../../lib/api-client";
import {
  atualizaTarefa,
  atividadeDaTarefa,
  boardDoTime,
  criaTarefa,
  excluiTarefa,
  minhasTarefas,
  moveTarefa,
  obtemTarefa,
  type MoverTarefa,
  type TarefaAtualizar,
  type TarefaCriar,
  type TarefaResumo,
} from "./api";

const CHAVE_TAREFAS = ["tarefas"] as const;
const chaveDoBoard = (teamId: string) => [...CHAVE_TAREFAS, "board", teamId] as const;
const chaveDaTarefa = (taskId: string) => [...CHAVE_TAREFAS, taskId] as const;
const CHAVE_MINHAS = [...CHAVE_TAREFAS, "minhas"] as const;
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
export function useMoverTarefa(teamId: string) {
  const queryClient = useQueryClient();
  const chave = chaveDoBoard(teamId);

  return useMutation({
    mutationFn: ({ taskId, dados }: { taskId: string; dados: MoverTarefa }) =>
      moveTarefa(taskId, dados),

    onMutate: async ({ taskId, dados }) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const anterior = queryClient.getQueryData<TarefaResumo[]>(chave);

      queryClient.setQueryData<TarefaResumo[]>(chave, (atual) =>
        atual?.map((tarefa) =>
          tarefa.id === taskId
            ? { ...tarefa, status: dados.status, due_date: dados.due_date ?? tarefa.due_date }
            : tarefa,
        ),
      );

      return { anterior };
    },

    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chave, contexto.anterior);
    },

    // Sempre resincroniza com o servidor: o otimista acerta status e prazo,
    // mas a posicao fracionaria final e calculada no backend.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chave });
      void queryClient.invalidateQueries({ queryKey: CHAVE_MINHAS });
    },
  });
}

/** Extrai a mensagem de prazo obrigatorio, para exibir junto ao card certo. */
export function erroDePrazoObrigatorio(erro: unknown): string | null {
  if (erro instanceof ApiError && erro.campo === "due_date") return erro.message;
  return null;
}
