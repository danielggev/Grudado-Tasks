import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
    ...extra,
  };
}

describe("CartaoDeTarefa", () => {
  it("marca tarefa sem responsavel como tarefa do time", () => {
    render(<CartaoDeTarefa tarefa={tarefa()} aoAbrir={() => {}} />);
    expect(screen.getByText("Tarefa do time")).toBeInTheDocument();
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
    expect(screen.queryByText("Tarefa do time")).not.toBeInTheDocument();
    expect(screen.getByTitle("Ana")).toBeInTheDocument();
  });

  it("sinaliza tarefa atrasada em vez de mostrar a data", () => {
    render(
      <CartaoDeTarefa tarefa={tarefa({ due_date: "2020-01-01" })} aoAbrir={() => {}} />,
    );
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
  });

  it("mostra o progresso das subtarefas", () => {
    render(
      <CartaoDeTarefa
        tarefa={tarefa({ total_de_subtarefas: 3, subtarefas_concluidas: 1 })}
        aoAbrir={() => {}}
      />,
    );
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("nao mostra nada de prazo quando a tarefa nasceu sem", () => {
    render(<CartaoDeTarefa tarefa={tarefa()} aoAbrir={() => {}} />);
    expect(screen.queryByText("Atrasada")).not.toBeInTheDocument();
  });
});
