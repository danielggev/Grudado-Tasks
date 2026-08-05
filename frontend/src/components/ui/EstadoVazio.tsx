import type { ReactNode } from "react";

import { ComposicaoDecorativa } from "./Formas";

/**
 * Estado vazio com as formas da marca ao fundo.
 *
 * "Nenhuma tarefa" num box tracejado e um beco sem saida; aqui o vazio vira um
 * momento de identidade e sempre oferece o proximo passo.
 */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
  compacto = false,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-borda bg-superficie text-center ${
        compacto ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      {!compacto && <ComposicaoDecorativa className="absolute inset-0" />}

      <div className="relative">
        <p className="font-semibold text-texto">{titulo}</p>
        {descricao && (
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-texto-suave">{descricao}</p>
        )}
        {acao && <div className="mt-5 flex justify-center">{acao}</div>}
      </div>
    </div>
  );
}
