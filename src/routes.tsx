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
import { HistoricoReservas } from "./pages/HistoricoReservas";
import { Impressoras } from "./pages/Impressoras";
import { Login } from "./pages/Login";
import { InstallationWizard } from "./pages/InstallationWizard";
import { Invitations } from "./pages/Invitations";
import { MeuPerfil } from "./pages/MeuPerfil";
import { MinhasReservas } from "./pages/MinhasReservas";
import { NotFound } from "./pages/NotFound";
import { Pesquisadores } from "./pages/Pesquisadores";
import { ProfileRequired } from "./pages/ProfileRequired";
import { Reservas } from "./pages/Reservas";
import { AcceptInvitation } from "./pages/AcceptInvitation";
import { Privacy } from "./pages/Privacy";
import { UsuariosAtivos, UsuariosLayout } from "./pages/Usuarios";
import { useAuth } from "./lib/auth";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-text">
      <p className="text-lg font-semibold text-muted">Carregando...</p>
    </main>
  );
}

function ProtectedApp() {
  const {
    authConfigured,
    installationLoading,
    labSettings,
    loading,
    profile,
    profileLoading,
    session,
    signOut,
  } = useAuth();
  const location = useLocation();

  if (loading || profileLoading || installationLoading) {
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

  if (!labSettings?.setup_completed_at) {
    if (profile.role !== "coordinator") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-5 text-text">
          <div className="max-w-lg rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Instalação pendente</h1>
            <p className="mt-3 text-muted">
              O primeiro coordenador ainda precisa configurar este laboratório.
            </p>
            <button className="mt-5 font-semibold text-primary underline" onClick={signOut}>
              Sair
            </button>
          </div>
        </main>
      );
    }

    if (location.pathname !== "/instalacao") {
      return <Navigate to="/instalacao" replace />;
    }
  } else if (location.pathname === "/instalacao") {
    return <Navigate to="/" replace />;
  }

  if (
    (location.pathname.startsWith("/administracao") ||
      location.pathname.startsWith("/usuarios") ||
      location.pathname.startsWith("/reservas/historico")) &&
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
  { path: "/convite/aceitar", element: <AcceptInvitation /> },
  { path: "/privacidade", element: <Privacy /> },
  {
    path: "/",
    element: <ProtectedApp />,
    children: [
      { path: "instalacao", element: <InstallationWizard /> },
      {
        element: <App />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "pesquisadores", element: <Pesquisadores /> },
          { path: "habilidades", element: <Habilidades /> },
          { path: "agenda", element: <AgendaLaboratorio /> },
          { path: "impressoras", element: <Impressoras /> },
          { path: "reservas", element: <Reservas /> },
          { path: "reservas/minhas", element: <MinhasReservas /> },
          { path: "reservas/historico", element: <HistoricoReservas /> },
          { path: "perfil", element: <MeuPerfil /> },
          { path: "administracao", element: <Administracao /> },
          { path: "administracao/convites", element: <Navigate to="/usuarios/convites" replace /> },
          { path: "usuarios", element: <UsuariosLayout />, children: [
            { index: true, element: <UsuariosAtivos /> },
            { path: "convites", element: <Invitations /> },
          ] },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
