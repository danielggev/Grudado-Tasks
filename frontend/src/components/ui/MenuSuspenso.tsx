import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Menu ancorado a um botao de icone.
 *
 * Concentra a parte chata: fechar no clique fora, fechar no Esc e devolver o
 * foco ao gatilho -- sem isso, quem navega por teclado volta para o inicio da
 * pagina toda vez que fecha um menu.
 *
 * `children` recebe `fechar` para que cada item possa encerrar o menu ao agir.
 */
export function MenuSuspenso({
  rotulo,
  icone,
  ativo = false,
  alinhamento = "direita",
  largura = "w-52",
  children,
}: {
  rotulo: string;
  icone: ReactNode;
  ativo?: boolean;
  alinhamento?: "direita" | "esquerda";
  largura?: string;
  children: (fechar: () => void) => ReactNode;
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
      gatilho.current?.focus();
    }

    document.addEventListener("mousedown", cliqueFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cliqueFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  function fechar() {
    setAberto(false);
    gatilho.current?.focus();
  }

  return (
    <div ref={container} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        title={rotulo}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          ativo
            ? "bg-azul-claro/15 text-azul-claro"
            : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
        }`}
      >
        {icone}
      </button>

      {aberto && (
        <div
          role="menu"
          className={`absolute top-9 z-30 overflow-hidden rounded-xl border border-borda bg-superficie py-1 shadow-alta ${largura} ${
            alinhamento === "direita" ? "right-0" : "left-0"
          }`}
        >
          {children(fechar)}
        </div>
      )}
    </div>
  );
}

export function ItemDeMenu({
  children,
  aoClicar,
  perigo = false,
}: {
  children: ReactNode;
  aoClicar: () => void;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={aoClicar}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold transition hover:bg-superficie-2 ${
        perigo ? "text-rosa" : "text-texto"
      }`}
    >
      {children}
    </button>
  );
}

export function SeparadorDeMenu() {
  return <div role="separator" className="my-1 border-t border-borda" />;
}
