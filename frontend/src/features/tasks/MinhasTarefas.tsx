import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { EstadoVazio } from "../../components/ui/EstadoVazio";
import { EsqueletoDeLinha } from "../../components/ui/Esqueleto";
import { useUsuarioAtual } from "../auth/hooks";
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
  const { data: usuario } = useUsuarioAtual();
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

  const atrasadas = (tarefas ?? []).filter(
    (t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10),
  ).length;

  const primeiroNome = usuario?.name.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="surge">
        <h1 className="text-2xl font-black text-texto">
          {primeiroNome ? `Olá, ${primeiroNome}` : "Minhas tarefas"}
        </h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-rosa" />
        <p className="mt-3 text-sm text-texto-suave">
          {isPending
            ? "Buscando o que é seu..."
            : tarefas?.length
              ? `${tarefas.length} ${tarefas.length === 1 ? "tarefa aberta" : "tarefas abertas"}` +
                (atrasadas > 0 ? ` · ${atrasadas} atrasada${atrasadas > 1 ? "s" : ""}` : "")
              : "Nada pendente por aqui."}
        </p>
      </header>

      <div className="mt-4">
        <Aviso erro={error} />
      </div>

      {isPending ? (
        <div className="mt-6 divide-y divide-borda rounded-card border border-borda bg-superficie">
          {Array.from({ length: 4 }, (_, i) => (
            <EsqueletoDeLinha key={i} />
          ))}
        </div>
      ) : tarefas && tarefas.length > 0 ? (
        <div className="surge mt-6 divide-y divide-borda overflow-hidden rounded-card border border-borda bg-superficie shadow-suave">
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
        <div className="mt-6">
          <EstadoVazio
            titulo="Tudo em dia por aqui"
            descricao="Quando alguém te atribuir uma tarefa — ou criar uma para o time sem responsável — ela aparece nesta lista."
            acao={
              <Link
                to="/times"
                className="rounded-full bg-verde px-4 py-2 text-xs font-semibold tracking-wide text-azul-escuro uppercase shadow-suave transition hover:brightness-95"
              >
                Ver os boards
              </Link>
            }
          />
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
