import type { Anexo, Escopo } from "./api";
import { urlDoAnexo } from "./api";
import { formataTamanho } from "./tamanho";

/**
 * Anexos de uma mensagem.
 *
 * Imagem aparece na conversa; qualquer outra coisa vira um cartao de download.
 * Quem decide o que e imagem e o servidor (`e_imagem`) -- inferir pelo nome ou
 * pelo content_type no cliente permitiria tentar renderizar o que nao deve.
 */
export function AnexosDaMensagem({
  anexos,
  escopo,
}: {
  anexos: Anexo[];
  escopo: Escopo;
}) {
  if (anexos.length === 0) return null;

  const imagens = anexos.filter((a) => a.e_imagem);
  const arquivos = anexos.filter((a) => !a.e_imagem);

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {imagens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {imagens.map((anexo) => (
            <a
              key={anexo.id}
              href={urlDoAnexo(escopo, anexo.id)}
              target="_blank"
              rel="noreferrer"
              title={`${anexo.filename} · ${formataTamanho(anexo.size_bytes)}`}
              className="block overflow-hidden rounded-xl border border-borda transition hover:border-azul-claro"
            >
              <img
                src={urlDoAnexo(escopo, anexo.id)}
                alt={anexo.filename}
                loading="lazy"
                className="max-h-44 max-w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}

      {arquivos.map((anexo) => (
        <a
          key={anexo.id}
          href={urlDoAnexo(escopo, anexo.id)}
          // `download` reforca o Content-Disposition que o servidor ja manda.
          download={anexo.filename}
          className="flex items-center gap-2 rounded-xl border border-borda bg-superficie-2 px-2.5 py-2 transition hover:border-azul-claro"
        >
          <IconeArquivo />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-texto">
              {anexo.filename}
            </span>
            <span className="block text-[10px] text-texto-suave">
              {formataTamanho(anexo.size_bytes)}
            </span>
          </span>
          <IconeBaixar />
        </a>
      ))}
    </div>
  );
}

function IconeArquivo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-azul-claro"
    >
      <path
        d="M14 3v5h5M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeBaixar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-texto-suave"
    >
      <path
        d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
