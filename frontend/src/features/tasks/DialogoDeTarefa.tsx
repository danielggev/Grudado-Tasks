import { useState, type FormEvent } from "react";

import { Avatar } from "../../app/Layout";
import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import { useTime, useTimes } from "../teams/hooks";
import type { TaskPriority } from "./api";
import { useCriarTarefa } from "./hooks";
import { ORDEM_PRIORIDADE, ROTULO_PRIORIDADE } from "./prioridade";

const CAMPO =
  "w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro";
const ROTULO = "text-xs font-black tracking-wide text-texto-suave uppercase";

/**
 * Criacao de tarefa. Responsavel e opcional de proposito -- deixar a lista
 * vazia e o caminho normal para "tarefa do time", nao um estado de erro.
 */
export function DialogoDeTarefa({
  teamId: teamIdFixo,
  parentId,
  aberto,
  aoFechar,
}: {
  /** Ausente em "minhas tarefas": ali nao ha time no contexto, entao o
      formulario pergunta em qual criar. */
  teamId?: string;
  /** Presente quando o dialogo cria uma subtarefa. */
  parentId?: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { data: times } = useTimes();
  const [timeEscolhido, setTimeEscolhido] = useState("");

  // Com um time so, nao ha escolha a fazer -- selecionar sozinho poupa um
  // clique sem esconder informacao.
  const teamId =
    teamIdFixo ?? (timeEscolhido || (times?.length === 1 ? times[0].id : ""));

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
        {!teamIdFixo && (
          <label className="flex flex-col gap-1.5">
            <span className={ROTULO}>Time</span>
            <select
              value={teamId}
              onChange={(e) => setTimeEscolhido(e.target.value)}
              required
              className={CAMPO}
            >
              <option value="">Escolha o time...</option>
              {(times ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={ROTULO}>Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={300}
            autoFocus
            placeholder="O que precisa ser feito?"
            className={`${CAMPO} font-semibold`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ROTULO}>Descrição</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Opcional"
            className={`${CAMPO} resize-y`}
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={ROTULO}>Prioridade</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={CAMPO}
            >
              {ORDEM_PRIORIDADE.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PRIORIDADE[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className={ROTULO}>Prazo</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={CAMPO}
            />
            <span className="text-[11px] text-texto-suave">
              Opcional agora — cobrado ao começar.
            </span>
          </label>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className={ROTULO}>Responsáveis</legend>
          <p className="text-[11px] text-texto-suave">
            Ninguém marcado = tarefa do time inteiro.
          </p>
          <div className="mt-1 flex flex-col gap-0.5 rounded-xl border border-borda p-2">
            {time?.membros.map((membro) => (
              <label
                key={membro.usuario.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-superficie-2"
              >
                <input
                  type="checkbox"
                  checked={responsaveis.includes(membro.usuario.id)}
                  onChange={() => alterna(membro.usuario.id)}
                  className="accent-rosa"
                />
                <Avatar nome={membro.usuario.name} tamanho="xs" />
                <span className="font-semibold">{membro.usuario.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Aviso erro={criar.error} />

        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={criar.isPending || !teamId}>
            {criar.isPending ? "Criando..." : "Criar tarefa"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
