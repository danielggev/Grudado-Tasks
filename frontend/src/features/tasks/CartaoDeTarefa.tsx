import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import { Avatar } from "../../app/Layout";
import type { TarefaResumo } from "./api";
import { BandeiraDePrioridade } from "./BandeiraDePrioridade";
import { FAIXA_PRIORIDADE, ROTULO_STATUS, SELO_STATUS } from "./prioridade";

const FORMATADOR_DE_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

function formataPrazo(prazo: string | null): string | null {
  if (!prazo) return null;
  // Data pura (YYYY-MM-DD): parsear como UTC evita que o fuso local jogue o
  // dia anterior, o que aconteceria interpretando a string como horario local.
  return FORMATADOR_DE_DATA.format(new Date(`${prazo}T00:00:00Z`));
}

function estaAtrasada(tarefa: TarefaResumo): boolean {
  if (!tarefa.due_date || tarefa.status === "concluido") return false;
  return tarefa.due_date < new Date().toISOString().slice(0, 10);
}

export function CartaoDeTarefa({
  tarefa,
  aoAbrir,
}: {
  tarefa: TarefaResumo;
  aoAbrir: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tarefa.id });

  // Recolhido por padrao: uma coluna com muitas tarefas quebradas em partes
  // ficaria ilegivel se tudo abrisse de uma vez.
  const [aberto, setAberto] = useState(false);

  const prazoFormatado = formataPrazo(tarefa.due_date);
  const atrasada = estaAtrasada(tarefa);
  const concluida = tarefa.status === "concluido";
  const temSubtarefas = tarefa.subtarefas.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-card border border-borda bg-superficie shadow-suave transition-all duration-200 ${
        isDragging ? "rotate-1 opacity-60 shadow-alta" : "hover:shadow-media"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={() => aoAbrir(tarefa.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            aoAbrir(tarefa.id);
          }
        }}
        className="relative cursor-grab touch-none overflow-hidden rounded-card p-3 pl-4 text-left active:cursor-grabbing"
      >
        {/* Faixa de prioridade: cor da marca legivel de relance, sem roubar
            largura do titulo. */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1.5 ${FAIXA_PRIORIDADE[tarefa.priority]}`}
        />

        <div className="flex items-start gap-1.5">
          <span className="mt-0.5">
            <BandeiraDePrioridade prioridade={tarefa.priority} />
          </span>
          <p
            className={`min-w-0 flex-1 text-sm leading-snug font-semibold ${
              concluida ? "text-texto-suave line-through" : "text-texto"
            }`}
          >
            {tarefa.title}
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {prazoFormatado && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                atrasada ? "bg-rosa/15 text-rosa" : "bg-superficie-2 text-texto-suave"
              }`}
            >
              <IconeRelogio />
              {atrasada ? "Atrasada" : prazoFormatado}
            </span>
          )}

          {tarefa.e_do_time ? (
            <span className="rounded-full bg-amarelo/25 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
              Do time
            </span>
          ) : (
            <span className="flex -space-x-1.5">
              {tarefa.responsaveis.map((pessoa) => (
                <span key={pessoa.id} className="rounded-full ring-2 ring-superficie">
                  <Avatar nome={pessoa.name} tamanho="xs" />
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {temSubtarefas && (
        <div className="px-2 pb-2">
          {/* Fora da area arrastavel: clicar no expansor nao pode iniciar um
              arrasto nem abrir o detalhe da tarefa-mae. */}
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <Seta aberto={aberto} />
            {tarefa.subtarefas.length}{" "}
            {tarefa.subtarefas.length === 1 ? "subtarefa" : "subtarefas"}
            <span className="ml-auto text-[10px]">
              {tarefa.subtarefas_concluidas}/{tarefa.total_de_subtarefas}
            </span>
          </button>

          {aberto && (
            <ul className="mt-1 flex flex-col gap-1 border-l-2 border-borda pl-2">
              {tarefa.subtarefas.map((sub) => (
                <li key={sub.id}>
                  <CartaoDeSubtarefa subtarefa={sub} aoAbrir={() => aoAbrir(sub.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Subtarefa dentro do cartao da mae.
 *
 * Nao e arrastavel: ela vive presa a tarefa principal, e arrasta-la para outra
 * coluna deixaria a hierarquia visualmente rompida. O status dela muda pelo
 * detalhe, que abre no clique.
 */
function CartaoDeSubtarefa({
  subtarefa,
  aoAbrir,
}: {
  subtarefa: TarefaResumo;
  aoAbrir: () => void;
}) {
  const concluida = subtarefa.status === "concluido";

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="w-full rounded-lg border border-borda bg-superficie-2 px-2.5 py-2 text-left transition hover:border-azul-claro/50"
    >
      <div className="flex items-start gap-1.5">
        <span className="mt-px">
          <BandeiraDePrioridade prioridade={subtarefa.priority} tamanho={11} />
        </span>
        <span
          className={`min-w-0 flex-1 text-[11px] leading-snug font-semibold ${
            concluida ? "text-texto-suave line-through" : "text-texto"
          }`}
        >
          {subtarefa.title}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 pl-4">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${SELO_STATUS[subtarefa.status]}`}
        >
          {ROTULO_STATUS[subtarefa.status]}
        </span>

        {subtarefa.due_date && (
          <span className="text-[9px] font-semibold text-texto-suave">
            {formataPrazo(subtarefa.due_date)}
          </span>
        )}

        {!subtarefa.e_do_time && (
          <span className="ml-auto flex -space-x-1">
            {subtarefa.responsaveis.slice(0, 2).map((p) => (
              <span key={p.id} className="rounded-full ring-2 ring-superficie-2">
                <Avatar nome={p.name} tamanho="xs" />
              </span>
            ))}
          </span>
        )}
      </div>
    </button>
  );
}

function Seta({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${aberto ? "rotate-90" : ""}`}
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeRelogio() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
