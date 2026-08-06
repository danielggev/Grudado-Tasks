import { useEffect, useState, type FormEvent } from "react";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import type { TimeDetalhe } from "./api";
import { useAtualizarTime } from "./hooks";

const CAMPO =
  "w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro";
const ROTULO = "text-xs font-black tracking-wide text-texto-suave uppercase";

export function DialogoEditarTime({
  time,
  aberto,
  aoFechar,
}: {
  time: TimeDetalhe;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [name, setName] = useState(time.name);
  const [description, setDescription] = useState(time.description ?? "");
  const atualizar = useAtualizarTime(time.id);

  // Se outra pessoa renomear o time enquanto este dialogo esta aberto, o
  // formulario acompanha em vez de continuar mostrando o valor velho.
  useEffect(() => {
    setName(time.name);
    setDescription(time.description ?? "");
  }, [time.name, time.description]);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    atualizar.mutate(
      { name: name.trim(), description: description.trim() || null },
      { onSuccess: aoFechar },
    );
  }

  return (
    <Dialogo aberto={aberto} titulo="Editar time" aoFechar={aoFechar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={ROTULO}>Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            autoFocus
            className={`${CAMPO} font-semibold`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ROTULO}>Descrição</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Sem descrição"
            className={`${CAMPO} resize-y`}
          />
        </label>

        <Aviso erro={atualizar.error} />

        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={atualizar.isPending}>
            {atualizar.isPending ? "Salvando..." : "Salvar"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
