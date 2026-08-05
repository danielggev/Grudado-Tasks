import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
};

/**
 * Envolve o <dialog> nativo em vez de recriar modal do zero.
 *
 * Sai de graca: foco preso dentro do dialogo, fechar com Esc, inerte o resto da
 * pagina e semantica de dialogo para leitor de tela.
 */
export function Dialogo({ aberto, titulo, aoFechar, children }: Props) {
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
      className="m-auto w-full max-w-md rounded-xl border border-borda bg-superficie p-0 text-texto backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="rounded px-2 text-texto-suave transition hover:bg-superficie-2"
        >
          &times;
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
