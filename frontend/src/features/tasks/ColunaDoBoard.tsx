import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { CartaoDeTarefa } from "./CartaoDeTarefa";
import type { TarefaResumo, TaskStatus } from "./api";

const TITULO: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
};

export function ColunaDoBoard({
  status,
  tarefas,
  aoAbrirTarefa,
}: {
  status: TaskStatus;
  tarefas: TarefaResumo[];
  aoAbrirTarefa: (taskId: string) => void;
}) {
  // A coluna inteira e uma zona de soltar, nao so cada card: e o que permite
  // largar numa coluna vazia, que nao tem nenhum card para servir de alvo.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-superficie-2 p-2">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <h3 className="text-sm font-semibold text-texto">{TITULO[status]}</h3>
        <span className="text-xs text-texto-suave">{tarefas.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-1 transition ${
          isOver ? "bg-marca-suave" : ""
        }`}
      >
        <SortableContext
          items={tarefas.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tarefas.map((tarefa) => (
            <CartaoDeTarefa
              key={tarefa.id}
              tarefa={tarefa}
              aoAbrir={() => aoAbrirTarefa(tarefa.id)}
            />
          ))}
        </SortableContext>

        {tarefas.length === 0 && (
          <p className="p-2 text-center text-xs text-texto-suave">Nenhuma tarefa</p>
        )}
      </div>
    </div>
  );
}
