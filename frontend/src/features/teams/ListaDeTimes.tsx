import { useMemo, useState } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { EstadoVazio } from "../../components/ui/EstadoVazio";
import { Esqueleto } from "../../components/ui/Esqueleto";
import { DetalheDaTarefa } from "../tasks/DetalheDaTarefa";
import { DialogoDeTarefa } from "../tasks/DialogoDeTarefa";
import { usePanorama } from "../tasks/hooks";
import { ColunaDeTime } from "./ColunaDeTime";
import { DialogoNovoTime } from "./DialogoNovoTime";
import { usePermissoes, useTimes } from "./hooks";

/**
 * Visao geral: cada time e uma coluna com as tarefas dele dentro.
 *
 * Substitui a grade de cartoes que so mostrava nome e contagem -- dali nao dava
 * para saber o que os times estavam fazendo sem entrar em cada um.
 */
export function ListaDeTimes() {
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  const [criandoTime, setCriandoTime] = useState(false);
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criandoTarefaEm, setCriandoTarefaEm] = useState<string | null>(null);

  const { data: times, isPending, error } = useTimes(incluirArquivados);
  const { data: tarefas, error: erroTarefas } = usePanorama();
  const { podeCriarTime } = usePermissoes();

  // Uma consulta traz as tarefas de todos os times; o agrupamento e local.
  const porTime = useMemo(() => {
    const mapa = new Map<string, typeof tarefas>();
    for (const tarefa of tarefas ?? []) {
      const lista = mapa.get(tarefa.team_id) ?? [];
      lista.push(tarefa);
      mapa.set(tarefa.team_id, lista);
    }
    return mapa;
  }, [tarefas]);

  const teamIdDaAberta = useMemo(
    () => (tarefas ?? []).find((t) => t.id === tarefaAberta)?.team_id,
    [tarefas, tarefaAberta],
  );

  return (
    <div>
      <header className="surge mx-auto flex max-w-7xl flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-black text-texto">Times</h1>
          <div className="mt-2 h-1 w-12 rounded-full bg-azul-claro" />
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-texto-suave">
          <input
            type="checkbox"
            checked={incluirArquivados}
            onChange={(e) => setIncluirArquivados(e.target.checked)}
            className="accent-rosa"
          />
          Mostrar arquivados
        </label>

        {podeCriarTime && (
          <Botao variante="primario" onClick={() => setCriandoTime(true)}>
            Novo time
          </Botao>
        )}
      </header>

      <div className="mx-auto mt-4 max-w-7xl">
        <Aviso erro={error ?? erroTarefas} />
      </div>

      {isPending ? (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="w-80 shrink-0 rounded-card border border-borda bg-superficie p-4"
            >
              <Esqueleto className="h-4 w-32" />
              <Esqueleto className="mt-2 h-3 w-24" />
              <div className="mt-4 flex flex-col gap-2">
                <Esqueleto className="h-12 w-full" />
                <Esqueleto className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : times && times.length > 0 ? (
        <div className="surge mt-6 flex gap-3 overflow-x-auto pb-3">
          {times.map((time) => (
            <ColunaDeTime
              key={time.id}
              time={time}
              tarefas={porTime.get(time.id) ?? []}
              aoAbrirTarefa={setTarefaAberta}
              aoCriarTarefa={() => setCriandoTarefaEm(time.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-3xl">
          <EstadoVazio
            titulo={
              podeCriarTime ? "Nenhum time ainda" : "Você ainda não faz parte de um time"
            }
            descricao={
              podeCriarTime
                ? "Crie o primeiro time e comece a organizar as demandas por ali."
                : "Peça a um administrador para te adicionar a um time."
            }
            acao={
              podeCriarTime ? (
                <Botao variante="primario" onClick={() => setCriandoTime(true)}>
                  Criar o primeiro time
                </Botao>
              ) : undefined
            }
          />
        </div>
      )}

      <DialogoNovoTime aberto={criandoTime} aoFechar={() => setCriandoTime(false)} />

      {criandoTarefaEm && (
        <DialogoDeTarefa
          teamId={criandoTarefaEm}
          aberto
          aoFechar={() => setCriandoTarefaEm(null)}
        />
      )}

      {tarefaAberta && teamIdDaAberta && (
        <DetalheDaTarefa
          taskId={tarefaAberta}
          aoFechar={() => setTarefaAberta(null)}
          aoAbrirSubtarefa={setTarefaAberta}
          aoCriarSubtarefa={() => setCriandoTarefaEm(teamIdDaAberta)}
        />
      )}
    </div>
  );
}
