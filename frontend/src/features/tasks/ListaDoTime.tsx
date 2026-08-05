import { useMemo, useState } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { useTime } from "../teams/hooks";
import type { TaskPriority, TaskStatus } from "./api";
import { useBoard } from "./hooks";
import { LinhaDeTarefa } from "./LinhaDeTarefa";
import { ORDEM_PRIORIDADE, ROTULO_PRIORIDADE } from "./prioridade";

const STATUS: { valor: TaskStatus; rotulo: string }[] = [
  { valor: "a_fazer", rotulo: "A fazer" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "bloqueado", rotulo: "Bloqueado" },
  { valor: "concluido", rotulo: "Concluído" },
];

/**
 * Mesma fonte de dados do board (useBoard) -- filtros sao recorte no cliente.
 * Com o volume de um time de 2-4 pessoas, filtrar no servidor seria complexidade
 * sem retorno; se o volume crescer, o recorte migra para query param sem mudar
 * esta tela.
 */
export function ListaDoTime({
  teamId,
  aoAbrirTarefa,
}: {
  teamId: string;
  aoAbrirTarefa: (taskId: string) => void;
}) {
  const { data: tarefas, isPending, error } = useBoard(teamId);
  const { data: time } = useTime(teamId);

  const [status, setStatus] = useState<TaskStatus | "">("");
  const [prioridade, setPrioridade] = useState<TaskPriority | "">("");
  const [responsavel, setResponsavel] = useState<string | "">("");

  const filtradas = useMemo(() => {
    return (tarefas ?? []).filter((t) => {
      if (status && t.status !== status) return false;
      if (prioridade && t.priority !== prioridade) return false;
      if (responsavel === "time" && !t.e_do_time) return false;
      if (responsavel && responsavel !== "time" && !t.responsaveis.some((r) => r.id === responsavel))
        return false;
      return true;
    });
  }, [tarefas, status, prioridade, responsavel]);

  if (isPending) return <p className="text-sm text-texto-suave">Carregando tarefas...</p>;
  if (error) return <Aviso erro={error} />;

  const estiloSelect =
    "rounded-lg border border-borda bg-superficie px-2 py-1.5 text-sm outline-none focus:border-marca";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
          aria-label="Filtrar por status"
          className={estiloSelect}
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>

        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as TaskPriority | "")}
          aria-label="Filtrar por prioridade"
          className={estiloSelect}
        >
          <option value="">Todas as prioridades</option>
          {ORDEM_PRIORIDADE.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PRIORIDADE[p]}
            </option>
          ))}
        </select>

        <select
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          aria-label="Filtrar por responsável"
          className={estiloSelect}
        >
          <option value="">Todos os responsáveis</option>
          <option value="time">Tarefas do time (sem dono)</option>
          {time?.membros.map((m) => (
            <option key={m.usuario.id} value={m.usuario.id}>
              {m.usuario.name}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-texto-suave">
          {filtradas.length} de {(tarefas ?? []).length}
        </span>
      </div>

      {filtradas.length > 0 ? (
        <div className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
          {filtradas.map((tarefa) => (
            <LinhaDeTarefa
              key={tarefa.id}
              tarefa={tarefa}
              aoAbrir={() => aoAbrirTarefa(tarefa.id)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-borda bg-superficie p-6 text-center text-sm text-texto-suave">
          Nenhuma tarefa com esses filtros.
        </p>
      )}
    </div>
  );
}
