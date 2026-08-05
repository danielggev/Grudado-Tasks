/**
 * Marca do app: os dois Grudadinhos + nome.
 *
 * Os mascotes seguem o manual — Quadrado em Azul Claro e Verde, Triangulo em
 * Rosa e Laranja, ambos com contorno Azul Escuro. Como e um app interno e nao
 * material de marca, o logo oficial nao e reproduzido: isso e uma marca de
 * produto derivada, o que evita as regras de "nao recolorir / nao deformar".
 */
export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Grudadinhos />
      {!compacta && (
        <span className="text-sm leading-none font-black tracking-tight text-texto">
          Grudado <span className="text-rosa">Tasks</span>
        </span>
      )}
    </span>
  );
}

function Grudadinhos() {
  return (
    <svg width="26" height="22" viewBox="0 0 52 44" aria-hidden="true">
      {/* Quadrado */}
      <rect
        x="2.5"
        y="10.5"
        width="21"
        height="21"
        rx="6"
        fill="#05C3DE"
        stroke="#253746"
        strokeWidth="2.5"
      />
      <path d="M13 10.5h10.5v21H13z" fill="#8EDD65" opacity="0.9" />
      <rect
        x="2.5"
        y="10.5"
        width="21"
        height="21"
        rx="6"
        fill="none"
        stroke="#253746"
        strokeWidth="2.5"
      />

      {/* Triangulo */}
      <path
        d="M38 8 L50 30 Q51 33 48 33 L28 33 Q25 33 26 30 Z"
        fill="#FF6A39"
        stroke="#253746"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M38 8 L44 19 L32 19 Z" fill="#EF426F" />
      <path
        d="M38 8 L50 30 Q51 33 48 33 L28 33 Q25 33 26 30 Z"
        fill="none"
        stroke="#253746"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
