import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { ApiError } from "../../lib/api-client";
import type { TaskStatus } from "./api";
import { ColunaDoBoard } from "./ColunaDoBoard";
import { erroDePrazoObrigatorio, useBoard, useMoverTarefa } from "./hooks";
import { PainelDePrazo } from "./PainelDePrazo";

const COLUNAS: TaskStatus[] = ["a_fazer", "em_andamento", "bloqueado", "concluido"];

export function Board({
  teamId,
  aoAbrirTarefa,
}: {
  teamId: string;
  aoAbrirTarefa: (taskId: string) => void;
}) {
  const { data: tarefas, isPending, error } = useBoard(teamId);
  const mover = useMoverTarefa(teamId);

  // Quando o backend recusa por falta de prazo, a tarefa fica pendente aqui
  // ate o usuario informar a data ou desistir -- o card ja "voltou" ao lugar
  // por causa do rollback otimista, entao nao ha estado visual inconsistente
  // enquanto o painel espera resposta.
  const [pendenteDePrazo, setPendenteDePrazo] = useState<{
    taskId: string;
    status: TaskStatus;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  if (isPending) return <p className="text-sm text-texto-suave">Carregando tarefas...</p>;
  if (error) return <Aviso erro={error} />;

  const porStatus = (status: TaskStatus) => (tarefas ?? []).filter((t) => t.status === status);

  function moveComTratamentoDePrazo(taskId: string, status: TaskStatus, apos?: string) {
    mover.mutate(
      { taskId, dados: { status, apos: apos ?? null } },
      {
        onError: (erro: unknown) => {
          if (erroDePrazoObrigatorio(erro)) setPendenteDePrazo({ taskId, status });
        },
      },
    );
  }

  function aoTerminarArrasto(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return;

    const tarefaArrastada = (tarefas ?? []).find((t) => t.id === active.id);
    if (!tarefaArrastada) return;

    // O alvo tanto pode ser outra tarefa (soltou entre cards) quanto uma
    // coluna vazia (soltou no espaco livre, id = o proprio status).
    const alvoEhColuna = COLUNAS.includes(over.id as TaskStatus);
    const statusDestino = alvoEhColuna
      ? (over.id as TaskStatus)
      : (tarefas ?? []).find((t) => t.id === over.id)?.status;

    if (!statusDestino) return;
    if (statusDestino === tarefaArrastada.status && active.id === over.id) return;

    const apos = alvoEhColuna ? undefined : (over.id as string);
    moveComTratamentoDePrazo(active.id as string, statusDestino, apos);
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={aoTerminarArrasto}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUNAS.map((status) => (
            <ColunaDoBoard
              key={status}
              status={status}
              tarefas={porStatus(status)}
              aoAbrirTarefa={aoAbrirTarefa}
            />
          ))}
        </div>
      </DndContext>

      {pendenteDePrazo && (
        <PainelDePrazo
          onDefinir={(due_date) => {
            mover.mutate(
              {
                taskId: pendenteDePrazo.taskId,
                dados: { status: pendenteDePrazo.status, due_date, apos: null },
              },
              { onSuccess: () => setPendenteDePrazo(null) },
            );
          }}
          onCancelar={() => setPendenteDePrazo(null)}
          erro={mover.error instanceof ApiError ? mover.error : null}
        />
      )}
    </>
  );
}
