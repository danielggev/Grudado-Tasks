import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  largura?: "media" | "larga";
};

/**
 * Envolve o <dialog> nativo em vez de recriar modal do zero.
 *
 * Sai de graca: foco preso dentro do dialogo, fechar com Esc, inerte o resto da
 * pagina e semantica de dialogo para leitor de tela.
 */
export function Dialogo({ aberto, titulo, aoFechar, children, largura = "media" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      // O Esc dispara `cancel`/`close` nativamente; sem ouvir isso o estado do
      // React acharia que o dialogo continua aberto.
      onClose={aoFechar}
      className={`m-auto w-full rounded-card border border-borda bg-superficie p-0 text-texto shadow-alta backdrop:bg-azul-escuro/50 backdrop:backdrop-blur-sm ${
        largura === "larga" ? "max-w-2xl" : "max-w-md"
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-borda px-5 py-3.5">
        <h2 className="text-sm font-semibold text-texto">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="flex h-7 w-7 items-center justify-center rounded-full text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
