import { useState } from "react";

import { Botao } from "../../components/ui/Botao";
import { useUsuarioAtual } from "../auth/hooks";
import { useTimes } from "../teams/hooks";
import { Board } from "./Board";
import { DetalheDaTarefa } from "./DetalheDaTarefa";
import { DialogoDeTarefa } from "./DialogoDeTarefa";
import { CHAVE_MINHAS, useMinhasTarefas, useSincronizacaoDoTime } from "./hooks";
import { ListaDoTime } from "./ListaDoTime";

type Visao = "board" | "lista";

/**
 * O quadro pessoal: mesma estrutura da tela do time, mas alimentado por
 * "minhas tarefas" -- o que foi designado a pessoa mais o que e do time dela e
 * ainda nao tem dono.
 *
 * Sem engrenagem, porque nao ha time unico para gerenciar aqui.
 */
export function MinhasTarefas() {
  const { data: tarefas, isPending, error } = useMinhasTarefas();
  const { data: usuario } = useUsuarioAtual();
  const { data: times } = useTimes();

  const [visao, setVisao] = useState<Visao>("board");
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState<{ teamId?: string; parentId?: string } | null>(
    null,
  );

  // As tarefas vem de varios times, entao e preciso assinar o canal de cada um
  // para o quadro pessoal atualizar ao vivo como o do time.
  const idsDosTimes = (times ?? []).map((t) => t.id).join(",");

  const primeiroNome = usuario?.name.split(" ")[0] ?? "";
  const abertas = (tarefas ?? []).filter((t) => t.status !== "concluido").length;
  const atrasadas = (tarefas ?? []).filter(
    (t) =>
      t.due_date && t.status !== "concluido" && t.due_date < new Date().toISOString().slice(0, 10),
  ).length;

  return (
    <div className="surge flex min-h-full flex-col">
      <AssinaturaDosTimes ids={idsDosTimes} />

      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full bg-rosa" />
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-black text-texto">
              {primeiroNome ? `Olá, ${primeiroNome}` : "Minhas tarefas"}
            </h1>
            <p className="truncate text-[11px] text-texto-suave">
              {isPending
                ? "Buscando o que é seu..."
                : abertas > 0
                  ? `${abertas} em aberto${atrasadas > 0 ? ` · ${atrasadas} atrasada${atrasadas > 1 ? "s" : ""}` : ""}`
                  : "Nada pendente por aqui."}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Visualização das tarefas"
            className="flex rounded-full bg-superficie-2 p-1"
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

          {(times ?? []).length > 0 && (
            <Botao variante="primario" onClick={() => setCriando({})}>
              Nova tarefa
            </Botao>
          )}
        </div>
      </header>

      <div className="mt-5 flex-1">
        {visao === "board" ? (
          <Board
            tarefas={tarefas}
            carregando={isPending}
            erro={error}
            chaveOtimista={CHAVE_MINHAS}
            aoAbrirTarefa={setTarefaAberta}
          />
        ) : (
          <ListaDoTime
            tarefas={tarefas}
            carregando={isPending}
            erro={error}
            aoAbrirTarefa={setTarefaAberta}
          />
        )}
      </div>

      {criando && (
        <DialogoDeTarefa
          teamId={criando.teamId}
          parentId={criando.parentId}
          aberto
          aoFechar={() => setCriando(null)}
        />
      )}

      {tarefaAberta && (
        <DetalheDaTarefa
          taskId={tarefaAberta}
          aoFechar={() => setTarefaAberta(null)}
          aoAbrirSubtarefa={setTarefaAberta}
          aoCriarSubtarefa={setCriando}
        />
      )}
    </div>
  );
}

/**
 * Abre uma conexao de eventos por time.
 *
 * Componente separado porque hooks nao podem ser chamados em laco -- montar um
 * por time e o que permite chamar `useSincronizacaoDoTime` uma vez em cada.
 */
function AssinaturaDosTimes({ ids }: { ids: string }) {
  const lista = ids ? ids.split(",") : [];
  return (
    <>
      {lista.map((id) => (
        <AssinaTime key={id} teamId={id} />
      ))}
    </>
  );
}

function AssinaTime({ teamId }: { teamId: string }) {
  useSincronizacaoDoTime(teamId);
  return null;
}
