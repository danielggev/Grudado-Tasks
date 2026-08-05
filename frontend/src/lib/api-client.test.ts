import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./api-client";

function respondeCom(corpo: unknown, init: ResponseInit = {}) {
  // Tipar pelo `typeof fetch` mantem os argumentos capturados em mock.calls
  // com o tipo real, entao as asercoes sobre o request tambem sao verificadas.
  const fetchFalso = vi.fn<typeof fetch>(async () =>
    corpo === undefined
      ? new Response(null, { status: 204, ...init })
      : new Response(JSON.stringify(corpo), {
          status: 200,
          headers: { "Content-Type": "application/json" },
          ...init,
        }),
  );
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("devolve o corpo quando a resposta e bem sucedida", async () => {
    respondeCom({ name: "Daniel" });
    await expect(apiFetch<{ name: string }>("/api/v1/auth/me")).resolves.toEqual({
      name: "Daniel",
    });
  });

  it("envia o cookie de sessao junto", async () => {
    const fetchFalso = respondeCom({ ok: true });
    await apiFetch("/api/v1/auth/me");
    expect(fetchFalso.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });

  it("devolve undefined em 204 sem tentar ler JSON", async () => {
    respondeCom(undefined);
    await expect(apiFetch("/api/v1/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("traduz erro de regra de dominio preservando o campo culpado", async () => {
    respondeCom(
      { detail: "Defina o prazo para comecar a trabalhar nela.", campo: "due_date" },
      { status: 422 },
    );

    const erro = await apiFetch("/api/v1/tarefas/1").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({
      status: 422,
      campo: "due_date",
      message: "Defina o prazo para comecar a trabalhar nela.",
    });
  });

  it("marca 401 como nao autenticado, que e o que decide o redirecionamento ao login", async () => {
    respondeCom({ detail: "Sessao ausente ou expirada." }, { status: 401 });

    const erro = (await apiFetch("/api/v1/auth/me").catch((e: unknown) => e)) as ApiError;
    expect(erro.naoAutenticado).toBe(true);
  });

  it("nao quebra quando o erro vem sem corpo JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>502</html>", { status: 502 })),
    );

    const erro = (await apiFetch("/api/v1/auth/me").catch((e: unknown) => e)) as ApiError;
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(502);
    expect(erro.message).toContain("502");
  });
});
