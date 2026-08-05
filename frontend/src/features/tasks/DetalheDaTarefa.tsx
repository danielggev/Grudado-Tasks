import { useEffect, useState } from "react";

import { Avatar } from "../../app/Layout";
import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { Dialogo } from "../../components/ui/Dialogo";
import { Esqueleto } from "../../components/ui/Esqueleto";
import { useTime } from "../teams/hooks";
import type { TaskPriority } from "./api";
import { useAtualizarTarefa, useExcluirTarefa, useTarefa } from "./hooks";
import { PainelDeAtividade } from "./PainelDeAtividade";
import {
  COR_PRIORIDADE,
  COR_STATUS,
  ORDEM_PRIORIDADE,
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
  aoCriarSubtarefa: () => void;
}) {
  const { data: tarefa, isPending, error } = useTarefa(taskId);
  const { data: time } = useTime(tarefa?.team_id ?? "");

  const atualizar = useAtualizarTarefa(taskId, tarefa?.team_id ?? "");
  const excluir = useExcluirTarefa(tarefa?.team_id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

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
      atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId],
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

  const campo =
    "w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro";

  return (
    <>
      <Dialogo aberto titulo="Tarefa" aoFechar={aoFechar} largura="larga">
        <div className="flex flex-col gap-5">
          {/* Cabecalho de estado: status, prioridade e prazo de relance. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-superficie-2 px-2.5 py-1 text-[10px] font-black tracking-wide uppercase">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${COR_STATUS[tarefa.status]}`}
              />
              {ROTULO_STATUS[tarefa.status]}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide uppercase ${COR_PRIORIDADE[tarefa.priority]}`}
            >
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

          <label className="flex flex-col gap-1.5 text-sm">
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
                          ? responsaveis.filter((id) => id !== membro.usuario.id)
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
                <Botao onClick={aoCriarSubtarefa}>Adicionar</Botao>
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
            <Botao variante="perigo" onClick={() => setConfirmandoExclusao(true)}>
              Excluir tarefa
            </Botao>
          </div>
        </div>
      </Dialogo>

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
function IndicadorDeSalvamento({ salvando, salvo }: { salvando: boolean; salvo: boolean }) {
  if (salvando) {
    return (
      <span className="ml-auto text-[10px] font-semibold text-texto-suave">Salvando...</span>
    );
  }
  if (salvo) {
    return (
      <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-verde">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
