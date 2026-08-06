import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderizaComProviders } from "../../test-utils";
import type { Mensagem } from "./api";
import { ChatDoTime } from "./ChatDoTime";

const EU = { id: "u-eu", email: "eu@grudadoemvoce.com.br", name: "Daniel", avatar_url: null };
const ANA = { id: "u-ana", email: "ana@grudadoemvoce.com.br", name: "Ana", avatar_url: null };

function mensagem(extra: Partial<Mensagem> = {}): Mensagem {
  return {
    id: "m1",
    autor: ANA,
    body: "Bom dia",
    created_at: "2026-08-06T12:00:00Z",
    excluida: false,
    ...extra,
  };
}

/** Responde /auth/me e a conversa; o resto cai em 404. */
function servidorFalso(mensagens: Mensagem[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (entrada) => {
      const url = String(entrada);
      const json = (dado: unknown) =>
        new Response(JSON.stringify(dado), {
          headers: { "Content-Type": "application/json" },
        });

      if (url.includes("/auth/me")) {
        return json({ ...EU, org_role: "member", times: [], times_como_lead: [] });
      }
      if (url.includes("/mensagens")) return json({ mensagens, cursor: null });
      return new Response("{}", { status: 404 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ChatDoTime", () => {
  it("mostra o vazio antes de existir conversa", async () => {
    servidorFalso([]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    expect(await screen.findByText(/Nenhuma mensagem ainda/)).toBeInTheDocument();
  });

  it("chama de 'Você' as proprias mensagens", async () => {
    servidorFalso([mensagem({ autor: EU })]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    expect(await screen.findByText("Você")).toBeInTheDocument();
    expect(screen.queryByText("Daniel")).not.toBeInTheDocument();
  });

  it("agrupa mensagens seguidas da mesma pessoa sem repetir o nome", async () => {
    servidorFalso([
      mensagem({ id: "m1", body: "primeira", created_at: "2026-08-06T12:00:00Z" }),
      mensagem({ id: "m2", body: "segunda", created_at: "2026-08-06T12:01:00Z" }),
    ]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    await screen.findByText("primeira");
    // As duas aparecem, mas o nome so uma vez -- repeti-lo a cada linha poluiria.
    expect(screen.getByText("segunda")).toBeInTheDocument();
    expect(screen.getAllByText("Ana")).toHaveLength(1);
  });

  it("nao agrupa quando ha muito tempo entre as mensagens", async () => {
    servidorFalso([
      mensagem({ id: "m1", body: "cedo", created_at: "2026-08-06T12:00:00Z" }),
      mensagem({ id: "m2", body: "muito depois", created_at: "2026-08-06T14:00:00Z" }),
    ]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    await screen.findByText("cedo");
    expect(screen.getAllByText("Ana")).toHaveLength(2);
  });

  it("mensagem apagada deixa a lacuna, nao some", async () => {
    servidorFalso([mensagem({ body: "", excluida: true })]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    expect(await screen.findByText("Mensagem apagada")).toBeInTheDocument();
  });

  it("membro comum nao pode apagar a mensagem de outra pessoa", async () => {
    servidorFalso([mensagem({ autor: ANA })]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    await screen.findByText("Bom dia");
    expect(
      screen.queryByRole("button", { name: /Apagar mensagem de Ana/ }),
    ).not.toBeInTheDocument();
  });

  it("quem modera apaga a mensagem de qualquer um", async () => {
    servidorFalso([mensagem({ autor: ANA })]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Apagar mensagem de Ana/ }),
      ).toBeInTheDocument(),
    );
  });

  it("qualquer um apaga a propria mensagem", async () => {
    servidorFalso([mensagem({ autor: EU })]);
    renderizaComProviders(<ChatDoTime teamId="t1" podeModerar={false} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Apagar mensagem de Daniel/ }),
      ).toBeInTheDocument(),
    );
  });
});
