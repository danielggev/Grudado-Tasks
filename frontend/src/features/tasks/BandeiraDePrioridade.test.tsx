import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TaskPriority } from "./api";
import { BandeiraDePrioridade } from "./BandeiraDePrioridade";

const CORES: Record<TaskPriority, string> = {
  urgente: "text-rosa",
  alta: "text-amarelo",
  normal: "text-azul-claro",
  baixa: "text-texto-suave",
};

describe("BandeiraDePrioridade", () => {
  it.each(Object.entries(CORES))("pinta %s com a cor combinada", (prioridade, classe) => {
    const { container } = render(
      <BandeiraDePrioridade prioridade={prioridade as TaskPriority} />,
    );
    expect(container.querySelector("svg")).toHaveClass(classe);
  });

  it("nomeia a prioridade para quem nao enxerga a cor", () => {
    render(<BandeiraDePrioridade prioridade="urgente" />);
    // A cor sozinha nao pode carregar a informacao: o rotulo acessivel e o que
    // garante que a prioridade chega a quem usa leitor de tela.
    expect(screen.getByRole("img", { name: "Prioridade Urgente" })).toBeInTheDocument();
  });
});
