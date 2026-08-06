import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Avatar } from "../../app/Layout";
import { Aviso } from "../../components/ui/Aviso";
import { Esqueleto } from "../../components/ui/Esqueleto";
import { useUsuarioAtual } from "../auth/hooks";
import { AnexosDaMensagem } from "./AnexosDaMensagem";
import type { Escopo, Mensagem } from "./api";
import { formataTamanho } from "./tamanho";
import {
  useConversa,
  useEnviarMensagem,
  useExcluirMensagem,
  useSincronizacaoDaConversa,
} from "./hooks";

/** Espelha o limite do backend (domain/anexos.py) só para evitar a viagem. */
const MAXIMO_DE_ANEXOS = 5;

/** Filtro do seletor de arquivos; a lista que vale é a do servidor. */
const TIPOS_ACEITOS = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  ".pdf",
  ".txt",
  ".csv",
  ".zip",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
].join(",");

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const DIA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function Chat({
  escopo,
  titulo,
  podeModerar,
  compacto = false,
}: {
  escopo: Escopo;
  titulo: string;
  /** Lead e admin apagam mensagem de qualquer um; o resto so a propria. */
  podeModerar: boolean;
  /** Dentro do dialogo de tarefa ha menos espaco que na tela do time. */
  compacto?: boolean;
}) {
  const { mensagens, carregando, erro, haAnteriores, carregandoAnteriores, carregaAnteriores } =
    useConversa(escopo);
  const { data: eu } = useUsuarioAtual();
  const enviar = useEnviarMensagem(escopo);

  useSincronizacaoDaConversa(escopo);

  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const seletor = useRef<HTMLInputElement>(null);
  const rolagem = useRef<HTMLDivElement>(null);
  const ultimaId = mensagens.at(-1)?.id;

  // Desce ao chegar mensagem nova. Depende do id da ultima, e nao do tamanho
  // da lista: carregar historico anterior tambem aumenta o tamanho, e ali a
  // rolagem precisa ficar onde esta.
  useEffect(() => {
    const caixa = rolagem.current;
    if (caixa) caixa.scrollTop = caixa.scrollHeight;
  }, [ultimaId]);

  function envia(evento: FormEvent) {
    evento.preventDefault();
    const corpo = texto.trim();
    if (!corpo && arquivos.length === 0) return;

    // Limpa antes da resposta: a mensagem reaparece pela query, e esperar o
    // servidor para liberar o campo trava quem escreve rapido.
    setTexto("");
    setArquivos([]);
    enviar.mutate({ body: corpo, arquivos });
  }

  function adiciona(novos: FileList | null) {
    if (!novos?.length) return;
    setArquivos((atual) => [...atual, ...Array.from(novos)].slice(0, MAXIMO_DE_ANEXOS));
    // Zera o input: sem isso, escolher o mesmo arquivo duas vezes seguidas
    // nao dispara `change` e parece que nada aconteceu.
    if (seletor.current) seletor.current.value = "";
  }

  /** Ctrl+V de um print cola direto, sem passar por salvar em arquivo. */
  function cola(evento: ClipboardEvent<HTMLTextAreaElement>) {
    const doArea = Array.from(evento.clipboardData.files);
    if (doArea.length > 0) {
      evento.preventDefault();
      setArquivos((atual) => [...atual, ...doArea].slice(0, MAXIMO_DE_ANEXOS));
    }
  }

  function atalho(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia, Shift+Enter quebra linha -- convencao de todo chat.
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      envia(evento as unknown as FormEvent);
    }
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-borda bg-superficie shadow-suave">
      <header className="flex shrink-0 items-center gap-2 border-b border-borda px-4 py-2.5">
        <IconeBalao />
        <h2 className="text-xs font-black tracking-wide text-texto uppercase">{titulo}</h2>
      </header>

      <div ref={rolagem} className="flex-1 overflow-y-auto px-4 py-3">
        {carregando ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2">
                <Esqueleto className="h-6 w-6 rounded-full" />
                <Esqueleto className="h-10 flex-1" />
              </div>
            ))}
          </div>
        ) : erro ? (
          <Aviso erro={erro} />
        ) : mensagens.length === 0 ? (
          <p className={`text-center text-xs text-texto-suave ${compacto ? "py-6" : "py-10"}`}>
            Nenhuma mensagem ainda.
            <br />
            {escopo.tipo === "tarefa"
              ? "Combine os detalhes desta tarefa por aqui."
              : "Comece a conversa do time por aqui."}
          </p>
        ) : (
          <>
            {haAnteriores && (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void carregaAnteriores()}
                  disabled={carregandoAnteriores}
                  className="rounded-full bg-superficie-2 px-3 py-1 text-[11px] font-semibold text-texto-suave transition hover:text-texto disabled:opacity-50"
                >
                  {carregandoAnteriores ? "Carregando..." : "Ver mensagens anteriores"}
                </button>
              </div>
            )}

            <ol className="flex flex-col gap-2.5">
              {mensagens.map((mensagem, indice) => (
                <ItemDeMensagem
                  key={mensagem.id}
                  mensagem={mensagem}
                  anterior={mensagens[indice - 1]}
                  souEu={mensagem.autor.id === eu?.id}
                  podeApagar={podeModerar || mensagem.autor.id === eu?.id}
                  escopo={escopo}
                />
              ))}
            </ol>
          </>
        )}
      </div>

      <form onSubmit={envia} className="shrink-0 border-t border-borda p-2.5">
        {arquivos.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {arquivos.map((arquivo, indice) => (
              <li
                key={`${arquivo.name}-${indice}`}
                className="flex items-center gap-1.5 rounded-full bg-superficie-2 py-1 pr-1 pl-2.5"
              >
                <span className="max-w-40 truncate text-[11px] font-semibold text-texto">
                  {arquivo.name}
                </span>
                <span className="text-[10px] text-texto-suave">
                  {formataTamanho(arquivo.size)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setArquivos((atual) => atual.filter((_, i) => i !== indice))
                  }
                  aria-label={`Remover ${arquivo.name}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-texto-suave transition hover:bg-rosa/15 hover:text-rosa"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={seletor}
            type="file"
            multiple
            hidden
            accept={TIPOS_ACEITOS}
            onChange={(e) => adiciona(e.target.files)}
          />
          <button
            type="button"
            onClick={() => seletor.current?.click()}
            disabled={arquivos.length >= MAXIMO_DE_ANEXOS}
            aria-label="Anexar arquivo"
            title={
              arquivos.length >= MAXIMO_DE_ANEXOS
                ? `Máximo de ${MAXIMO_DE_ANEXOS} arquivos`
                : "Anexar arquivo"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-suave transition hover:bg-superficie-2 hover:text-texto disabled:opacity-40"
          >
            <IconeClipe />
          </button>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={atalho}
            onPaste={cola}
            rows={1}
            maxLength={4000}
            placeholder="Escreva para o time..."
            aria-label="Mensagem"
            className="max-h-28 min-h-9 flex-1 resize-none rounded-xl border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-azul-claro"
          />

          <button
            type="submit"
            disabled={(!texto.trim() && arquivos.length === 0) || enviar.isPending}
            aria-label="Enviar mensagem"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-verde text-azul-escuro transition hover:brightness-95 disabled:opacity-40"
          >
            <IconeEnviar />
          </button>
        </div>
        <Aviso erro={enviar.error} />
      </form>
    </section>
  );
}

function ItemDeMensagem({
  mensagem,
  anterior,
  souEu,
  podeApagar,
  escopo,
}: {
  mensagem: Mensagem;
  anterior: Mensagem | undefined;
  souEu: boolean;
  podeApagar: boolean;
  escopo: Escopo;
}) {
  const excluir = useExcluirMensagem(escopo);

  const quando = new Date(mensagem.created_at);
  const diaAnterior = anterior ? new Date(anterior.created_at).toDateString() : null;
  const abreDia = quando.toDateString() !== diaAnterior;

  // Mensagens seguidas da mesma pessoa no mesmo minuto viram um bloco so --
  // repetir nome e avatar a cada linha polui a leitura.
  const agrupada =
    !abreDia &&
    anterior?.autor.id === mensagem.autor.id &&
    quando.getTime() - new Date(anterior.created_at).getTime() < 5 * 60_000;

  return (
    <>
      {abreDia && (
        <li className="my-1 flex items-center gap-2" aria-hidden="true">
          <span className="h-px flex-1 bg-borda" />
          <span className="text-[10px] font-semibold text-texto-suave">
            {DIA.format(quando)}
          </span>
          <span className="h-px flex-1 bg-borda" />
        </li>
      )}

      <li className="group flex gap-2">
        <span className={agrupada ? "w-6 shrink-0" : "shrink-0"}>
          {!agrupada && <Avatar nome={mensagem.autor.name} tamanho="xs" />}
        </span>

        <div className="min-w-0 flex-1">
          {!agrupada && (
            <p className="flex items-baseline gap-2">
              <span className="text-xs font-black text-texto">
                {souEu ? "Você" : mensagem.autor.name}
              </span>
              <span className="text-[10px] text-texto-suave">{HORA.format(quando)}</span>
            </p>
          )}

          {mensagem.excluida ? (
            <p className="text-xs text-texto-suave italic">Mensagem apagada</p>
          ) : (
            <>
              {mensagem.body && (
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-texto">
                  {mensagem.body}
                </p>
              )}
              <AnexosDaMensagem anexos={mensagem.anexos} escopo={escopo} />
            </>
          )}
        </div>

        {podeApagar && !mensagem.excluida && (
          <button
            type="button"
            onClick={() => excluir.mutate(mensagem.id)}
            disabled={excluir.isPending}
            aria-label={`Apagar mensagem de ${mensagem.autor.name}`}
            title="Apagar"
            // Só aparece no hover/foco: um botao de apagar visivel em toda
            // mensagem transformaria a conversa numa parede de icones.
            className="h-6 w-6 shrink-0 rounded-full text-texto-suave opacity-0 transition group-hover:opacity-100 hover:bg-rosa/10 hover:text-rosa focus-visible:opacity-100"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="mx-auto"
            >
              <path
                d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </li>
    </>
  );
}

function IconeBalao() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-azul-claro"
    >
      <path
        d="M21 12a8 8 0 01-8 8H4l2.2-2.6A8 8 0 1121 12z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeClipe() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5l-8.6 8.6a5 5 0 01-7-7l8.9-8.9a3.3 3.3 0 014.7 4.7l-8.9 8.9a1.7 1.7 0 01-2.3-2.3l8.2-8.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeEnviar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12l16-8-6 8 6 8-16-8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
