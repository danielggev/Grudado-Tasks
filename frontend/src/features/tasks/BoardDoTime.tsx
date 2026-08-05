import { useState } from "react";

import { Botao } from "../../components/ui/Botao";
import { Board } from "./Board";
import { DetalheDaTarefa } from "./DetalheDaTarefa";
import { DialogoDeTarefa } from "./DialogoDeTarefa";
import { useSincronizacaoDoTime } from "./hooks";
import { ListaDoTime } from "./ListaDoTime";

type Visao = "board" | "lista";

const VISOES: [Visao, string][] = [
  ["board", "Board"],
  ["lista", "Lista"],
];

export function BoardDoTime({ teamId }: { teamId: string }) {
  // Board e lista compartilham a query, entao uma assinatura so cobre as duas.
  useSincronizacaoDoTime(teamId);

  const [visao, setVisao] = useState<Visao>("board");
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState<{ teamId: string; parentId?: string } | null>(
    null,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xs font-black tracking-wide text-texto-suave uppercase">
          Tarefas
        </h2>

        <div
          role="tablist"
          aria-label="Visualização das tarefas"
          className="flex rounded-full bg-superficie-2 p-1"
        >
          {VISOES.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={visao === valor}
              onClick={() => setVisao(valor)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-200 ${
                visao === valor
                  ? "bg-superficie text-texto shadow-suave"
                  : "text-texto-suave hover:text-texto"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Botao variante="primario" onClick={() => setCriando({ teamId })}>
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
          aoCriarSubtarefa={setCriando}
        />
      )}

      {criando && (
        <DialogoDeTarefa
          teamId={criando.teamId}
          parentId={criando.parentId}
          aberto
          aoFechar={() => setCriando(null)}
        />
      )}
    </div>
  );
}
