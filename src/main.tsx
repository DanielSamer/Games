import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { LanguageModeProvider } from "./context/LanguageMode";
import "./index.css";
import App from "./App.tsx";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!convexUrl) {
  // eslint-disable-next-line no-console
  console.error(
    "VITE_CONVEX_URL is not set. Run `npx convex dev` and copy the deployment URL into a .env.local file.",
  );
}

const convex = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <LanguageModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageModeProvider>
    </ConvexAuthProvider>
  </StrictMode>,
);
