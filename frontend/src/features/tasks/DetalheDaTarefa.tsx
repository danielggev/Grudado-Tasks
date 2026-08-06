import { useEffect, useState } from "react";

import { Avatar } from "../../app/Layout";
import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { Dialogo } from "../../components/ui/Dialogo";
import { Esqueleto } from "../../components/ui/Esqueleto";
import { ApiError } from "../../lib/api-client";
import { Chat } from "../chat/Chat";
import { usePermissoes, useTime } from "../teams/hooks";
import type { TaskPriority, TaskStatus } from "./api";
import { BandeiraDePrioridade } from "./BandeiraDePrioridade";
import {
  chaveDoBoard,
  erroDePrazoObrigatorio,
  useAtualizarTarefa,
  useExcluirTarefa,
  useMoverTarefa,
  useTarefa,
} from "./hooks";
import { PainelDeAtividade } from "./PainelDeAtividade";
import { PainelDePrazo } from "./PainelDePrazo";
import {
  COR_STATUS,
  ORDEM_PRIORIDADE,
  ORDEM_STATUS,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
} from "./prioridade";

export function DetalheDaTarefa({
  taskId,
  aoFechar,
  aoAbrirSubtarefa,
  aoCriarSubtarefa,
}: {
  taskId: string;
  aoFechar: () => void;
  aoAbrirSubtarefa: (id: string) => void;
  /**
   * Recebe time e mae prontos.
   *
   * Antes o pai tinha que descobrir os dois por conta propria, procurando a
   * tarefa aberta na lista que ele tinha em maos -- e na tela de Times isso
   * falhava para subtarefa, que nao aparece no nivel de topo. Quem tem o dado
   * e este componente, que ja busca a tarefa.
   */
  aoCriarSubtarefa: (dados: { teamId: string; parentId: string }) => void;
}) {
  const { data: tarefa, isPending, error } = useTarefa(taskId);
  const { data: time } = useTime(tarefa?.team_id ?? "");
  const { podeGerenciar } = usePermissoes();

  const atualizar = useAtualizarTarefa(taskId, tarefa?.team_id ?? "");
  const excluir = useExcluirTarefa(tarefa?.team_id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [statusPendente, setStatusPendente] = useState<TaskStatus | null>(null);
  // O detalhe abre a partir de qualquer tela, entao o cache a atualizar
  // otimisticamente e o do board do time da tarefa.
  const mover = useMoverTarefa(chaveDoBoard(tarefa?.team_id ?? ""));

  // Sincroniza o formulario sempre que a tarefa (re)carrega -- inclusive apos
  // outra pessoa move-la pelo board, o que invalida a query e traz dado novo.
  useEffect(() => {
    if (!tarefa) return;
    setTitle(tarefa.title);
    setDescription(tarefa.description ?? "");
    setPriority(tarefa.priority);
    setResponsaveis(tarefa.responsaveis.map((r) => r.id));
  }, [tarefa]);

  if (isPending) {
    return (
      <Dialogo aberto titulo="Tarefa" aoFechar={aoFechar} largura="larga">
        <div className="flex flex-col gap-4">
          <Esqueleto className="h-9 w-full" />
          <Esqueleto className="h-20 w-full" />
          <Esqueleto className="h-9 w-40" />
        </div>
      </Dialogo>
    );
  }

  if (error || !tarefa) {
    return (
      <Dialogo aberto titulo="Tarefa" aoFechar={aoFechar}>
        <Aviso erro={error} />
      </Dialogo>
    );
  }

  function alterna(userId: string) {
    setResponsaveis((atual) =>
      atual.includes(userId)
        ? atual.filter((id) => id !== userId)
        : [...atual, userId],
    );
  }

  function salva() {
    atualizar.mutate({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      responsaveis,
    });
  }

  /**
   * Mudar status passa pelo mesmo endpoint do arrasto, entao a regra do prazo
   * vale aqui tambem: sair de "Pendente" sem prazo devolve 422 e abre o painel
   * que cobra a data.
   */
  function mudaStatus(novo: TaskStatus) {
    if (!tarefa) return;
    mover.mutate(
      { taskId, teamId: tarefa.team_id, dados: { status: novo, apos: null } },
      {
        onError: (erro) => {
          if (erroDePrazoObrigatorio(erro)) setStatusPendente(novo);
        },
      },
    );
  }

  const campo =
    "w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro";

  return (
    <>
      {/* Duas colunas: informacoes a esquerda, conversa da tarefa a direita,
          na mesma proporcao da tela do time. Abaixo de `lg` empilham -- lado a
          lado num dialogo estreito nenhuma das duas caberia. */}
      <Dialogo aberto titulo="Tarefa" aoFechar={aoFechar} largura="ampla">
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* Cabecalho de estado: status, prioridade e prazo de relance. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-superficie-2 px-2.5 py-1 text-[10px] font-black tracking-wide uppercase">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${COR_STATUS[tarefa.status]}`}
                />
                {ROTULO_STATUS[tarefa.status]}
              </span>

              {/* No detalhe ha espaco: bandeira e rotulo juntos, para quem ainda
                esta aprendendo o codigo de cores dos cartoes. */}
              <span className="flex items-center gap-1.5 rounded-full bg-superficie-2 px-2.5 py-1 text-[10px] font-black tracking-wide uppercase">
                <BandeiraDePrioridade
                  prioridade={tarefa.priority}
                  tamanho={12}
                />
                {ROTULO_PRIORIDADE[tarefa.priority]}
              </span>

              {tarefa.due_date && (
                <span className="rounded-full bg-superficie-2 px-2.5 py-1 text-[10px] font-semibold text-texto-suave">
                  Prazo {tarefa.due_date.split("-").reverse().join("/")}
                </span>
              )}

              <IndicadorDeSalvamento
                salvando={atualizar.isPending}
                salvo={atualizar.isSuccess}
              />
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={salva}
              minLength={2}
              maxLength={300}
              aria-label="Título"
              className={`${campo} text-base font-black`}
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={salva}
              rows={3}
              placeholder="Adicione uma descrição..."
              aria-label="Descrição"
              className={`${campo} resize-y`}
            />

            <div className="flex flex-wrap gap-3">
              {/* Subtarefa aninhada nao e arrastavel; sem este seletor ela nunca
                sairia de "Pendente". Serve tambem para quem prefere nao
                arrastar no board. */}
              <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
                <span className="text-xs font-black tracking-wide text-texto-suave uppercase">
                  Status
                </span>
                <select
                  value={tarefa.status}
                  onChange={(e) => mudaStatus(e.target.value as TaskStatus)}
                  disabled={mover.isPending}
                  className={campo}
                >
                  {ORDEM_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_STATUS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
                <span className="text-xs font-black tracking-wide text-texto-suave uppercase">
                  Prioridade
                </span>
                <select
                  value={priority}
                  onChange={(e) => {
                    const nova = e.target.value as TaskPriority;
                    setPriority(nova);
                    atualizar.mutate({ priority: nova });
                  }}
                  className={campo}
                >
                  {ORDEM_PRIORIDADE.map((p) => (
                    <option key={p} value={p}>
                      {ROTULO_PRIORIDADE[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="text-xs font-black tracking-wide text-texto-suave uppercase">
                Responsáveis
              </legend>
              <p className="text-xs text-texto-suave">
                Ninguém marcado = tarefa do time inteiro.
              </p>
              <div className="mt-1 flex flex-col gap-0.5 rounded-xl border border-borda p-2">
                {time?.membros.map((membro) => (
                  <label
                    key={membro.usuario.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-superficie-2"
                  >
                    <input
                      type="checkbox"
                      checked={responsaveis.includes(membro.usuario.id)}
                      onChange={() => {
                        alterna(membro.usuario.id);
                        atualizar.mutate({
                          responsaveis: responsaveis.includes(membro.usuario.id)
                            ? responsaveis.filter(
                                (id) => id !== membro.usuario.id,
                              )
                            : [...responsaveis, membro.usuario.id],
                        });
                      }}
                      className="accent-rosa"
                    />
                    <Avatar nome={membro.usuario.name} tamanho="xs" />
                    <span className="font-semibold">{membro.usuario.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {tarefa.parent_id === null && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-wide text-texto-suave uppercase">
                    Subtarefas ({tarefa.subtarefas.length})
                  </h3>
                  <Botao
                    onClick={() =>
                      aoCriarSubtarefa({
                        teamId: tarefa.team_id,
                        parentId: tarefa.id,
                      })
                    }
                  >
                    Adicionar
                  </Botao>
                </div>
                {tarefa.subtarefas.length > 0 && (
                  <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda">
                    {tarefa.subtarefas.map((sub) => (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() => aoAbrirSubtarefa(sub.id)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-superficie-2"
                        >
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${COR_STATUS[sub.status]}`}
                          />
                          <span
                            className={
                              sub.status === "concluido"
                                ? "text-texto-suave line-through"
                                : "font-semibold"
                            }
                          >
                            {sub.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-black tracking-wide text-texto-suave uppercase">
                Atividade
              </h3>
              <PainelDeAtividade taskId={taskId} />
            </section>

            <Aviso erro={atualizar.error} />

            <div className="flex justify-end border-t border-borda pt-4">
              <Botao
                variante="perigo"
                onClick={() => setConfirmandoExclusao(true)}
              >
                Excluir tarefa
              </Botao>
            </div>
          </div>

          {/* Altura propria para rolar por dentro: sem limite, a conversa
            esticaria o dialogo e o campo de escrever sairia da tela. */}
          <div className="h-96 min-w-0 lg:h-[32rem]">
            <Chat
              escopo={{
                tipo: "tarefa",
                teamId: tarefa.team_id,
                taskId: tarefa.id,
              }}
              titulo="Conversa da tarefa"
              podeModerar={podeGerenciar(tarefa.team_id)}
              compacto
            />
          </div>
        </div>
      </Dialogo>

      {statusPendente && (
        <PainelDePrazo
          onDefinir={(due_date) =>
            mover.mutate(
              {
                taskId,
                teamId: tarefa.team_id,
                dados: { status: statusPendente, due_date, apos: null },
              },
              { onSuccess: () => setStatusPendente(null) },
            )
          }
          onCancelar={() => setStatusPendente(null)}
          erro={mover.error instanceof ApiError ? mover.error : null}
        />
      )}

      <Confirmacao
        aberto={confirmandoExclusao}
        titulo="Excluir tarefa"
        mensagem={
          tarefa.subtarefas.length > 0
            ? `"${tarefa.title}" será excluída junto com suas ${tarefa.subtarefas.length} subtarefa(s). Não dá para desfazer.`
            : `"${tarefa.title}" será excluída. Não dá para desfazer.`
        }
        rotuloConfirmar="Excluir"
        emAndamento={excluir.isPending}
        aoConfirmar={() => excluir.mutate(taskId, { onSuccess: aoFechar })}
        aoCancelar={() => setConfirmandoExclusao(false)}
      />
    </>
  );
}

/**
 * O formulario salva ao sair do campo. Sem este indicador, a pessoa nao tem
 * como saber se a mudanca pegou -- que era a queixa real de usabilidade.
 */
function IndicadorDeSalvamento({
  salvando,
  salvo,
}: {
  salvando: boolean;
  salvo: boolean;
}) {
  if (salvando) {
    return (
      <span className="ml-auto text-[10px] font-semibold text-texto-suave">
        Salvando...
      </span>
    );
  }
  if (salvo) {
    return (
      <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-verde">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Salvo
      </span>
    );
  }
  return null;
}
