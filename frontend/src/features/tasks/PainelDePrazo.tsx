import { useState, type FormEvent } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import type { ApiError } from "../../lib/api-client";

/**
 * A regra central do produto, na interface: uma tarefa sem prazo so avanca
 * de "a fazer" se alguem informar a data no ato. Este painel e o que cobra
 * isso -- ele so aparece porque o backend recusou o movimento com 422.
 */
export function PainelDePrazo({
  onDefinir,
  onCancelar,
  erro,
}: {
  onDefinir: (dueDate: string) => void;
  onCancelar: () => void;
  erro: ApiError | null;
}) {
  const [data, setData] = useState("");

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (data) onDefinir(data);
  }

  return (
    <Dialogo aberto titulo="Defina o prazo para começar" aoFechar={onCancelar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-texto-suave">
          Esta tarefa foi criada sem prazo. Para movê-la desta coluna, informe
          quando ela deve ficar pronta.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-black tracking-wide text-texto-suave uppercase">
            Prazo
          </span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            autoFocus
            className="w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro"
          />
        </label>

        <Aviso erro={erro} />

        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={onCancelar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={!data}>
            Confirmar e mover
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
