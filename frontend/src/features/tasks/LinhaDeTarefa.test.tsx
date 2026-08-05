import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TarefaResumo } from "./api";
import { LinhaDeTarefa } from "./LinhaDeTarefa";

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

describe("LinhaDeTarefa", () => {
  it("mostra 'Sem prazo' quando a tarefa nasceu sem data", () => {
    render(<LinhaDeTarefa tarefa={tarefa()} aoAbrir={() => {}} />);
    expect(screen.getByText("Sem prazo")).toBeInTheDocument();
  });

  it("marca atrasada quando o prazo passou e a tarefa nao esta concluida", () => {
    render(<LinhaDeTarefa tarefa={tarefa({ due_date: "2020-01-01" })} aoAbrir={() => {}} />);
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
  });

  it("tarefa concluida nunca aparece como atrasada, mesmo com prazo vencido", () => {
    render(
      <LinhaDeTarefa
        tarefa={tarefa({ due_date: "2020-01-01", status: "concluido" })}
        aoAbrir={() => {}}
      />,
    );
    expect(screen.queryByText("Atrasada")).not.toBeInTheDocument();
  });

  it("mostra o nome do time quando pedido (contexto Minhas Tarefas)", () => {
    render(
      <LinhaDeTarefa tarefa={tarefa()} mostraTime nomeDoTime="Design" aoAbrir={() => {}} />,
    );
    expect(screen.getByText("Design")).toBeInTheDocument();
  });
});
