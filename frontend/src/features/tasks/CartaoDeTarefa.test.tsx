import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TarefaResumo } from "./api";
import { CartaoDeTarefa } from "./CartaoDeTarefa";

function tarefa(extra: Partial<TarefaResumo> = {}): TarefaResumo {
  return {
    id: "t1",
    title: "Banner da campanha",
    team_id: "time-1",
    parent_id: null,
    status: "a_fazer",
    priority: "normal",
    due_date: null,
    position: 1000,
    responsaveis: [],
    e_do_time: true,
    total_de_subtarefas: 0,
    subtarefas_concluidas: 0,
    subtarefas: [],
    ...extra,
  };
}

/** Tarefa-mae com tres subtarefas, uma delas concluida. */
function comSubtarefas(): TarefaResumo {
  return tarefa({
    total_de_subtarefas: 3,
    subtarefas_concluidas: 1,
    subtarefas: [
      tarefa({ id: "sub-1", title: "Escolher fotos", parent_id: "t1" }),
      tarefa({ id: "sub-2", title: "Revisar texto", parent_id: "t1" }),
      tarefa({
        id: "sub-3",
        title: "Aprovar arte",
        parent_id: "t1",
        status: "concluido",
      }),
    ],
  });
}

describe("CartaoDeTarefa", () => {
  it("marca tarefa sem responsavel como tarefa do time", () => {
    render(<CartaoDeTarefa tarefa={tarefa()} aoAbrir={() => {}} />);
    expect(screen.getByText("Do time")).toBeInTheDocument();
  });

  it("mostra avatares no lugar do rotulo quando ha responsaveis", () => {
    render(
      <CartaoDeTarefa
        tarefa={tarefa({
          e_do_time: false,
          responsaveis: [
            { id: "u1", email: "ana@grudadoemvoce.com.br", name: "Ana", avatar_url: null },
          ],
        })}
        aoAbrir={() => {}}
      />,
    );
    expect(screen.queryByText("Do time")).not.toBeInTheDocument();
    expect(screen.getByTitle("Ana")).toBeInTheDocument();
  });

  it("sinaliza tarefa atrasada em vez de mostrar a data", () => {
    render(
      <CartaoDeTarefa tarefa={tarefa({ due_date: "2020-01-01" })} aoAbrir={() => {}} />,
    );
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
  });

  it("mostra o progresso das subtarefas e comeca recolhido", () => {
    render(<CartaoDeTarefa tarefa={comSubtarefas()} aoAbrir={() => {}} />);

    expect(screen.getByText("1/3")).toBeInTheDocument();
    // Recolhido por padrao: uma coluna cheia de tarefas quebradas em partes
    // ficaria ilegivel se tudo abrisse de uma vez.
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText("Escolher fotos")).not.toBeInTheDocument();
  });

  it("revela as subtarefas ao expandir", async () => {
    const usuario = userEvent.setup();
    render(<CartaoDeTarefa tarefa={comSubtarefas()} aoAbrir={() => {}} />);

    await usuario.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Escolher fotos")).toBeInTheDocument();
    expect(screen.getByText("Revisar texto")).toBeInTheDocument();
  });

  it("abrir uma subtarefa avisa com o id dela, nao o da mae", async () => {
    const usuario = userEvent.setup();
    const aberta = vi.fn();
    render(<CartaoDeTarefa tarefa={comSubtarefas()} aoAbrir={aberta} />);

    await usuario.click(screen.getByRole("button", { expanded: false }));
    await usuario.click(screen.getByText("Escolher fotos"));

    expect(aberta).toHaveBeenCalledWith("sub-1");
  });

  it("nao mostra nada de prazo quando a tarefa nasceu sem", () => {
    render(<CartaoDeTarefa tarefa={tarefa()} aoAbrir={() => {}} />);
    expect(screen.queryByText("Atrasada")).not.toBeInTheDocument();
  });
});
