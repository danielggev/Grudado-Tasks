import { URL_DE_LOGIN } from "./api";

export function PaginaDeLogin() {
  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-borda bg-superficie p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-texto">Grudado Tasks</h1>
        <p className="mt-2 text-sm text-texto-suave">
          Gestao de demandas dos times da Grudado em Voce.
        </p>

        {/* Link, nao fetch: o login e um redirecionamento de navegador de ponta a
            ponta, e o cookie de estado do OAuth precisa ser gravado pelo servidor. */}
        <a
          href={URL_DE_LOGIN}
          className="mt-8 flex w-full items-center justify-center rounded-lg bg-marca px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
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
