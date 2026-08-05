import { useState } from "react";

import { Botao } from "../../components/ui/Botao";
import { Board } from "./Board";
import { DetalheDaTarefa } from "./DetalheDaTarefa";
import { DialogoDeTarefa } from "./DialogoDeTarefa";
import { ListaDoTime } from "./ListaDoTime";

type Visao = "board" | "lista";

export function BoardDoTime({ teamId }: { teamId: string }) {
  const [visao, setVisao] = useState<Visao>("board");
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState<{ parentId?: string } | null>(null);

  const abaAtiva = "bg-superficie text-texto shadow-sm";
  const abaInativa = "text-texto-suave hover:text-texto";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-texto">Tarefas</h2>

        <div
          role="tablist"
          aria-label="Visualização das tarefas"
          className="flex rounded-lg bg-superficie-2 p-0.5"
        >
          {(
            [
              ["board", "Board"],
              ["lista", "Lista"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={visao === valor}
              onClick={() => setVisao(valor)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                visao === valor ? abaAtiva : abaInativa
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Botao variante="primario" onClick={() => setCriando({})}>
            Nova tarefa
          </Botao>
        </div>
      </div>

      {visao === "board" ? (
        <Board teamId={teamId} aoAbrirTarefa={setTarefaAberta} />
      ) : (
        <ListaDoTime teamId={teamId} aoAbrirTarefa={setTarefaAberta} />
      )}

      {tarefaAberta && (
        <DetalheDaTarefa
          taskId={tarefaAberta}
          aoFechar={() => setTarefaAberta(null)}
          aoAbrirSubtarefa={setTarefaAberta}
          aoCriarSubtarefa={() => setCriando({ parentId: tarefaAberta })}
        />
      )}

      {criando && (
        <DialogoDeTarefa
          teamId={teamId}
          parentId={criando.parentId}
          aberto
          aoFechar={() => setCriando(null)}
        />
      )}
    </div>
  );
}
