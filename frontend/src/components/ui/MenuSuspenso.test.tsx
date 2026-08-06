import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemDeMenu, MenuSuspenso } from "./MenuSuspenso";

function montaMenu(aoAgir = vi.fn()) {
  render(
    <MenuSuspenso rotulo="Configurações" icone={<span>eng</span>}>
      {(fechar) => (
        <ItemDeMenu
          aoClicar={() => {
            aoAgir();
            fechar();
          }}
        >
          Editar
        </ItemDeMenu>
      )}
    </MenuSuspenso>,
  );
  return { gatilho: screen.getByRole("button", { name: "Configurações" }), aoAgir };
}

describe("MenuSuspenso", () => {
  it("comeca fechado", () => {
    montaMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("abre e fecha no gatilho", async () => {
    const usuario = userEvent.setup();
    const { gatilho } = montaMenu();

    await usuario.click(gatilho);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await usuario.click(gatilho);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("o item age e o menu fecha", async () => {
    const usuario = userEvent.setup();
    const { gatilho, aoAgir } = montaMenu();

    await usuario.click(gatilho);
    await usuario.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(aoAgir).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("clicar fora fecha", async () => {
    const usuario = userEvent.setup();
    const { gatilho } = montaMenu();

    await usuario.click(gatilho);
    await usuario.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Esc fecha e devolve o foco ao gatilho", async () => {
    const usuario = userEvent.setup();
    const { gatilho } = montaMenu();

    await usuario.click(gatilho);
    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    // Sem devolver o foco, quem navega por teclado volta para o inicio da pagina.
    expect(gatilho).toHaveFocus();
  });

  it("anuncia o estado de aberto para leitor de tela", async () => {
    const usuario = userEvent.setup();
    const { gatilho } = montaMenu();

    expect(gatilho).toHaveAttribute("aria-expanded", "false");
    await usuario.click(gatilho);
    expect(gatilho).toHaveAttribute("aria-expanded", "true");
  });
});
