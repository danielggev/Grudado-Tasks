import { NavLink, Outlet } from "react-router-dom";

import { useEncerrarSessao, useUsuarioAtual } from "../features/auth/hooks";

const ITENS = [
  { para: "/minhas-tarefas", rotulo: "Minhas tarefas" },
  { para: "/times", rotulo: "Times" },
];

export function Layout() {
  const { data: usuario } = useUsuarioAtual();
  const encerrar = useEncerrarSessao();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-borda bg-superficie px-6 py-3">
        <span className="font-semibold tracking-tight">Grudado Tasks</span>

        <nav className="flex gap-1">
          {ITENS.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-marca-suave font-medium text-marca"
                    : "text-texto-suave hover:bg-superficie-2"
                }`
              }
            >
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {usuario && (
            <span className="text-sm text-texto-suave" title={usuario.email}>
              {usuario.name}
              {usuario.org_role === "admin" && (
                <span className="ml-2 rounded bg-superficie-2 px-1.5 py-0.5 text-xs">
                  admin
                </span>
              )}
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
            className="rounded-lg border border-borda px-3 py-1.5 text-sm transition hover:bg-superficie-2 disabled:opacity-50"
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
