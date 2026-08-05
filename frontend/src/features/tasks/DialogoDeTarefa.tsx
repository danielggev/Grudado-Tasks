import { useState, type FormEvent } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import { useTime } from "../teams/hooks";
import type { TaskPriority } from "./api";
import { useCriarTarefa } from "./hooks";
import { ORDEM_PRIORIDADE, ROTULO_PRIORIDADE } from "./prioridade";

/**
 * Criacao de tarefa. Responsavel e opcional de proposito -- deixar a lista
 * vazia e o caminho normal para "tarefa do time", nao um estado de erro.
 */
export function DialogoDeTarefa({
  teamId,
  parentId,
  aberto,
  aoFechar,
}: {
  teamId: string;
  /** Presente quando o dialogo cria uma subtarefa. */
  parentId?: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);

  const { data: time } = useTime(teamId);
  const criar = useCriarTarefa(teamId);

  function alterna(userId: string) {
    setResponsaveis((atual) =>
      atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId],
    );
  }

  function limpa() {
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDueDate("");
    setResponsaveis([]);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    criar.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        team_id: teamId,
        parent_id: parentId ?? null,
        priority,
        due_date: dueDate || null,
        responsaveis,
      },
      {
        onSuccess: () => {
          limpa();
          aoFechar();
        },
      },
    );
  }

  return (
    <Dialogo
      aberto={aberto}
      titulo={parentId ? "Nova subtarefa" : "Nova tarefa"}
      aoFechar={aoFechar}
    >
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={300}
            autoFocus
            className="rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Descrição</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Opcional"
            className="resize-y rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Prioridade</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
            >
              {ORDEM_PRIORIDADE.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PRIORIDADE[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Prazo</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
            />
            <span className="text-xs text-texto-suave">
              Opcional agora — obrigatório ao começar a tarefa.
            </span>
          </label>
        </div>

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
                  onChange={() => alterna(membro.usuario.id)}
                  className="accent-marca"
                />
                {membro.usuario.name}
              </label>
            ))}
          </div>
        </fieldset>

        <Aviso erro={criar.error} />

        <div className="flex justify-end gap-2">
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" variante="primario" disabled={criar.isPending}>
            {criar.isPending ? "Criando..." : "Criar"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
