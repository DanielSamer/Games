import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type LanguageMode = "en" | "ar";

const STORAGE_KEY = "e3dady-language-mode";

function loadMode(): LanguageMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "en" || raw === "ar" ? raw : "en";
  } catch {
    return "en";
  }
}

interface LanguageModeContextValue {
  mode: LanguageMode;
  setMode: (mode: LanguageMode) => void;
}

const LanguageModeContext = createContext<LanguageModeContextValue | null>(null);

export function LanguageModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LanguageMode>(() => loadMode());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((next: LanguageMode) => {
    setModeState(next);
  }, []);

  return <LanguageModeContext.Provider value={{ mode, setMode }}>{children}</LanguageModeContext.Provider>;
}

export function useLanguageMode() {
  const ctx = useContext(LanguageModeContext);
  if (!ctx) {
    throw new Error("useLanguageMode must be used within a LanguageModeProvider");
  }
  return ctx;
}
