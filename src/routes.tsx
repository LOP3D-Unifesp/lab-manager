import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { App } from "./App";
import { Administracao } from "./pages/Administracao";
import { AgendaLaboratorio } from "./pages/AgendaLaboratorio";
import { Dashboard } from "./pages/Dashboard";
import { Habilidades } from "./pages/Habilidades";
import { Impressoras } from "./pages/Impressoras";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { Pesquisadores } from "./pages/Pesquisadores";
import { ProfileRequired } from "./pages/ProfileRequired";
import { Reservas } from "./pages/Reservas";
import { useAuth } from "./lib/auth";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-text">
      <p className="text-lg font-semibold text-muted">Carregando...</p>
    </main>
  );
}

function ProtectedApp() {
  const { authConfigured, loading, profile, profileLoading, session } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!authConfigured || !session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!profile) {
    return <ProfileRequired />;
  }

  if (
    location.pathname.startsWith("/administracao") &&
    profile.role !== "coordinator"
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <ProtectedApp />,
    children: [
      {
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
    ],
  },
]);
