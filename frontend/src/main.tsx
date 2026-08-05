import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { Providers } from "./app/providers";
import { router } from "./app/router";
import "./index.css";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Elemento #root nao encontrado no index.html.");

createRoot(raiz).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
