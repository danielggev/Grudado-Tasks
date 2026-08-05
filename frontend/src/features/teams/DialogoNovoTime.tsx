import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import { useCriarTime } from "./hooks";

const CAMPO =
  "w-full rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro";
const ROTULO = "text-xs font-black tracking-wide text-texto-suave uppercase";

export function DialogoNovoTime({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const criar = useCriarTime();
  const navegar = useNavigate();

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    criar.mutate(
      { name: name.trim(), description: description.trim() || null },
      {
        onSuccess: (time) => {
          setName("");
          setDescription("");
          aoFechar();
          navegar(`/times/${time.id}`);
        },
      },
    );
  }

  return (
    <Dialogo aberto={aberto} titulo="Novo time" aoFechar={aoFechar}>
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
            placeholder="Design"
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
            placeholder="Opcional"
            className={`${CAMPO} resize-y`}
          />
        </label>

        <p className="text-[11px] text-texto-suave">
          Você entra como lead do time e pode adicionar as pessoas em seguida.
        </p>

        <Aviso erro={criar.error} />

        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={criar.isPending}>
            {criar.isPending ? "Criando..." : "Criar time"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
