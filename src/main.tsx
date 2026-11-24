import "./lib/normalizeLocation";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "./lib/auth";
import { LanguageProvider, LocaleBoundary } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { router } from "./routes";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
    <ThemeProvider>
    <AuthProvider>
      <LocaleBoundary>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </LocaleBoundary>
    </AuthProvider>
    </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
