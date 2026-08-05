import { useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../app/Layout";
import { Botao } from "../../components/ui/Botao";
import type { TarefaResumo, TaskStatus } from "../tasks/api";
import { BandeiraDePrioridade } from "../tasks/BandeiraDePrioridade";
import { FiltroDeStatus } from "../tasks/FiltroDeStatus";
import { ROTULO_STATUS, SELO_STATUS } from "../tasks/prioridade";
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
  const [filtro, setFiltro] = useState<TaskStatus | null>(null);

  const arquivado = time.archived_at !== null;
  const abertas = tarefas.filter((t) => t.status !== "concluido");
  const concluidas = tarefas.length - abertas.length;

  // Concluidas ficam no fim: o que importa e o que esta em aberto.
  const ordenadas = [...abertas, ...tarefas.filter((t) => t.status === "concluido")];

  // O filtro age no status da propria tarefa de topo. As subtarefas dela
  // continuam aninhadas, independente do status delas -- separa-las da mae
  // desfaria a hierarquia que o cartao existe para mostrar.
  const visiveis = filtro ? ordenadas.filter((t) => t.status === filtro) : ordenadas;

  return (
    <section
      // Sem `overflow-hidden`: ele cortaria o menu do filtro. O arredondamento
      // do topo fica no proprio invólucro da faixa.
      className={`flex w-80 shrink-0 flex-col rounded-card border border-borda bg-superficie shadow-suave ${
        arquivado ? "opacity-60" : ""
      }`}
    >
      <div className="overflow-hidden rounded-t-card">
        <span aria-hidden="true" className={`block h-1.5 ${sotaqueDe(time.id)}`} />
      </div>

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
            {filtro
              ? ` · ${visiveis.length} ${ROTULO_STATUS[filtro].toLowerCase()}`
              : (abertas.length > 0 ? ` · ${abertas.length} em aberto` : "") +
                (concluidas > 0
                  ? ` · ${concluidas} concluída${concluidas > 1 ? "s" : ""}`
                  : "")}
          </p>
        </div>

        {arquivado && (
          <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
            arquivado
          </span>
        )}

        <FiltroDeStatus valor={filtro} aoMudar={setFiltro} />
      </header>

      <div className="flex max-h-[26rem] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
        {visiveis.length > 0 ? (
          visiveis.map((tarefa) => (
            <ItemComSubtarefas
              key={tarefa.id}
              tarefa={tarefa}
              aoAbrirTarefa={aoAbrirTarefa}
            />
          ))
        ) : (
          <p className="px-2 py-6 text-center text-xs text-texto-suave">
            {filtro
              ? `Nada em "${ROTULO_STATUS[filtro]}".`
              : "Nenhuma tarefa ainda."}
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
      className="w-full rounded-xl border border-borda bg-superficie px-3 py-2.5 text-left transition hover:border-azul-claro/50 hover:bg-superficie-2"
    >
      <div className="flex items-start gap-2">
        <span className="mt-px">
          <BandeiraDePrioridade prioridade={tarefa.priority} tamanho={13} />
        </span>
        <span
          className={`min-w-0 flex-1 text-xs leading-snug font-semibold ${
            concluida ? "text-texto-suave line-through" : "text-texto"
          }`}
        >
          {tarefa.title}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[21px]">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SELO_STATUS[tarefa.status]}`}
        >
          {ROTULO_STATUS[tarefa.status]}
        </span>

        <span
          className={`flex items-center gap-1 text-[10px] font-semibold ${
            atrasada ? "text-rosa" : "text-texto-suave"
          }`}
        >
          <IconeCalendario />
          {tarefa.due_date
            ? atrasada
              ? "Atrasada"
              : FORMATADOR.format(new Date(`${tarefa.due_date}T00:00:00Z`))
            : "Sem prazo"}
        </span>

        <span className="ml-auto flex items-center">
          {tarefa.e_do_time ? (
            <span className="rounded-full bg-amarelo/25 px-1.5 py-0.5 text-[9px] font-semibold text-texto-suave">
              Do time
            </span>
          ) : (
            <span className="flex -space-x-1">
              {tarefa.responsaveis.slice(0, 3).map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-superficie">
                  <Avatar nome={p.name} tamanho="xs" />
                </span>
              ))}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

/** Tarefa com as subtarefas presas a ela, como no board. */
function ItemComSubtarefas({
  tarefa,
  aoAbrirTarefa,
}: {
  tarefa: TarefaResumo;
  aoAbrirTarefa: (taskId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <MiniCartao tarefa={tarefa} aoAbrir={() => aoAbrirTarefa(tarefa.id)} />

      {tarefa.subtarefas.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-200 ${aberto ? "rotate-90" : ""}`}
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {tarefa.subtarefas.length}{" "}
            {tarefa.subtarefas.length === 1 ? "subtarefa" : "subtarefas"}
            <span className="ml-auto">
              {tarefa.subtarefas_concluidas}/{tarefa.total_de_subtarefas}
            </span>
          </button>

          {aberto && (
            <ul className="mt-1 flex flex-col gap-1 border-l-2 border-borda pl-2">
              {tarefa.subtarefas.map((sub) => (
                <li key={sub.id}>
                  <MiniCartao tarefa={sub} aoAbrir={() => aoAbrirTarefa(sub.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function IconeCalendario() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
