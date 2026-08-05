import { Outlet } from "react-router-dom";

import { useEncerrarSessao, useUsuarioAtual } from "../features/auth/hooks";

export function Layout() {
  const { data: usuario } = useUsuarioAtual();
  const encerrar = useEncerrarSessao();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-4 border-b border-borda bg-superficie px-6 py-3">
        <span className="font-semibold tracking-tight text-texto">Grudado Tasks</span>

        <div className="ml-auto flex items-center gap-3">
          {usuario && (
            <span className="text-sm text-texto-suave" title={usuario.email}>
              {usuario.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              encerrar.mutate(undefined, {
                onSuccess: () => {
                  window.location.href = "/entrar";
                },
              });
            }}
            disabled={encerrar.isPending}
            className="rounded-lg border border-borda px-3 py-1.5 text-sm text-texto transition hover:bg-superficie-2 disabled:opacity-50"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
