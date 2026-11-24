import { t } from "./i18n";
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
import { Feedback } from "./pages/Feedback";
import { Notificacoes } from "./pages/Notificacoes";
import { Equipamentos } from "./pages/Equipamentos";
import { Habilidades } from "./pages/Habilidades";
import { HistoricoReservas } from "./pages/HistoricoReservas";
import { Login } from "./pages/Login";
import { InstallationWizard } from "./pages/InstallationWizard";
import { Inventario } from "./pages/Inventario";
import { Compras } from "./pages/Compras";
import { Invitations } from "./pages/Invitations";
import { MeuPerfil } from "./pages/MeuPerfil";
import { MinhasReservas } from "./pages/MinhasReservas";
import { NotFound } from "./pages/NotFound";
import { Pesquisadores } from "./pages/Pesquisadores";
import { ProfileRequired } from "./pages/ProfileRequired";
import { ProjetoDetalhe } from "./pages/ProjetoDetalhe";
import { Projetos } from "./pages/Projetos";
import { Reservas } from "./pages/Reservas";
import { AcceptInvitation } from "./pages/AcceptInvitation";
import { Privacy } from "./pages/Privacy";
import { UsuariosAtivos, UsuariosLayout } from "./pages/Usuarios";
import { useAuth } from "./lib/auth";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-text">
      <p className="text-lg font-semibold text-muted">{t("app.loading")}</p>
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
            <h1 className="text-2xl font-bold">{t("install.pendingTitle")}</h1>
            <p className="mt-3 text-muted">
              {t("install.pendingBody")}
            </p>
            <button className="mt-5 font-semibold text-primary underline" onClick={signOut}>
              {t("common.signOut")}
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
      location.pathname.startsWith("/feedback") ||
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
          { path: "projetos", element: <Projetos /> },
          { path: "projetos/:id", element: <ProjetoDetalhe /> },
          { path: "habilidades", element: <Habilidades /> },
          { path: "agenda", element: <AgendaLaboratorio /> },
          { path: "equipamentos", element: <Equipamentos /> },
          { path: "feedback", element: <Feedback /> },
          { path: "notificacoes", element: <Notificacoes /> },
          { path: "inventario", element: <Inventario /> },
          { path: "compras", element: <Compras /> },
          { path: "impressoras", element: <Navigate to="/equipamentos" replace /> },
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
], { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });
