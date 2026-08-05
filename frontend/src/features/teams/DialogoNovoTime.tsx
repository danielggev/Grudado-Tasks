import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Avatar } from "../../app/Layout";
import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { Dialogo } from "../../components/ui/Dialogo";
import { useUsuarioAtual } from "../auth/hooks";
import { useUsuarios } from "../usuarios/api";
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
  const [membros, setMembros] = useState<string[]>([]);
  const [busca, setBusca] = useState("");

  const criar = useCriarTime();
  const navegar = useNavigate();
  const { data: usuarios } = useUsuarios();
  const { data: eu } = useUsuarioAtual();

  // Quem cria ja entra como lead; listá-lo entre os selecionáveis daria a
  // impressao de que dá para deixá-lo de fora, o que nao e verdade.
  const selecionaveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios ?? [])
      .filter((u) => u.id !== eu?.id)
      .filter((u) => !termo || u.name.toLowerCase().includes(termo));
  }, [usuarios, eu?.id, busca]);

  function alterna(userId: string) {
    setMembros((atual) =>
      atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId],
    );
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    criar.mutate(
      { name: name.trim(), description: description.trim() || null, membros },
      {
        onSuccess: (time) => {
          setName("");
          setDescription("");
          setMembros([]);
          setBusca("");
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
            rows={2}
            placeholder="Opcional"
            className={`${CAMPO} resize-y`}
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className={ROTULO}>
            Pessoas{membros.length > 0 && ` (${membros.length})`}
          </legend>

          {eu && (
            <p className="flex items-center gap-2 rounded-xl bg-amarelo/15 px-2.5 py-2 text-xs">
              <Avatar nome={eu.name} tamanho="xs" />
              <span className="font-semibold">{eu.name}</span>
              <span className="ml-auto rounded-full bg-amarelo/40 px-2 py-0.5 text-[10px] font-black tracking-wide text-azul-escuro uppercase">
                lead
              </span>
            </p>
          )}

          {/* A busca so aparece quando a lista justifica: numa empresa de 15
              pessoas, rolar costuma ser mais rapido que digitar. */}
          {selecionaveis.length > 8 && (
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa..."
              aria-label="Buscar pessoa"
              className={CAMPO}
            />
          )}

          <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-xl border border-borda p-2">
            {selecionaveis.length > 0 ? (
              selecionaveis.map((usuario) => (
                <label
                  key={usuario.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-superficie-2"
                >
                  <input
                    type="checkbox"
                    checked={membros.includes(usuario.id)}
                    onChange={() => alterna(usuario.id)}
                    className="accent-rosa"
                  />
                  <Avatar nome={usuario.name} tamanho="xs" />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {usuario.name}
                  </span>
                </label>
              ))
            ) : (
              <p className="px-2 py-3 text-center text-xs text-texto-suave">
                {busca ? "Ninguém com esse nome." : "Não há outras pessoas cadastradas."}
              </p>
            )}
          </div>

          <p className="text-[11px] text-texto-suave">
            Todas entram como membro. Dá para promover a lead depois, dentro do time.
          </p>
        </fieldset>

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
