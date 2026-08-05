export type Tema = "claro" | "escuro";

const CHAVE = "grudado-tasks:tema";

/**
 * Claro e o padrao, por decisao de marca -- o manual da Grudado proibe escuro
 * como padrao. Diferente do resto do app, aqui NAO se consulta
 * `prefers-color-scheme`: escuro so acontece se a pessoa pedir.
 */
export function temaSalvo(): Tema {
  return localStorage.getItem(CHAVE) === "escuro" ? "escuro" : "claro";
}

export function aplicaTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema;
  localStorage.setItem(CHAVE, tema);
}

/**
 * Chamado antes do React montar (ver main.tsx).
 *
 * Se esperasse o primeiro render, quem usa tema escuro veria um flash branco a
 * cada carregamento -- o "flash of unstyled theme", que denuncia amadorismo mais
 * rapido que qualquer outro detalhe.
 */
export function aplicaTemaInicial(): void {
  document.documentElement.dataset.tema = temaSalvo();
}
