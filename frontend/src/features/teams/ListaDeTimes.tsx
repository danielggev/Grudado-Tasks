import { useState } from "react";
import { Link } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { DialogoNovoTime } from "./DialogoNovoTime";
import { usePermissoes, useTimes } from "./hooks";

export function ListaDeTimes() {
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  const [criando, setCriando] = useState(false);
  const { data: times, isPending, error } = useTimes(incluirArquivados);
  const { podeCriarTime } = usePermissoes();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Times</h1>

        <label className="ml-auto flex items-center gap-2 text-sm text-texto-suave">
          <input
            type="checkbox"
            checked={incluirArquivados}
            onChange={(e) => setIncluirArquivados(e.target.checked)}
            className="accent-marca"
          />
          Mostrar arquivados
        </label>

        {podeCriarTime && (
          <Botao variante="primario" onClick={() => setCriando(true)}>
            Novo time
          </Botao>
        )}
      </div>

      <div className="mt-4">
        <Aviso erro={error} />
      </div>

      {isPending ? (
        <p className="mt-6 text-sm text-texto-suave">Carregando times...</p>
      ) : times && times.length > 0 ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {times.map((time) => (
            <li key={time.id}>
              <Link
                to={`/times/${time.id}`}
                className="block rounded-xl border border-borda bg-superficie p-4 transition hover:border-marca/40"
              >
                <div className="flex items-start gap-2">
                  <span className="font-medium">{time.name}</span>
                  {time.archived_at && (
                    <span className="rounded bg-superficie-2 px-1.5 py-0.5 text-xs text-texto-suave">
                      arquivado
                    </span>
                  )}
                </div>
                {time.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-texto-suave">
                    {time.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-texto-suave">
                  {time.total_de_membros}{" "}
                  {time.total_de_membros === 1 ? "pessoa" : "pessoas"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-borda bg-superficie p-8 text-center text-sm text-texto-suave">
          {podeCriarTime
            ? "Nenhum time ainda. Crie o primeiro."
            : "Voce ainda nao faz parte de nenhum time."}
        </div>
      )}

      <DialogoNovoTime aberto={criando} aoFechar={() => setCriando(false)} />
    </div>
  );
}
