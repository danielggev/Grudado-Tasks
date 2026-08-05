/**
 * Placeholder com a forma do conteudo que esta chegando.
 *
 * Substitui o "Carregando..." em texto: manter o esqueleto do layout evita que
 * a tela salte quando o dado chega, e da a impressao de resposta mais rapida
 * mesmo com a mesma latencia.
 */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`esqueleto ${className}`} />;
}

export function EsqueletoDeCartao() {
  return (
    <div className="rounded-card border border-borda bg-superficie p-3">
      <Esqueleto className="h-4 w-3/4" />
      <div className="mt-3 flex gap-1.5">
        <Esqueleto className="h-4 w-14 rounded-full" />
        <Esqueleto className="h-4 w-12 rounded-full" />
      </div>
      <Esqueleto className="mt-3 h-5 w-5 rounded-full" />
    </div>
  );
}

export function EsqueletoDeLinha() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Esqueleto className="h-4 flex-1" />
      <Esqueleto className="h-4 w-24" />
      <Esqueleto className="h-4 w-16 rounded-full" />
      <Esqueleto className="h-4 w-16" />
    </div>
  );
}
