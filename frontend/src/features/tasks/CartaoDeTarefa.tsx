import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Avatar } from "../../app/Layout";
import type { TarefaResumo } from "./api";
import { BandeiraDePrioridade } from "./BandeiraDePrioridade";
import { FAIXA_PRIORIDADE } from "./prioridade";

const FORMATADOR_DE_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

function formataPrazo(prazo: string | null): string | null {
  if (!prazo) return null;
  // Data pura (YYYY-MM-DD): parsear como UTC evita que o fuso local jogue o
  // dia anterior, o que aconteceria interpretando a string como horario local.
  return FORMATADOR_DE_DATA.format(new Date(`${prazo}T00:00:00Z`));
}

function estaAtrasada(tarefa: TarefaResumo): boolean {
  if (!tarefa.due_date || tarefa.status === "concluido") return false;
  return tarefa.due_date < new Date().toISOString().slice(0, 10);
}

export function CartaoDeTarefa({
  tarefa,
  aoAbrir,
}: {
  tarefa: TarefaResumo;
  aoAbrir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tarefa.id });

  const prazoFormatado = formataPrazo(tarefa.due_date);
  const atrasada = estaAtrasada(tarefa);
  const concluida = tarefa.status === "concluido";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          aoAbrir();
        }
      }}
      className={`group relative cursor-grab touch-none overflow-hidden rounded-card border border-borda bg-superficie p-3 pl-4 text-left shadow-suave transition-all duration-200 active:cursor-grabbing ${
        isDragging
          ? "rotate-1 opacity-60 shadow-alta"
          : "hover:-translate-y-0.5 hover:shadow-media"
      }`}
    >
      {/* Faixa de prioridade: cor da marca legivel de relance, sem roubar
          largura do titulo. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${FAIXA_PRIORIDADE[tarefa.priority]}`}
      />

      <div className="flex items-start gap-1.5">
        <span className="mt-0.5">
          <BandeiraDePrioridade prioridade={tarefa.priority} />
        </span>
        <p
          className={`min-w-0 flex-1 text-sm leading-snug font-semibold ${
            concluida ? "text-texto-suave line-through" : "text-texto"
          }`}
        >
          {tarefa.title}
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {prazoFormatado && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              atrasada ? "bg-rosa/15 text-rosa" : "bg-superficie-2 text-texto-suave"
            }`}
          >
            <IconeRelogio />
            {atrasada ? "Atrasada" : prazoFormatado}
          </span>
        )}

        {tarefa.total_de_subtarefas > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-superficie-2 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
            <IconeLista />
            {tarefa.subtarefas_concluidas}/{tarefa.total_de_subtarefas}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center">
        {tarefa.e_do_time ? (
          <span className="rounded-full bg-amarelo/25 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
            Do time
          </span>
        ) : (
          <div className="flex -space-x-1.5">
            {tarefa.responsaveis.map((pessoa) => (
              <span
                key={pessoa.id}
                className="rounded-full ring-2 ring-superficie"
              >
                <Avatar nome={pessoa.name} tamanho="xs" />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IconeRelogio() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconeLista() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
