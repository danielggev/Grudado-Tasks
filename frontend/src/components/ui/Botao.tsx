import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "perigo";

const ESTILOS: Record<Variante, string> = {
  primario: "bg-marca text-white hover:opacity-90",
  secundario: "border border-borda bg-superficie text-texto hover:bg-superficie-2",
  perigo: "border border-urgente/40 bg-superficie text-urgente hover:bg-urgente/10",
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${ESTILOS[variante]} ${className}`}
    />
  );
}
