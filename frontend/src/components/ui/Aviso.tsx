import { ApiError } from "../../lib/api-client";

export function Aviso({ erro }: { erro: unknown }) {
  if (!erro) return null;

  const mensagem =
    erro instanceof ApiError
      ? erro.message
      : "Algo deu errado. Tente novamente em instantes.";

  return (
    <p
      role="alert"
      className="surge flex items-start gap-2 rounded-xl border border-rosa/30 bg-rosa/10 px-3 py-2.5 text-sm font-semibold text-rosa"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12 8v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
      </svg>
      {mensagem}
    </p>
  );
}
