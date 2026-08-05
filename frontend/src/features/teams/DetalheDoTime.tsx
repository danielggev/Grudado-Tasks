import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { BoardDoTime } from "../tasks/BoardDoTime";
import { GestaoDeMembros } from "./GestaoDeMembros";
import { useArquivarTime, useAtualizarTime, usePermissoes, useTime } from "./hooks";

export function DetalheDoTime() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const { data: time, isPending, error } = useTime(teamId);
  const { podeGerenciar } = usePermissoes();

  if (isPending) {
    return <p className="text-sm text-texto-suave">Carregando time...</p>;
  }

  if (error || !time) {
    return (
      <div className="mx-auto max-w-3xl">
        <Aviso erro={error} />
        <Link to="/times" className="mt-4 inline-block text-sm text-marca hover:underline">
          Voltar para times
        </Link>
      </div>
    );
  }

  const arquivado = time.archived_at !== null;
  const gerencia = podeGerenciar(time.id);

  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <Link to="/times" className="text-sm text-texto-suave hover:underline">
          &larr; Times
        </Link>

        <Cabecalho time={time} podeGerenciar={gerencia} />

        {arquivado && (
          <p className="mt-4 rounded-lg border border-borda bg-superficie-2 px-3 py-2 text-sm text-texto-suave">
            Este time esta arquivado. Reative-o para voltar a edita-lo.
          </p>
        )}
      </div>

      {/* O board precisa de mais largura que o restante da tela: 4 colunas
          de card nao cabem no mesmo max-w-3xl do cabecalho e dos membros. */}
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

  if (!editando) {
    return (
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{time.name}</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {time.description || "Sem descricao."}
          </p>
        </div>

        {podeGerenciar && (
          <div className="flex gap-2">
            {!arquivado && <Botao onClick={() => setEditando(true)}>Editar</Botao>}
            <Botao
              variante={arquivado ? "secundario" : "perigo"}
              disabled={arquivar.isPending}
              onClick={() => arquivar.mutate(!arquivado)}
            >
              {arquivado ? "Reativar" : "Arquivar"}
            </Botao>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      className="mt-2 flex flex-col gap-3"
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
        className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={3}
        aria-label="Descricao do time"
        placeholder="Sem descricao"
        className="resize-y rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
      />

      <Aviso erro={atualizar.error} />

      <div className="flex gap-2">
        <Botao type="submit" variante="primario" disabled={atualizar.isPending}>
          Salvar
        </Botao>
        <Botao onClick={() => setEditando(false)}>Cancelar</Botao>
      </div>
    </form>
  );
}
