/** Cor de destaque por time — estavel, derivada do id: o mesmo time sempre
    aparece com a mesma cor, em qualquer tela. */
const SOTAQUES = ["bg-rosa", "bg-azul-claro", "bg-laranja", "bg-verde", "bg-amarelo"];

export function sotaqueDe(id: string): string {
  const soma = [...id].reduce((total, c) => total + c.charCodeAt(0), 0);
  return SOTAQUES[soma % SOTAQUES.length];
}
