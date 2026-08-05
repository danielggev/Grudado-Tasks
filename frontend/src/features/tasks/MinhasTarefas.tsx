import { useMemo, useState } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { useTimes } from "../teams/hooks";
import { DetalheDaTarefa } from "./DetalheDaTarefa";
import { DialogoDeTarefa } from "./DialogoDeTarefa";
import { useMinhasTarefas } from "./hooks";
import { LinhaDeTarefa } from "./LinhaDeTarefa";

/**
 * A tela que cada pessoa abre de manha: tudo o que e dela -- designado a ela
 * ou do time inteiro sem dono -- fora o concluido, ordenado pelo backend por
 * prazo, prioridade e posicao.
 */
export function MinhasTarefas() {
  const { data: tarefas, isPending, error } = useMinhasTarefas();
  const { data: times } = useTimes();
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criandoSubtarefaDe, setCriandoSubtarefaDe] = useState<string | null>(null);

  const nomePorTime = useMemo(
    () => new Map((times ?? []).map((t) => [t.id, t.name])),
    [times],
  );
  const teamIdDaAberta = useMemo(
    () => (tarefas ?? []).find((t) => t.id === tarefaAberta)?.team_id,
    [tarefas, tarefaAberta],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-lg font-semibold text-texto">Minhas tarefas</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Tarefas designadas a você e as do seu time que ainda não têm responsável.
      </p>

      <div className="mt-4">
        <Aviso erro={error} />
      </div>

      {isPending ? (
        <p className="mt-6 text-sm text-texto-suave">Carregando...</p>
      ) : tarefas && tarefas.length > 0 ? (
        <div className="mt-6 divide-y divide-borda rounded-xl border border-borda bg-superficie">
          {tarefas.map((tarefa) => (
            <LinhaDeTarefa
              key={tarefa.id}
              tarefa={tarefa}
              mostraTime
              nomeDoTime={nomePorTime.get(tarefa.team_id)}
              aoAbrir={() => setTarefaAberta(tarefa.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-borda bg-superficie p-8 text-center text-sm text-texto-suave">
          Nada pendente. Bom trabalho!
        </div>
      )}

      {tarefaAberta && (
        <DetalheDaTarefa
          taskId={tarefaAberta}
          aoFechar={() => setTarefaAberta(null)}
          aoAbrirSubtarefa={setTarefaAberta}
          aoCriarSubtarefa={() => setCriandoSubtarefaDe(tarefaAberta)}
        />
      )}

      {criandoSubtarefaDe && teamIdDaAberta && (
        <DialogoDeTarefa
          teamId={teamIdDaAberta}
          parentId={criandoSubtarefaDe}
          aberto
          aoFechar={() => setCriandoSubtarefaDe(null)}
        />
      )}
    </div>
  );
}
