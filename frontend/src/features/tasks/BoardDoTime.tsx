import { useState } from "react";

import { Botao } from "../../components/ui/Botao";
import { Board } from "./Board";
import { DetalheDaTarefa } from "./DetalheDaTarefa";
import { DialogoDeTarefa } from "./DialogoDeTarefa";

export function BoardDoTime({ teamId }: { teamId: string }) {
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState<{ parentId?: string } | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texto">Tarefas</h2>
        <Botao variante="primario" onClick={() => setCriando({})}>
          Nova tarefa
        </Botao>
      </div>

      <Board teamId={teamId} aoAbrirTarefa={setTarefaAberta} />

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
