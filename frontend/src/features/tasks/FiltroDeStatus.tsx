import { MenuSuspenso } from "../../components/ui/MenuSuspenso";
import type { TaskStatus } from "./api";
import { COR_STATUS, ORDEM_STATUS, ROTULO_STATUS } from "./prioridade";

/**
 * Filtro de status da coluna.
 *
 * A mecanica do menu (clique fora, Esc, devolucao de foco) vive no
 * MenuSuspenso; aqui fica so o que e do filtro.
 */
export function FiltroDeStatus({
  valor,
  aoMudar,
}: {
  valor: TaskStatus | null;
  aoMudar: (status: TaskStatus | null) => void;
}) {
  const ativo = valor !== null;

  return (
    <MenuSuspenso
      rotulo={
        ativo ? `Filtrando por ${ROTULO_STATUS[valor]}. Mudar filtro` : "Filtrar por status"
      }
      icone={<IconeFunil />}
      ativo={ativo}
      largura="w-44"
    >
      {(fechar) => (
        <>
          <Opcao
            rotulo="Todas"
            selecionada={valor === null}
            aoEscolher={() => {
              aoMudar(null);
              fechar();
            }}
          />
          {ORDEM_STATUS.map((status) => (
            <Opcao
              key={status}
              rotulo={ROTULO_STATUS[status]}
              cor={COR_STATUS[status]}
              selecionada={valor === status}
              aoEscolher={() => {
                aoMudar(status);
                fechar();
              }}
            />
          ))}
        </>
      )}
    </MenuSuspenso>
  );
}

function Opcao({
  rotulo,
  cor,
  selecionada,
  aoEscolher,
}: {
  rotulo: string;
  cor?: string;
  selecionada: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selecionada}
      onClick={aoEscolher}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold transition hover:bg-superficie-2 ${
        selecionada ? "text-texto" : "text-texto-suave"
      }`}
    >
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${cor ?? ""}`} />
      {rotulo}
      {selecionada && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="ml-auto text-azul-claro"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function IconeFunil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 5h17l-6.5 7.5V20l-4 1.5v-9L3.5 5z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
