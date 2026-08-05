import { createBrowserRouter } from "react-router-dom";

import { PaginaDeLogin } from "../features/auth/PaginaDeLogin";
import { RotaProtegida } from "../features/auth/RotaProtegida";
import { PaginaInicial } from "../features/inicio/PaginaInicial";
import { Layout } from "./Layout";

export const router = createBrowserRouter([
  { path: "/entrar", element: <PaginaDeLogin /> },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <Layout />,
        children: [{ path: "/", element: <PaginaInicial /> }],
      },
    ],
  },
]);
