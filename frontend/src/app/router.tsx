import { createBrowserRouter, Navigate } from "react-router-dom";

import { PaginaDeLogin } from "../features/auth/PaginaDeLogin";
import { RotaProtegida } from "../features/auth/RotaProtegida";
import { MinhasTarefas } from "../features/tasks/MinhasTarefas";
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
          // "Minhas tarefas" e a home: e o que cada pessoa quer ver ao abrir.
          { index: true, element: <Navigate to="/minhas-tarefas" replace /> },
          { path: "minhas-tarefas", element: <MinhasTarefas /> },
          { path: "times", element: <ListaDeTimes /> },
          { path: "times/:teamId", element: <DetalheDoTime /> },
        ],
      },
    ],
  },
]);
