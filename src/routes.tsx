import { createBrowserRouter } from "react-router-dom";

import { App } from "./App";
import { Administracao } from "./pages/Administracao";
import { AgendaLaboratorio } from "./pages/AgendaLaboratorio";
import { Dashboard } from "./pages/Dashboard";
import { Habilidades } from "./pages/Habilidades";
import { Impressoras } from "./pages/Impressoras";
import { NotFound } from "./pages/NotFound";
import { Pesquisadores } from "./pages/Pesquisadores";
import { Reservas } from "./pages/Reservas";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "pesquisadores", element: <Pesquisadores /> },
      { path: "habilidades", element: <Habilidades /> },
      { path: "agenda", element: <AgendaLaboratorio /> },
      { path: "impressoras", element: <Impressoras /> },
      { path: "reservas", element: <Reservas /> },
      { path: "administracao", element: <Administracao /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
