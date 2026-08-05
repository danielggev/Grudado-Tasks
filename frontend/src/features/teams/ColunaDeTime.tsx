import { Link } from "react-router-dom";

import { Avatar } from "../../app/Layout";
import { Botao } from "../../components/ui/Botao";
import type { TarefaResumo } from "../tasks/api";
import { COR_PRIORIDADE, COR_STATUS, ROTULO_PRIORIDADE } from "../tasks/prioridade";
import type { TimeResumo } from "./api";
import { sotaqueDe } from "./sotaque";

const FORMATADOR = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

/**
 * Um time como coluna, com as tarefas dele empilhadas dentro.
 *
 * Diferente do board, aqui nao ha arrastar: tarefa pertence a um time e mover
 * entre times nao e uma operacao que o produto suporta. A coluna e para
 * enxergar, e o clique leva para onde se age.
 */
export function ColunaDeTime({
  time,
  tarefas,
  aoAbrirTarefa,
  aoCriarTarefa,
}: {
  time: TimeResumo;
  tarefas: TarefaResumo[];
  aoAbrirTarefa: (taskId: string) => void;
  aoCriarTarefa: () => void;
}) {
  const arquivado = time.archived_at !== null;
  const abertas = tarefas.filter((t) => t.status !== "concluido");
  const concluidas = tarefas.length - abertas.length;

  // Concluidas ficam no fim: o que importa e o que esta em aberto.
  const ordenadas = [...abertas, ...tarefas.filter((t) => t.status === "concluido")];

  return (
    <section
      className={`flex w-80 shrink-0 flex-col overflow-hidden rounded-card border border-borda bg-superficie shadow-suave ${
        arquivado ? "opacity-60" : ""
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 shrink-0 ${sotaqueDe(time.id)}`} />

      <header className="flex items-start gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <Link
            to={`/times/${time.id}`}
            className="text-sm font-black text-texto hover:underline"
          >
            {time.name}
          </Link>
          <p className="mt-0.5 text-[11px] text-texto-suave">
            {time.total_de_membros} {time.total_de_membros === 1 ? "pessoa" : "pessoas"}
            {abertas.length > 0 && ` · ${abertas.length} em aberto`}
            {concluidas > 0 && ` · ${concluidas} concluída${concluidas > 1 ? "s" : ""}`}
          </p>
        </div>

        {arquivado && (
          <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
            arquivado
          </span>
        )}
      </header>

      <div className="flex max-h-[26rem] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
        {ordenadas.length > 0 ? (
          ordenadas.map((tarefa) => (
            <MiniCartao
              key={tarefa.id}
              tarefa={tarefa}
              aoAbrir={() => aoAbrirTarefa(tarefa.id)}
            />
          ))
        ) : (
          <p className="px-2 py-6 text-center text-xs text-texto-suave">
            Nenhuma tarefa ainda.
          </p>
        )}
      </div>

      {!arquivado && (
        <footer className="border-t border-borda p-2">
          <Botao variante="fantasma" onClick={aoCriarTarefa} className="w-full">
            + Nova tarefa
          </Botao>
        </footer>
      )}
    </section>
  );
}

function MiniCartao({ tarefa, aoAbrir }: { tarefa: TarefaResumo; aoAbrir: () => void }) {
  const concluida = tarefa.status === "concluido";
  const atrasada =
    !concluida &&
    tarefa.due_date !== null &&
    tarefa.due_date < new Date().toISOString().slice(0, 10);

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-left transition hover:border-azul-claro/50 hover:bg-superficie-2"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${COR_STATUS[tarefa.status]}`}
        />
        <span
          className={`min-w-0 flex-1 text-xs leading-snug font-semibold ${
            concluida ? "text-texto-suave line-through" : "text-texto"
          }`}
        >
          {tarefa.title}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-3.5">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-wide uppercase ${COR_PRIORIDADE[tarefa.priority]}`}
        >
          {ROTULO_PRIORIDADE[tarefa.priority]}
        </span>

        {tarefa.due_date && (
          <span
            className={`text-[10px] font-semibold ${atrasada ? "text-rosa" : "text-texto-suave"}`}
          >
            {atrasada
              ? "Atrasada"
              : FORMATADOR.format(new Date(`${tarefa.due_date}T00:00:00Z`))}
          </span>
        )}

        {tarefa.total_de_subtarefas > 0 && (
          <span className="text-[10px] font-semibold text-texto-suave">
            {tarefa.subtarefas_concluidas}/{tarefa.total_de_subtarefas}
          </span>
        )}

        <span className="ml-auto flex -space-x-1">
          {tarefa.e_do_time ? (
            <span className="text-[9px] font-semibold text-texto-suave">Do time</span>
          ) : (
            tarefa.responsaveis
              .slice(0, 3)
              .map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-superficie">
                  <Avatar nome={p.name} tamanho="xs" />
                </span>
              ))
          )}
        </span>
      </div>
    </button>
  );
}
