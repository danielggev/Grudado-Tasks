import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CHAVE_USUARIO_ATUAL, useUsuarioAtual } from "../auth/hooks";
import {
  adicionaMembro,
  alteraPapel,
  arquivaTime,
  atualizaTime,
  criaTime,
  excluiTime,
  listaTimes,
  obtemTime,
  removeMembro,
  type AdicionarMembro,
  type TeamRole,
  type TimeAtualizar,
  type TimeCriar,
} from "./api";

export const CHAVE_TIMES = ["times"] as const;
const chaveDoTime = (teamId: string) => [...CHAVE_TIMES, teamId] as const;

export function useTimes(incluirArquivados = false) {
  return useQuery({
    queryKey: [...CHAVE_TIMES, { incluirArquivados }],
    queryFn: () => listaTimes(incluirArquivados),
  });
}

export function useTime(teamId: string) {
  return useQuery({
    queryKey: chaveDoTime(teamId),
    queryFn: () => obtemTime(teamId),
  });
}

/**
 * Permissoes vistas pela interface.
 *
 * Serve so para decidir o que desenhar. O backend reavalia tudo a cada request
 * -- esconder um botao nunca foi controle de acesso.
 */
export function usePermissoes() {
  const { data: usuario } = useUsuarioAtual();
  const ehAdmin = usuario?.org_role === "admin";

  return {
    ehAdmin,
    podeCriarTime: ehAdmin,
    podeGerenciar: (teamId: string) =>
      ehAdmin || (usuario?.times_como_lead.includes(teamId) ?? false),
  };
}

/**
 * Invalida a lista e o time afetado. Tambem invalida o usuario atual porque
 * `times` e `times_como_lead` vem de /auth/me -- sem isso, quem acabou de criar
 * um time continuaria sem enxergar os botoes de gestao dele.
 */
function useInvalidacao() {
  const queryClient = useQueryClient();
  return (teamId?: string) => {
    void queryClient.invalidateQueries({ queryKey: CHAVE_TIMES });
    void queryClient.invalidateQueries({ queryKey: CHAVE_USUARIO_ATUAL });
    if (teamId) void queryClient.invalidateQueries({ queryKey: chaveDoTime(teamId) });
  };
}

export function useCriarTime() {
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: (dados: TimeCriar) => criaTime(dados),
    onSuccess: (time) => invalidar(time.id),
  });
}

export function useAtualizarTime(teamId: string) {
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: (dados: TimeAtualizar) => atualizaTime(teamId, dados),
    onSuccess: () => invalidar(teamId),
  });
}

export function useArquivarTime(teamId: string) {
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: (arquivar: boolean) => arquivaTime(teamId, arquivar),
    onSuccess: () => invalidar(teamId),
  });
}

export function useAdicionarMembro(teamId: string) {
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: (dados: AdicionarMembro) => adicionaMembro(teamId, dados),
    onSuccess: () => invalidar(teamId),
  });
}

export function useAlterarPapel(teamId: string) {
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TeamRole }) =>
      alteraPapel(teamId, userId, role),
    onSuccess: () => invalidar(teamId),
  });
}

export function useRemoverMembro(teamId: string) {
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: (userId: string) => removeMembro(teamId, userId),
    onSuccess: () => invalidar(teamId),
  });
}

/**
 * Exclusao definitiva do time. Leva tarefas e historico junto, sem volta --
 * a confirmacao na interface precisa deixar isso explicito.
 */
export function useExcluirTime() {
  const queryClient = useQueryClient();
  const invalidar = useInvalidacao();
  return useMutation({
    mutationFn: (teamId: string) => excluiTime(teamId),
    onSuccess: () => {
      invalidar();
      // As tarefas do time sumiram junto: limpar o cache de tarefas evita que
      // a visao geral continue desenhando uma coluna que nao existe mais.
      void queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    },
  });
}
