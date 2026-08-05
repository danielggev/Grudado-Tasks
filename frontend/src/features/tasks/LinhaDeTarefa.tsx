import { Avatar } from "../../app/Layout";
import type { TarefaResumo } from "./api";
import { COR_PRIORIDADE, COR_STATUS, ROTULO_PRIORIDADE, ROTULO_STATUS } from "./prioridade";

const FORMATADOR = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

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
  const concluida = tarefa.status === "concluido";

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="group flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-superficie-2"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${COR_STATUS[tarefa.status]}`}
      />

      <span
        className={`min-w-0 flex-1 truncate text-sm font-semibold ${
          concluida ? "text-texto-suave line-through" : "text-texto"
        }`}
      >
        {tarefa.title}
      </span>

      {mostraTime && nomeDoTime && (
        <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[10px] font-semibold text-texto-suave group-hover:bg-superficie">
          {nomeDoTime}
        </span>
      )}

      {tarefa.e_do_time ? (
        <span className="w-16 shrink-0 text-center text-[10px] font-semibold text-texto-suave">
          Do time
        </span>
      ) : (
        <span className="flex w-16 shrink-0 justify-center -space-x-1.5">
          {tarefa.responsaveis.slice(0, 3).map((pessoa) => (
            <span key={pessoa.id} className="rounded-full ring-2 ring-superficie">
              <Avatar nome={pessoa.name} tamanho="xs" />
            </span>
          ))}
        </span>
      )}

      <span className="hidden w-24 shrink-0 text-xs text-texto-suave sm:inline">
        {ROTULO_STATUS[tarefa.status]}
      </span>

      <span
        className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-black tracking-wide uppercase ${COR_PRIORIDADE[tarefa.priority]}`}
      >
        {ROTULO_PRIORIDADE[tarefa.priority]}
      </span>

      <span
        className={`w-20 shrink-0 text-right text-xs font-semibold ${
          p?.atrasada ? "text-rosa" : "text-texto-suave"
        }`}
      >
        {p ? (p.atrasada ? "Atrasada" : p.texto) : "Sem prazo"}
      </span>
    </button>
  );
}
