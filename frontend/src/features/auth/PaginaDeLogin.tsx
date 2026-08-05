import { Circulo, QuadradoArredondado, TrianguloArredondado } from "../../components/ui/Formas";
import { Marca } from "../../components/ui/Marca";
import { URL_DE_LOGIN } from "./api";

export function PaginaDeLogin() {
  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden p-6">
      {/* Formas da marca em escalas variadas — o unico lugar do app onde elas
          aparecem grandes, porque aqui nao ha conteudo para competir. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        <QuadradoArredondado className="absolute -top-16 -left-10 h-56 w-56 rotate-12 text-amarelo opacity-25" />
        <Circulo className="absolute top-1/4 -right-16 h-72 w-72 text-azul-claro opacity-20" />
        <TrianguloArredondado className="absolute -bottom-14 left-1/4 h-48 w-48 -rotate-12 text-verde opacity-25" />
        <Circulo className="absolute bottom-1/3 left-10 h-16 w-16 text-rosa opacity-30" />
      </div>

      <div className="surge relative w-full max-w-sm rounded-card border border-borda bg-superficie p-8 shadow-alta">
        <Marca />

        <h1 className="mt-6 text-2xl leading-tight font-black text-texto">
          As demandas do time,
          <br />
          num lugar só.
        </h1>
        <div className="mt-3 h-1 w-12 rounded-full bg-rosa" />

        <p className="mt-4 text-sm leading-relaxed text-texto-suave">
          Entre com a conta da empresa para ver os boards dos seus times.
        </p>

        {/* Link, nao fetch: o login e um redirecionamento de navegador de ponta
            a ponta, e o cookie de estado do OAuth precisa ser gravado pelo
            servidor. */}
        <a
          href={URL_DE_LOGIN}
          className="mt-7 flex w-full items-center justify-center rounded-full bg-verde px-4 py-3 text-xs font-semibold tracking-wide text-azul-escuro uppercase shadow-suave transition hover:brightness-95"
        >
          Entrar com a conta da empresa
        </a>

        <p className="mt-4 text-center text-xs text-texto-suave">
          Acesso restrito a contas @grudadoemvoce.com.br
        </p>
      </div>
    </main>
  );
}
