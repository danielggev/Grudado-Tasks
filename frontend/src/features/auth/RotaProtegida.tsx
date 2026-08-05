import { Navigate, Outlet } from "react-router-dom";

import { ApiError } from "../../lib/api-client";
import { useUsuarioAtual } from "./hooks";

export function RotaProtegida() {
  const { data, isPending, error } = useUsuarioAtual();

  if (isPending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-full items-center justify-center text-sm text-texto-suave"
      >
        Carregando...
      </div>
    );
  }

  if (error instanceof ApiError && error.naoAutenticado) {
    return <Navigate to="/entrar" replace />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-center text-sm text-texto-suave">
        Nao foi possivel carregar sua sessao. Recarregue a pagina.
      </div>
    );
  }

  return <Outlet />;
}
