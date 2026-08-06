import { useMemo, useState } from "react";

import { Avatar } from "../../app/Layout";
import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { useUsuarios } from "../usuarios/api";
import type { TeamRole, TimeDetalhe } from "./api";
import { useAdicionarMembro, useAlterarPapel, useRemoverMembro } from "./hooks";

export function GestaoDeMembros({
  time,
  podeGerenciar,
}: {
  time: TimeDetalhe;
  podeGerenciar: boolean;
}) {
  const [selecionado, setSelecionado] = useState("");
  const { data: usuarios } = useUsuarios();

  const adicionar = useAdicionarMembro(time.id);
  const alterar = useAlterarPapel(time.id);
  const remover = useRemoverMembro(time.id);

  const disponiveis = useMemo(() => {
    const jaNoTime = new Set(time.membros.map((m) => m.usuario.id));
    return (usuarios ?? []).filter((u) => !jaNoTime.has(u.id));
  }, [usuarios, time.membros]);

  const totalDeLeads = time.membros.filter((m) => m.role === "lead").length;
  const arquivado = time.archived_at !== null;
  const emAndamento = adicionar.isPending || alterar.isPending || remover.isPending;

  const controle =
    "rounded-full border border-borda bg-superficie px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-azul-claro disabled:opacity-50";

  return (
    <section>
      <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda">
        {time.membros.map((membro) => {
          // A regra do ultimo lead vive no backend; espelha-la aqui e so para
          // desabilitar o controle antes do erro, nunca como garantia.
          const ehUltimoLead = membro.role === "lead" && totalDeLeads <= 1;

          return (
            <li key={membro.usuario.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar nome={membro.usuario.name} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-texto">
                  {membro.usuario.name}
                </p>
                <p className="truncate text-xs text-texto-suave">{membro.usuario.email}</p>
              </div>

              {podeGerenciar && !arquivado ? (
                <>
                  <select
                    value={membro.role}
                    disabled={ehUltimoLead || emAndamento}
                    onChange={(e) =>
                      alterar.mutate({
                        userId: membro.usuario.id,
                        role: e.target.value as TeamRole,
                      })
                    }
                    aria-label={`Papel de ${membro.usuario.name}`}
                    title={
                      ehUltimoLead
                        ? "Promova outro membro a lead antes de mudar este papel."
                        : undefined
                    }
                    className={controle}
                  >
                    <option value="lead">Lead</option>
                    <option value="member">Membro</option>
                  </select>

                  <Botao
                    variante="perigo"
                    disabled={ehUltimoLead || emAndamento}
                    onClick={() => remover.mutate(membro.usuario.id)}
                  >
                    Remover
                  </Botao>
                </>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide uppercase ${
                    membro.role === "lead"
                      ? "bg-amarelo/30 text-azul-escuro"
                      : "bg-superficie-2 text-texto-suave"
                  }`}
                >
                  {membro.role === "lead" ? "Lead" : "Membro"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {podeGerenciar && !arquivado && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selecionado}
            onChange={(e) => setSelecionado(e.target.value)}
            aria-label="Pessoa a adicionar"
            className={`${controle} min-w-56`}
          >
            <option value="">Adicionar pessoa...</option>
            {disponiveis.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.name}
              </option>
            ))}
          </select>

          <Botao
            variante="primario"
            disabled={!selecionado || emAndamento}
            onClick={() =>
              adicionar.mutate(
                { user_id: selecionado, role: "member" },
                { onSuccess: () => setSelecionado("") },
              )
            }
          >
            Adicionar
          </Botao>
        </div>
      )}

      <div className="mt-3">
        <Aviso erro={adicionar.error ?? alterar.error ?? remover.error} />
      </div>
    </section>
  );
}
