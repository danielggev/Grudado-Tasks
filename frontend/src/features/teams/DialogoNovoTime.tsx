import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import { useCriarTime } from "./hooks";

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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            autoFocus
            placeholder="Design"
            className="rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Descricao</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Opcional"
            className="resize-y rounded-lg border border-borda bg-superficie px-3 py-2 outline-none focus:border-marca"
          />
        </label>

        <Aviso erro={criar.error} />

        <div className="flex justify-end gap-2">
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" variante="primario" disabled={criar.isPending}>
            {criar.isPending ? "Criando..." : "Criar time"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
