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
      className="rounded-lg border border-urgente/30 bg-urgente/10 px-3 py-2 text-sm text-urgente"
    >
      {mensagem}
    </p>
  );
}
