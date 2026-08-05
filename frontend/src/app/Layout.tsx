import { NavLink, Outlet } from "react-router-dom";

import { AlternadorDeTema } from "../components/ui/AlternadorDeTema";
import { Marca } from "../components/ui/Marca";
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
      <header className="sticky top-0 z-20 border-b border-borda bg-superficie/85 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5">
          <Marca />

          <nav className="flex gap-1">
            {ITENS.map((item) => (
              <NavLink
                key={item.para}
                to={item.para}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-rosa/10 text-rosa"
                      : "text-texto-suave hover:bg-superficie-2 hover:text-texto"
                  }`
                }
              >
                {item.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AlternadorDeTema />

            {usuario && (
              <span className="flex items-center gap-2" title={usuario.email}>
                <Avatar nome={usuario.name} />
                <span className="hidden text-xs font-semibold text-texto sm:inline">
                  {usuario.name}
                </span>
                {usuario.org_role === "admin" && (
                  <span className="rounded-full bg-amarelo px-2 py-0.5 text-[10px] font-black tracking-wide text-azul-escuro uppercase">
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
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-texto-suave transition hover:bg-superficie-2 hover:text-texto disabled:opacity-50"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}

/** Iniciais em circulo, com a cor derivada do nome — mesma pessoa, mesma cor. */
export function Avatar({ nome, tamanho = "sm" }: { nome: string; tamanho?: "sm" | "xs" }) {
  const PALETA = [
    "bg-rosa/15 text-rosa",
    "bg-azul-claro/15 text-azul-claro",
    "bg-laranja/15 text-laranja",
    "bg-verde/25 text-azul-escuro",
  ];
  const indice = [...nome].reduce((soma, c) => soma + c.charCodeAt(0), 0) % PALETA.length;

  return (
    <span
      title={nome}
      className={`flex shrink-0 items-center justify-center rounded-full font-black ${PALETA[indice]} ${
        tamanho === "sm" ? "h-6 w-6 text-[10px]" : "h-5 w-5 text-[9px]"
      }`}
    >
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}
