import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import type { TimeDetalhe } from "./api";
import { useExcluirTime } from "./hooks";

/**
 * Exclusao de time.
 *
 * Exige digitar o nome antes de liberar. Um clique confirmado por engano aqui
 * destroi as tarefas e todo o historico do time sem volta -- o atrito e
 * proposital, e e a mesma protecao que GitHub e Stripe usam para acoes
 * irreversiveis.
 */
export function DialogoExcluirTime({
  time,
  aberto,
  aoFechar,
}: {
  time: TimeDetalhe;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [confirmacao, setConfirmacao] = useState("");
  const excluir = useExcluirTime();
  const navegar = useNavigate();

  const nomeConfere = confirmacao.trim() === time.name;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nomeConfere) return;
    excluir.mutate(time.id, { onSuccess: () => navegar("/times") });
  }

  return (
    <Dialogo aberto={aberto} titulo="Excluir time" aoFechar={aoFechar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <div className="rounded-xl border border-rosa/30 bg-rosa/10 px-3 py-3">
          <p className="text-sm font-semibold text-rosa">Isso não pode ser desfeito.</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-texto">
            <li>
              <strong>{time.total_de_tarefas}</strong>{" "}
              {time.total_de_tarefas === 1 ? "tarefa" : "tarefas"} e suas subtarefas
            </li>
            <li>Todo o histórico de atividade do time</li>
            <li>
              O vínculo de <strong>{time.total_de_membros}</strong>{" "}
              {time.total_de_membros === 1 ? "pessoa" : "pessoas"} (as contas continuam)
            </li>
          </ul>
        </div>

        <p className="text-xs text-texto-suave">
          Se o time apenas parou de operar, <strong>arquivar</strong> preserva tudo e pode
          ser revertido.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-black tracking-wide text-texto-suave uppercase">
            Digite <span className="text-texto">{time.name}</span> para confirmar
          </span>
          <input
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoFocus
            autoComplete="off"
            aria-label={`Digite ${time.name} para confirmar`}
            className="w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-rosa"
          />
        </label>

        <Aviso erro={excluir.error} />

        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            variante="perigo"
            disabled={!nomeConfere || excluir.isPending}
          >
            {excluir.isPending ? "Excluindo..." : "Excluir definitivamente"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
