export class ApiError extends Error {
  readonly status: number;
  /** Campo culpado, quando o backend soube apontar. Ver RegraDeDominioViolada. */
  readonly campo?: string;

  constructor(status: number, message: string, campo?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.campo = campo;
  }

  get naoAutenticado(): boolean {
    return this.status === 401;
  }
}

type CorpoDeErro = { detail?: string; campo?: string };

export async function apiFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(caminho, {
    // O cookie de sessao e HttpOnly: o JS nunca o le, so pede ao navegador que o envie.
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!resposta.ok) {
    let corpo: CorpoDeErro = {};
    try {
      corpo = (await resposta.json()) as CorpoDeErro;
    } catch {
      // Resposta sem corpo JSON (502 de proxy, por exemplo).
    }
    throw new ApiError(
      resposta.status,
      corpo.detail ?? `Falha na requisicao (${resposta.status}).`,
      corpo.campo,
    );
  }

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
