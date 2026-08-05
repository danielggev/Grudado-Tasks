import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { TarefaResumo } from "./api";
import { COR_PRIORIDADE, ROTULO_PRIORIDADE } from "./prioridade";

const FORMATADOR_DE_DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function formataPrazo(prazo: string | null): string | null {
  if (!prazo) return null;
  // Data pura (YYYY-MM-DD): parsear como UTC evita que o fuso local jogue o
  // dia anterior, o que aconteceria interpretando a string como horario local.
  return FORMATADOR_DE_DATA.format(new Date(`${prazo}T00:00:00Z`));
}

function estaAtrasada(prazo: string | null): boolean {
  if (!prazo) return false;
  return prazo < new Date().toISOString().slice(0, 10);
}

export function CartaoDeTarefa({
  tarefa,
  aoAbrir,
}: {
  tarefa: TarefaResumo;
  aoAbrir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarefa.id,
  });

  const prazoFormatado = formataPrazo(tarefa.due_date);
  const atrasada = estaAtrasada(tarefa.due_date);

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
        if (e.key === "Enter" || e.key === " ") aoAbrir();
      }}
      className={`cursor-grab touch-none rounded-lg border border-borda bg-superficie p-3 text-left shadow-sm transition active:cursor-grabbing ${
        isDragging ? "opacity-50" : "hover:border-marca/40"
      }`}
    >
      <p className="text-sm font-medium text-texto">{tarefa.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${COR_PRIORIDADE[tarefa.priority]}`}
        >
          {ROTULO_PRIORIDADE[tarefa.priority]}
        </span>

        {prazoFormatado && (
          <span
            className={`rounded px-1.5 py-0.5 text-xs ${
              atrasada
                ? "bg-urgente/10 text-urgente"
                : "bg-superficie-2 text-texto-suave"
            }`}
          >
            {atrasada ? "Atrasada" : prazoFormatado}
          </span>
        )}

        {tarefa.total_de_subtarefas > 0 && (
          <span className="rounded bg-superficie-2 px-1.5 py-0.5 text-xs text-texto-suave">
            {tarefa.subtarefas_concluidas}/{tarefa.total_de_subtarefas}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1">
        {tarefa.e_do_time ? (
          <span className="text-xs text-texto-suave">Tarefa do time</span>
        ) : (
          <div className="flex -space-x-1.5">
            {tarefa.responsaveis.map((pessoa) => (
              <span
                key={pessoa.id}
                title={pessoa.name}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-superficie bg-marca-suave text-[10px] font-medium text-marca"
              >
                {pessoa.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
