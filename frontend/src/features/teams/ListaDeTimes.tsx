import { useState } from "react";
import { Link } from "react-router-dom";

import { Aviso } from "../../components/ui/Aviso";
import { Botao } from "../../components/ui/Botao";
import { EstadoVazio } from "../../components/ui/EstadoVazio";
import { Esqueleto } from "../../components/ui/Esqueleto";
import { DialogoNovoTime } from "./DialogoNovoTime";
import { usePermissoes, useTimes } from "./hooks";

/** Cor de destaque por time — estavel, derivada do id. */
const SOTAQUES = ["bg-rosa", "bg-azul-claro", "bg-laranja", "bg-verde", "bg-amarelo"];

function sotaqueDe(id: string): string {
  const soma = [...id].reduce((total, c) => total + c.charCodeAt(0), 0);
  return SOTAQUES[soma % SOTAQUES.length];
}

export function ListaDeTimes() {
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  const [criando, setCriando] = useState(false);
  const { data: times, isPending, error } = useTimes(incluirArquivados);
  const { podeCriarTime } = usePermissoes();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="surge flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-black text-texto">Times</h1>
          <div className="mt-2 h-1 w-12 rounded-full bg-azul-claro" />
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-texto-suave">
          <input
            type="checkbox"
            checked={incluirArquivados}
            onChange={(e) => setIncluirArquivados(e.target.checked)}
            className="accent-rosa"
          />
          Mostrar arquivados
        </label>

        {podeCriarTime && (
          <Botao variante="primario" onClick={() => setCriando(true)}>
            Novo time
          </Botao>
        )}
      </header>

      <div className="mt-4">
        <Aviso erro={error} />
      </div>

      {isPending ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="rounded-card border border-borda bg-superficie p-5">
              <Esqueleto className="h-5 w-1/2" />
              <Esqueleto className="mt-3 h-3 w-full" />
              <Esqueleto className="mt-2 h-3 w-2/3" />
              <Esqueleto className="mt-5 h-3 w-20" />
            </li>
          ))}
        </ul>
      ) : times && times.length > 0 ? (
        <ul className="surge mt-6 grid gap-3 sm:grid-cols-2">
          {times.map((time) => (
            <li key={time.id}>
              <Link
                to={`/times/${time.id}`}
                className="group relative block overflow-hidden rounded-card border border-borda bg-superficie p-5 shadow-suave transition-all duration-200 hover:-translate-y-0.5 hover:shadow-media"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1.5 ${sotaqueDe(time.id)}`}
                />

                <div className="flex items-start gap-2">
                  <h2 className="font-black text-texto">{time.name}</h2>
                  {time.archived_at && (
                    <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
                      arquivado
                    </span>
                  )}
                </div>

                <p className="mt-1.5 line-clamp-2 min-h-10 text-sm text-texto-suave">
                  {time.description || "Sem descrição."}
                </p>

                <p className="mt-3 text-xs font-semibold text-texto-suave">
                  {time.total_de_membros}{" "}
                  {time.total_de_membros === 1 ? "pessoa" : "pessoas"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EstadoVazio
            titulo={
              podeCriarTime ? "Nenhum time ainda" : "Você ainda não faz parte de um time"
            }
            descricao={
              podeCriarTime
                ? "Crie o primeiro time e comece a organizar as demandas por ali."
                : "Peça a um administrador para te adicionar a um time."
            }
            acao={
              podeCriarTime ? (
                <Botao variante="primario" onClick={() => setCriando(true)}>
                  Criar o primeiro time
                </Botao>
              ) : undefined
            }
          />
        </div>
      )}

      <DialogoNovoTime aberto={criando} aoFechar={() => setCriando(false)} />
    </div>
  );
}
