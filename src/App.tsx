import { Outlet } from "react-router-dom";

import { useAuth } from "./lib/auth";
import { Login } from "./components/Login";
import { AppLayout } from "./components/layout/AppLayout";

export function App() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
