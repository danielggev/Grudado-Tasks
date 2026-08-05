import { useMemo, useState } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { EstadoVazio } from "../../components/ui/EstadoVazio";
import { EsqueletoDeLinha } from "../../components/ui/Esqueleto";
import { useTime } from "../teams/hooks";
import type { TaskPriority, TaskStatus } from "./api";
import { useBoard } from "./hooks";
import { LinhaDeTarefa } from "./LinhaDeTarefa";
import {
  ORDEM_PRIORIDADE,
  ORDEM_STATUS,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
} from "./prioridade";


/**
 * Mesma fonte de dados do board (useBoard) -- filtros sao recorte no cliente.
 * Com o volume de um time de 2-4 pessoas, filtrar no servidor seria complexidade
 * sem retorno; se o volume crescer, o recorte migra para query param sem mudar
 * esta tela.
 */
export function ListaDoTime({
  teamId,
  aoAbrirTarefa,
}: {
  teamId: string;
  aoAbrirTarefa: (taskId: string) => void;
}) {
  const { data: tarefas, isPending, error } = useBoard(teamId);
  const { data: time } = useTime(teamId);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [prioridade, setPrioridade] = useState<TaskPriority | "">("");
  const [responsavel, setResponsavel] = useState<string | "">("");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (tarefas ?? []).filter((t) => {
      if (termo && !t.title.toLowerCase().includes(termo)) return false;
      if (status && t.status !== status) return false;
      if (prioridade && t.priority !== prioridade) return false;
      if (responsavel === "time" && !t.e_do_time) return false;
      if (
        responsavel &&
        responsavel !== "time" &&
        !t.responsaveis.some((r) => r.id === responsavel)
      )
        return false;
      return true;
    });
  }, [tarefas, busca, status, prioridade, responsavel]);

  const temFiltro = Boolean(busca || status || prioridade || responsavel);

  function limpa() {
    setBusca("");
    setStatus("");
    setPrioridade("");
    setResponsavel("");
  }

  if (isPending) {
    return (
      <div className="divide-y divide-borda rounded-card border border-borda bg-superficie">
        {Array.from({ length: 5 }, (_, i) => (
          <EsqueletoDeLinha key={i} />
        ))}
      </div>
    );
  }
  if (error) return <Aviso erro={error} />;

  const seletor =
    "rounded-full border border-borda bg-superficie px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-azul-claro";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Buscar tarefa</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-texto-suave"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar..."
            className={`${seletor} w-44 pl-8`}
          />
        </label>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
          aria-label="Filtrar por status"
          className={seletor}
        >
          <option value="">Todos os status</option>
          {ORDEM_STATUS.map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS[s]}
            </option>
          ))}
        </select>

        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as TaskPriority | "")}
          aria-label="Filtrar por prioridade"
          className={seletor}
        >
          <option value="">Todas as prioridades</option>
          {ORDEM_PRIORIDADE.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PRIORIDADE[p]}
            </option>
          ))}
        </select>

        <select
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          aria-label="Filtrar por responsável"
          className={seletor}
        >
          <option value="">Todos os responsáveis</option>
          <option value="time">Tarefas do time (sem dono)</option>
          {time?.membros.map((m) => (
            <option key={m.usuario.id} value={m.usuario.id}>
              {m.usuario.name}
            </option>
          ))}
        </select>

        {temFiltro && (
          <button
            type="button"
            onClick={limpa}
            className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-rosa transition hover:bg-rosa/10"
          >
            Limpar
          </button>
        )}

        <span className="ml-auto text-xs font-semibold text-texto-suave">
          {filtradas.length} de {(tarefas ?? []).length}
        </span>
      </div>

      {filtradas.length > 0 ? (
        <div className="surge divide-y divide-borda overflow-hidden rounded-card border border-borda bg-superficie shadow-suave">
          {filtradas.map((tarefa) => (
            <LinhaDeTarefa
              key={tarefa.id}
              tarefa={tarefa}
              aoAbrir={() => aoAbrirTarefa(tarefa.id)}
            />
          ))}
        </div>
      ) : (
        <EstadoVazio
          compacto
          titulo={temFiltro ? "Nada com esses filtros" : "Nenhuma tarefa ainda"}
          descricao={
            temFiltro
              ? "Tente afrouxar os filtros para encontrar o que procura."
              : "Crie a primeira tarefa deste time."
          }
        />
      )}
    </div>
  );
}
