import { Botao } from "./Botao";
import { Dialogo } from "./Dialogo";

/**
 * Substitui o `confirm()` nativo.
 *
 * O nativo bloqueia a thread, ignora o tema do app, nao e estilizavel e alguns
 * navegadores permitem suprimi-lo -- num app que exclui tarefa com subtarefa
 * junto, a confirmacao precisa aparecer sempre e deixar claro o que se perde.
 */
export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = "Confirmar",
  emAndamento = false,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  emAndamento?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <Dialogo aberto={aberto} titulo={titulo} aoFechar={aoCancelar}>
      <p className="text-sm leading-relaxed text-texto-suave">{mensagem}</p>

      <div className="mt-6 flex justify-end gap-2">
        <Botao onClick={aoCancelar}>Cancelar</Botao>
        <Botao variante="perigo" disabled={emAndamento} onClick={aoConfirmar}>
          {emAndamento ? "Excluindo..." : rotuloConfirmar}
        </Botao>
      </div>
    </Dialogo>
  );
}
