import { useState } from "react";

import { aplicaTema, temaSalvo, type Tema } from "../../lib/tema";

export function AlternadorDeTema() {
  const [tema, setTema] = useState<Tema>(temaSalvo);

  function alterna() {
    const proximo: Tema = tema === "claro" ? "escuro" : "claro";
    aplicaTema(proximo);
    setTema(proximo);
  }

  const irPara = tema === "claro" ? "escuro" : "claro";

  return (
    <button
      type="button"
      onClick={alterna}
      aria-label={`Mudar para tema ${irPara}`}
      title={`Tema ${irPara}`}
      className="flex h-8 w-8 items-center justify-center rounded-full text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
    >
      {tema === "claro" ? <IconeLua /> : <IconeSol />}
    </button>
  );
}

function IconeLua() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
