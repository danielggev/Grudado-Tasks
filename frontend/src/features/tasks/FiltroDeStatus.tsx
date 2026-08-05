import { useEffect, useRef, useState } from "react";

import type { TaskStatus } from "./api";
import { COR_STATUS, ORDEM_STATUS, ROTULO_STATUS } from "./prioridade";

/**
 * Filtro de status da coluna.
 *
 * Menu proprio em vez de <select> nativo porque o gatilho e so um icone --
 * um select estilizado assim perde a seta e vira um alvo de clique confuso.
 * Em troca, o teclado precisa ser tratado a mao: Esc fecha, e o foco volta
 * para o botao.
 */
export function FiltroDeStatus({
  valor,
  aoMudar,
}: {
  valor: TaskStatus | null;
  aoMudar: (status: TaskStatus | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function cliqueFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      setAberto(false);
      // Devolve o foco: sem isso, fechar com Esc deixaria quem navega por
      // teclado perdido no inicio da pagina.
      gatilho.current?.focus();
    }

    document.addEventListener("mousedown", cliqueFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cliqueFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  function escolhe(status: TaskStatus | null) {
    aoMudar(status);
    setAberto(false);
    gatilho.current?.focus();
  }

  const ativo = valor !== null;

  return (
    <div ref={container} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={
          ativo ? `Filtrando por ${ROTULO_STATUS[valor]}. Mudar filtro` : "Filtrar por status"
        }
        title={ativo ? `Filtrando: ${ROTULO_STATUS[valor]}` : "Filtrar por status"}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          ativo
            ? "bg-azul-claro/15 text-azul-claro"
            : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
        }`}
      >
        <IconeFunil />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute top-8 right-0 z-30 w-44 overflow-hidden rounded-xl border border-borda bg-superficie py-1 shadow-alta"
        >
          <Opcao
            rotulo="Todas"
            selecionada={valor === null}
            aoEscolher={() => escolhe(null)}
          />
          {ORDEM_STATUS.map((status) => (
            <Opcao
              key={status}
              rotulo={ROTULO_STATUS[status]}
              cor={COR_STATUS[status]}
              selecionada={valor === status}
              aoEscolher={() => escolhe(status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Opcao({
  rotulo,
  cor,
  selecionada,
  aoEscolher,
}: {
  rotulo: string;
  cor?: string;
  selecionada: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selecionada}
      onClick={aoEscolher}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold transition hover:bg-superficie-2 ${
        selecionada ? "text-texto" : "text-texto-suave"
      }`}
    >
      {cor ? (
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${cor}`} />
      ) : (
        <span aria-hidden="true" className="h-2 w-2 shrink-0" />
      )}
      {rotulo}
      {selecionada && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="ml-auto text-azul-claro"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function IconeFunil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 5h17l-6.5 7.5V20l-4 1.5v-9L3.5 5z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
