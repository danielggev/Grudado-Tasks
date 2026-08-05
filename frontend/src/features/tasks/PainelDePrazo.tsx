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
    <Dialogo aberto titulo="Defina o prazo para comecar" aoFechar={onCancelar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <p className="text-sm text-texto-suave">
          Esta tarefa foi criada sem prazo. Para mover para esta coluna, informe
          quando ela deve ficar pronta.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Prazo</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            autoFocus
            className="rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
          />
        </label>

        <Aviso erro={erro} />

        <div className="flex justify-end gap-2">
          <Botao onClick={onCancelar}>Cancelar</Botao>
          <Botao type="submit" variante="primario" disabled={!data}>
            Confirmar e mover
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
