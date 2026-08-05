import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { Esqueleto } from "../../components/ui/Esqueleto";
import { BoardDoTime } from "../tasks/BoardDoTime";
import { GestaoDeMembros } from "./GestaoDeMembros";
import { useArquivarTime, useAtualizarTime, usePermissoes, useTime } from "./hooks";

export function DetalheDoTime() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const { data: time, isPending, error } = useTime(teamId);
  const { podeGerenciar } = usePermissoes();

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl">
        <Esqueleto className="h-3 w-16" />
        <Esqueleto className="mt-4 h-7 w-56" />
        <Esqueleto className="mt-3 h-3 w-full max-w-md" />
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
    <div className="surge">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/times"
          className="inline-flex items-center gap-1 text-xs font-semibold text-texto-suave transition hover:text-texto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Times
        </Link>

        <Cabecalho time={time} podeGerenciar={gerencia} />

        {arquivado && (
          <p className="mt-4 rounded-xl border border-amarelo/40 bg-amarelo/15 px-3 py-2.5 text-sm font-semibold text-texto">
            Este time está arquivado. Reative-o para voltar a editá-lo.
          </p>
        )}
      </div>

      {/* O board precisa de mais largura que o restante da tela: quatro colunas
          nao cabem no mesmo max-w-3xl do cabecalho e dos membros. */}
      {!arquivado && (
        <div className="mt-8">
          <BoardDoTime teamId={time.id} />
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <GestaoDeMembros time={time} podeGerenciar={gerencia} />
      </div>
    </div>
  );
}

function Cabecalho({
  time,
  podeGerenciar,
}: {
  time: NonNullable<ReturnType<typeof useTime>["data"]>;
  podeGerenciar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false);
  const [name, setName] = useState(time.name);
  const [description, setDescription] = useState(time.description ?? "");

  const atualizar = useAtualizarTime(time.id);
  const arquivar = useArquivarTime(time.id);
  const arquivado = time.archived_at !== null;

  // Se o time for atualizado por outra pessoa enquanto esta tela esta aberta,
  // o formulario precisa acompanhar em vez de continuar mostrando o valor velho.
  useEffect(() => {
    setName(time.name);
    setDescription(time.description ?? "");
  }, [time.name, time.description]);

  const campo =
    "w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro";

  if (!editando) {
    return (
      <>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-texto">{time.name}</h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-azul-claro" />
            <p className="mt-3 text-sm text-texto-suave">
              {time.description || "Sem descrição."}
            </p>
          </div>

          {podeGerenciar && (
            <div className="flex gap-2">
              {!arquivado && <Botao onClick={() => setEditando(true)}>Editar</Botao>}
              <Botao
                variante={arquivado ? "secundario" : "perigo"}
                disabled={arquivar.isPending}
                onClick={() =>
                  arquivado ? arquivar.mutate(false) : setConfirmandoArquivar(true)
                }
              >
                {arquivado ? "Reativar" : "Arquivar"}
              </Botao>
            </div>
          )}
        </div>

        <Confirmacao
          aberto={confirmandoArquivar}
          titulo="Arquivar time"
          mensagem={`"${time.name}" sai da lista e não aceita mais alterações. As tarefas ficam preservadas e o time pode ser reativado depois.`}
          rotuloConfirmar="Arquivar"
          emAndamento={arquivar.isPending}
          aoConfirmar={() =>
            arquivar.mutate(true, { onSuccess: () => setConfirmandoArquivar(false) })
          }
          aoCancelar={() => setConfirmandoArquivar(false)}
        />
      </>
    );
  }

  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        atualizar.mutate(
          { name: name.trim(), description: description.trim() || null },
          { onSuccess: () => setEditando(false) },
        );
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
        maxLength={120}
        aria-label="Nome do time"
        className={`${campo} text-lg font-black`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={3}
        aria-label="Descrição do time"
        placeholder="Sem descrição"
        className={`${campo} resize-y`}
      />

      <Aviso erro={atualizar.error} />

      <div className="flex gap-2">
        <Botao type="submit" variante="primario" disabled={atualizar.isPending}>
          Salvar
        </Botao>
        <Botao variante="fantasma" onClick={() => setEditando(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
