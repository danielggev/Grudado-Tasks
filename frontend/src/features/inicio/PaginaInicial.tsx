import { useUsuarioAtual } from "../auth/hooks";

export function PaginaInicial() {
  const { data: usuario } = useUsuarioAtual();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-lg font-semibold text-texto">Ola, {usuario?.name}</h1>
      <p className="mt-1 text-sm text-texto-suave">
        {usuario?.times.length
          ? `Voce participa de ${usuario.times.length} time(s).`
          : "Voce ainda nao faz parte de nenhum time."}
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-borda bg-superficie p-6 text-sm text-texto-suave">
        Times e tarefas entram nas proximas fases.
      </div>
    </div>
  );
}
