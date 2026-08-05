import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";

/**
 * Cantos em pill e peso alto vem do manual da marca -- e o DNA "arredondado
 * sempre". O `uppercase` dos botoes do manual fica so no primario: aplicado a
 * toda a interface, gritaria numa tela com dezenas de acoes.
 */
const ESTILOS: Record<Variante, string> = {
  primario:
    "bg-verde text-azul-escuro font-semibold uppercase tracking-wide hover:brightness-95 shadow-suave",
  secundario:
    "border border-borda bg-superficie text-texto font-semibold hover:bg-superficie-2",
  fantasma: "text-texto-suave font-semibold hover:bg-superficie-2 hover:text-texto",
  perigo: "border border-rosa/40 text-rosa font-semibold hover:bg-rosa/10",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
};

export function Botao({ variante = "secundario", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      // `type` explicito: dentro de <form> o padrao do HTML e "submit", o que
      // faz botao de acao secundaria enviar o formulario sem querer.
      type={props.type ?? "button"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${ESTILOS[variante]} ${className}`}
    />
  );
}
