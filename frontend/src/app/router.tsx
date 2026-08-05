import { createBrowserRouter, Navigate } from "react-router-dom";

import { PaginaDeLogin } from "../features/auth/PaginaDeLogin";
import { RotaProtegida } from "../features/auth/RotaProtegida";
import { DetalheDoTime } from "../features/teams/DetalheDoTime";
import { ListaDeTimes } from "../features/teams/ListaDeTimes";
import { Layout } from "./Layout";

export const router = createBrowserRouter([
  { path: "/entrar", element: <PaginaDeLogin /> },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/times" replace /> },
          { path: "times", element: <ListaDeTimes /> },
          { path: "times/:teamId", element: <DetalheDoTime /> },
        ],
      },
    ],
  },
]);
