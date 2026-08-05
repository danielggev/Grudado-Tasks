import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderizaComProviders } from "../../test-utils";
import type { MembroDoTime, TimeDetalhe } from "./api";
import { GestaoDeMembros } from "./GestaoDeMembros";

function membro(nome: string, role: "lead" | "member"): MembroDoTime {
  return {
    usuario: {
      id: `id-${nome}`,
      email: `${nome}@grudadoemvoce.com.br`,
      name: nome,
      avatar_url: null,
    },
    role,
    joined_at: "2026-08-01T12:00:00Z",
  };
}

function time(membros: MembroDoTime[], archived_at: string | null = null): TimeDetalhe {
  return {
    id: "time-1",
    name: "Design",
    slug: "design",
    description: null,
    archived_at,
    total_de_membros: membros.length,
    membros,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function semUsuariosDisponiveis() {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(
      async () =>
        new Response("[]", { headers: { "Content-Type": "application/json" } }),
    ),
  );
}

describe("GestaoDeMembros", () => {
  it("mostra o papel como texto para quem nao gerencia o time", () => {
    semUsuariosDisponiveis();
    renderizaComProviders(
      <GestaoDeMembros time={time([membro("ana", "lead")])} podeGerenciar={false} />,
    );

    expect(screen.getByText("Lead")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /papel de/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument();
  });

  it("bloqueia mexer no unico lead, que e a regra que deixaria o time orfao", () => {
    semUsuariosDisponiveis();
    renderizaComProviders(
      <GestaoDeMembros
        time={time([membro("ana", "lead"), membro("bruno", "member")])}
        podeGerenciar
      />,
    );

    expect(screen.getByRole("combobox", { name: "Papel de ana" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Papel de bruno" })).toBeEnabled();
  });

  it("libera os controles assim que existe um segundo lead", () => {
    semUsuariosDisponiveis();
    renderizaComProviders(
      <GestaoDeMembros
        time={time([membro("ana", "lead"), membro("bruno", "lead")])}
        podeGerenciar
      />,
    );

    expect(screen.getByRole("combobox", { name: "Papel de ana" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Papel de bruno" })).toBeEnabled();
  });

  it("esconde a gestao quando o time esta arquivado", () => {
    semUsuariosDisponiveis();
    renderizaComProviders(
      <GestaoDeMembros
        time={time([membro("ana", "lead")], "2026-08-01T12:00:00Z")}
        podeGerenciar
      />,
    );

    expect(screen.queryByRole("combobox", { name: /papel de/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Pessoa a adicionar" }),
    ).not.toBeInTheDocument();
  });
});
