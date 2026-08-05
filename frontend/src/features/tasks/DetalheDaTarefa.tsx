import { useEffect, useState } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import { useTime } from "../teams/hooks";
import type { TaskPriority } from "./api";
import { useAtualizarTarefa, useExcluirTarefa, useTarefa } from "./hooks";
import { PainelDeAtividade } from "./PainelDeAtividade";
import { ORDEM_PRIORIDADE, ROTULO_PRIORIDADE } from "./prioridade";

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
      <Dialogo aberto titulo="Tarefa" aoFechar={aoFechar}>
        <p className="text-sm text-texto-suave">Carregando...</p>
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

  return (
    <Dialogo aberto titulo="Tarefa" aoFechar={aoFechar}>
      <div className="flex flex-col gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={salva}
          minLength={2}
          maxLength={300}
          aria-label="Título"
          className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm font-medium outline-none focus:border-marca"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={salva}
          rows={3}
          placeholder="Sem descrição"
          aria-label="Descrição"
          className="resize-y rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Prioridade</span>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as TaskPriority);
              atualizar.mutate({ priority: e.target.value as TaskPriority });
            }}
            className="rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
          >
            {ORDEM_PRIORIDADE.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PRIORIDADE[p]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="font-medium">Responsáveis</legend>
          <p className="text-xs text-texto-suave">
            Nenhum selecionado = tarefa do time inteiro.
          </p>
          <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-borda p-2">
            {time?.membros.map((membro) => (
              <label
                key={membro.usuario.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-superficie-2"
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
                  className="accent-marca"
                />
                {membro.usuario.name}
              </label>
            ))}
          </div>
        </fieldset>

        {tarefa.parent_id === null && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Subtarefas ({tarefa.subtarefas.length})
              </h3>
              <Botao onClick={aoCriarSubtarefa}>Adicionar</Botao>
            </div>
            {tarefa.subtarefas.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-borda">
                {tarefa.subtarefas.map((sub) => (
                  <li key={sub.id}>
                    <button
                      type="button"
                      onClick={() => aoAbrirSubtarefa(sub.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-superficie-2"
                    >
                      {sub.status === "concluido" ? "✅" : "⬜"} {sub.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Atividade</h3>
          <PainelDeAtividade taskId={taskId} />
        </section>

        <Aviso erro={atualizar.error} />

        <div className="flex justify-end">
          <Botao
            variante="perigo"
            disabled={excluir.isPending}
            onClick={() => {
              if (confirm("Excluir esta tarefa? Isso remove as subtarefas junto.")) {
                excluir.mutate(taskId, { onSuccess: aoFechar });
              }
            }}
          >
            Excluir tarefa
          </Botao>
        </div>
      </div>
    </Dialogo>
  );
}
