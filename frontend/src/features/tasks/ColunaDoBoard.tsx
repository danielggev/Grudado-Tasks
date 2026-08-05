import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { CartaoDeTarefa } from "./CartaoDeTarefa";
import type { TarefaResumo, TaskStatus } from "./api";
import { COR_STATUS, ROTULO_STATUS } from "./prioridade";

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
    <section className="flex w-76 shrink-0 flex-col rounded-card bg-superficie-2 p-2">
      <header className="flex items-center gap-2 px-2 py-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${COR_STATUS[status]}`}
        />
        <h3 className="text-xs font-black tracking-wide text-texto uppercase">
          {ROTULO_STATUS[status]}
        </h3>
        <span className="ml-auto rounded-full bg-superficie px-2 py-0.5 text-[10px] font-black text-texto-suave">
          {tarefas.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-28 flex-1 flex-col gap-2 rounded-xl p-1 transition-colors duration-200 ${
          isOver ? "bg-azul-claro/10 ring-2 ring-azul-claro/40 ring-inset" : ""
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
          <p className="px-2 py-6 text-center text-xs text-texto-suave">
            {isOver ? "Solte aqui" : "Vazio"}
          </p>
        )}
      </div>
    </section>
  );
}
