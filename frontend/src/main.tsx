import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { Providers } from "./app/providers";
import { router } from "./app/router";
import { aplicaTemaInicial } from "./lib/tema";
import "./index.css";

// Antes do primeiro render: evita o flash branco em quem usa tema escuro.
aplicaTemaInicial();

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Elemento #root nao encontrado no index.html.");

createRoot(raiz).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
