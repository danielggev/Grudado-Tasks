import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FiltroDeStatus } from "./FiltroDeStatus";

describe("FiltroDeStatus", () => {
  it("comeca fechado", () => {
    render(<FiltroDeStatus valor={null} aoMudar={() => {}} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("lista as tres fases mais a opcao de limpar", async () => {
    const usuario = userEvent.setup();
    render(<FiltroDeStatus valor={null} aoMudar={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: "Filtrar por status" }));

    expect(screen.getByRole("menuitemradio", { name: /Todas/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Pendente/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Em progresso/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Concluído/ })).toBeInTheDocument();
  });

  it("avisa a escolha e fecha o menu", async () => {
    const usuario = userEvent.setup();
    const mudou = vi.fn();
    render(<FiltroDeStatus valor={null} aoMudar={mudou} />);

    await usuario.click(screen.getByRole("button", { name: "Filtrar por status" }));
    await usuario.click(screen.getByRole("menuitemradio", { name: /Em progresso/ }));

    expect(mudou).toHaveBeenCalledWith("em_andamento");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("limpar o filtro devolve nulo, nao um status", async () => {
    const usuario = userEvent.setup();
    const mudou = vi.fn();
    render(<FiltroDeStatus valor="concluido" aoMudar={mudou} />);

    await usuario.click(screen.getByRole("button", { name: /Mudar filtro/ }));
    await usuario.click(screen.getByRole("menuitemradio", { name: /Todas/ }));

    expect(mudou).toHaveBeenCalledWith(null);
  });

  it("Esc fecha e devolve o foco ao botao", async () => {
    const usuario = userEvent.setup();
    render(<FiltroDeStatus valor={null} aoMudar={() => {}} />);
    const gatilho = screen.getByRole("button", { name: "Filtrar por status" });

    await usuario.click(gatilho);
    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    // Sem devolver o foco, quem navega por teclado voltaria para o inicio da pagina.
    expect(gatilho).toHaveFocus();
  });

  it("anuncia o filtro ativo no rotulo do botao", () => {
    render(<FiltroDeStatus valor="a_fazer" aoMudar={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Filtrando por Pendente. Mudar filtro" }),
    ).toBeInTheDocument();
  });

  it("marca a opcao ativa como selecionada", async () => {
    const usuario = userEvent.setup();
    render(<FiltroDeStatus valor="a_fazer" aoMudar={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: /Mudar filtro/ }));

    expect(screen.getByRole("menuitemradio", { name: /Pendente/ })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: /Todas/ })).not.toBeChecked();
  });
});
