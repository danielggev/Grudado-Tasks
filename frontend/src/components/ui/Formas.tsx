/**
 * Formas geometricas arredondadas — o elemento decorativo da marca.
 *
 * Ficam restritas aos momentos de respiro (login, estados vazios): sao o que
 * da personalidade sem competir com a leitura. Numa lista densa de tarefas
 * seriam ruido.
 */

export function TrianguloArredondado({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 8 L92 85 Q94 90 89 92 L11 92 Q6 90 8 85 Z" fill="currentColor" />
    </svg>
  );
}

export function QuadradoArredondado({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect x="8" y="8" width="84" height="84" rx="18" fill="currentColor" />
    </svg>
  );
}

export function Circulo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="currentColor" />
    </svg>
  );
}

/**
 * Composicao decorativa para o fundo de areas vazias. Escalas e cores
 * variadas, levemente sobrepostas — o "geometrico brincalhao" do manual.
 */
export function ComposicaoDecorativa({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <Circulo className="absolute -top-6 right-4 h-16 w-16 text-amarelo opacity-70" />
      <QuadradoArredondado className="absolute bottom-0 -left-4 h-20 w-20 rotate-12 text-verde opacity-50" />
      <TrianguloArredondado className="absolute top-8 left-1/3 h-10 w-10 -rotate-12 text-rosa opacity-45" />
      <Circulo className="absolute -bottom-4 right-1/4 h-8 w-8 text-azul-claro opacity-60" />
    </div>
  );
}
