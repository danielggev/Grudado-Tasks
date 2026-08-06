import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { Dialogo } from "../../components/ui/Dialogo";
import { Esqueleto } from "../../components/ui/Esqueleto";
import {
  ItemDeMenu,
  MenuSuspenso,
  SeparadorDeMenu,
} from "../../components/ui/MenuSuspenso";
import { Board } from "../tasks/Board";
import { DetalheDaTarefa } from "../tasks/DetalheDaTarefa";
import { DialogoDeTarefa } from "../tasks/DialogoDeTarefa";
import { useSincronizacaoDoTime } from "../tasks/hooks";
import { ListaDoTime } from "../tasks/ListaDoTime";
import { DialogoEditarTime } from "./DialogoEditarTime";
import { DialogoExcluirTime } from "./DialogoExcluirTime";
import { GestaoDeMembros } from "./GestaoDeMembros";
import { useArquivarTime, usePermissoes, useTime } from "./hooks";
import { sotaqueDe } from "./sotaque";

type Visao = "board" | "lista";
type Painel = "editar" | "membros" | "arquivar" | "excluir" | null;

/**
 * A tela de trabalho do time.
 *
 * Layout inspirado em Trello: uma barra fina no topo e o quadro ocupando o
 * resto. Tudo que e gestao (editar, membros, arquivar, excluir) vive dentro da
 * engrenagem -- fora dela fica so "Nova tarefa", que e a acao do dia a dia.
 */
export function DetalheDoTime() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const { data: time, isPending, error } = useTime(teamId);
  const { podeGerenciar, ehAdmin } = usePermissoes();

  useSincronizacaoDoTime(teamId);

  const [visao, setVisao] = useState<Visao>("board");
  const [painel, setPainel] = useState<Painel>(null);
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState<{ teamId: string; parentId?: string } | null>(
    null,
  );

  const arquivar = useArquivarTime(teamId);

  if (isPending) {
    return (
      <div>
        <Esqueleto className="h-3 w-16" />
        <Esqueleto className="mt-3 h-7 w-56" />
        <div className="mt-8 flex gap-3">
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} className="h-64 w-76 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !time) {
    return (
      <div className="mx-auto max-w-3xl">
        <Aviso erro={error} />
        <Link
          to="/times"
          className="mt-4 inline-block text-sm font-semibold text-rosa hover:underline"
        >
          Voltar para times
        </Link>
      </div>
    );
  }

  const arquivado = time.archived_at !== null;
  const gerencia = podeGerenciar(time.id);

  return (
    <div className="surge flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/times"
            aria-label="Voltar para times"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <span
            aria-hidden="true"
            className={`h-6 w-1.5 shrink-0 rounded-full ${sotaqueDe(time.id)}`}
          />

          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-black text-texto">
              {time.name}
            </h1>
            {time.description && (
              <p className="truncate text-[11px] text-texto-suave">{time.description}</p>
            )}
          </div>

          {arquivado && (
            <span className="shrink-0 rounded-full bg-amarelo/30 px-2 py-0.5 text-[10px] font-black tracking-wide text-azul-escuro uppercase">
              arquivado
            </span>
          )}
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

          {gerencia && (
            <MenuSuspenso rotulo="Configurações do time" icone={<IconeEngrenagem />}>
              {(fechar) => (
                <>
                  <ItemDeMenu
                    aoClicar={() => {
                      setPainel("membros");
                      fechar();
                    }}
                  >
                    <IconePessoas />
                    Membros ({time.total_de_membros})
                  </ItemDeMenu>

                  {!arquivado && (
                    <ItemDeMenu
                      aoClicar={() => {
                        setPainel("editar");
                        fechar();
                      }}
                    >
                      <IconeLapis />
                      Editar time
                    </ItemDeMenu>
                  )}

                  <SeparadorDeMenu />

                  <ItemDeMenu
                    aoClicar={() => {
                      if (arquivado) arquivar.mutate(false);
                      else setPainel("arquivar");
                      fechar();
                    }}
                  >
                    <IconeCaixa />
                    {arquivado ? "Reativar time" : "Arquivar time"}
                  </ItemDeMenu>

                  {ehAdmin && (
                    <ItemDeMenu
                      perigo
                      aoClicar={() => {
                        setPainel("excluir");
                        fechar();
                      }}
                    >
                      <IconeLixeira />
                      Excluir time
                    </ItemDeMenu>
                  )}
                </>
              )}
            </MenuSuspenso>
          )}

          {!arquivado && (
            <Botao
              variante="primario"
              onClick={() => setCriando({ teamId: time.id })}
            >
              Nova tarefa
            </Botao>
          )}
        </div>
      </header>

      <div className="mt-5 flex-1">
        {visao === "board" ? (
          <Board teamId={time.id} aoAbrirTarefa={setTarefaAberta} />
        ) : (
          <ListaDoTime teamId={time.id} aoAbrirTarefa={setTarefaAberta} />
        )}
      </div>

      {/* --- Paineis de gestao, todos abertos pela engrenagem --- */}

      <Dialogo
        aberto={painel === "membros"}
        titulo={`Membros de ${time.name}`}
        aoFechar={() => setPainel(null)}
      >
        <GestaoDeMembros time={time} podeGerenciar={gerencia} />
      </Dialogo>

      <DialogoEditarTime
        time={time}
        aberto={painel === "editar"}
        aoFechar={() => setPainel(null)}
      />

      <Confirmacao
        aberto={painel === "arquivar"}
        titulo="Arquivar time"
        mensagem={`"${time.name}" sai do fluxo e não aceita mais alterações. As tarefas ficam preservadas e o time pode ser reativado depois.`}
        rotuloConfirmar="Arquivar"
        emAndamento={arquivar.isPending}
        aoConfirmar={() => arquivar.mutate(true, { onSuccess: () => setPainel(null) })}
        aoCancelar={() => setPainel(null)}
      />

      <DialogoExcluirTime
        time={time}
        aberto={painel === "excluir"}
        aoFechar={() => setPainel(null)}
      />

      {/* --- Tarefas --- */}

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

function IconeEngrenagem() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconePessoas() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M2.5 20a6.5 6.5 0 0113 0M17 11.5a3 3 0 100-6M18 20a5.5 5.5 0 00-2-4.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeLapis() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L19 9a2.8 2.8 0 10-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeCaixa() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7h18v3H3zM5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9M10 14h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeLixeira() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
