import type { TarefaResumo } from "./api";
import { COR_PRIORIDADE, ROTULO_PRIORIDADE } from "./prioridade";

const FORMATADOR = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

const ROTULO_STATUS: Record<TarefaResumo["status"], string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
};

function prazo(tarefa: TarefaResumo): { texto: string; atrasada: boolean } | null {
  if (!tarefa.due_date) return null;
  const atrasada =
    tarefa.status !== "concluido" &&
    tarefa.due_date < new Date().toISOString().slice(0, 10);
  return {
    texto: FORMATADOR.format(new Date(`${tarefa.due_date}T00:00:00Z`)),
    atrasada,
  };
}

/** Linha compartilhada entre "Minhas Tarefas" e a visao de lista do time. */
export function LinhaDeTarefa({
  tarefa,
  mostraTime,
  nomeDoTime,
  aoAbrir,
}: {
  tarefa: TarefaResumo;
  /** Em "Minhas Tarefas" ha tarefas de varios times; na lista do time, nao. */
  mostraTime?: boolean;
  nomeDoTime?: string;
  aoAbrir: () => void;
}) {
  const p = prazo(tarefa);

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left transition hover:bg-superficie-2"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-texto">
        {tarefa.title}
      </span>

      {mostraTime && nomeDoTime && (
        <span className="rounded bg-superficie-2 px-1.5 py-0.5 text-xs text-texto-suave">
          {nomeDoTime}
        </span>
      )}

      <span className="w-28 shrink-0 text-xs text-texto-suave">
        {ROTULO_STATUS[tarefa.status]}
      </span>

      <span
        className={`w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-xs font-medium ${COR_PRIORIDADE[tarefa.priority]}`}
      >
        {ROTULO_PRIORIDADE[tarefa.priority]}
      </span>

      <span
        className={`w-20 shrink-0 text-right text-xs ${
          p?.atrasada ? "font-medium text-urgente" : "text-texto-suave"
        }`}
      >
        {p ? (p.atrasada ? "Atrasada" : p.texto) : "Sem prazo"}
      </span>
    </button>
  );
}
