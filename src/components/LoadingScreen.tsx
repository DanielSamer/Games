import { Loader2 } from "lucide-react";
import { Bi } from "./Bi";

export type LoadingTheme = "default" | "chaser" | "don" | "menu" | "admin";

const THEME_CLASS: Record<LoadingTheme, string> = {
  default: "",
  chaser: "chaser-theme",
  don: "don-theme",
  menu: "menu-shell",
  admin: "admin-shell",
};

interface LoadingScreenProps {
  en: string;
  ar: string;
  theme?: LoadingTheme;
}

export function LoadingScreen({ en, ar, theme = "default" }: LoadingScreenProps) {
  const themeClass = THEME_CLASS[theme];
  return (
    <div className={["page-center", "loading-screen", themeClass].filter(Boolean).join(" ")}>
      <div className="loading-screen__inner">
        <Loader2 className="loading-screen__spinner" aria-hidden="true" />
        <p className="loading-text">
          <Bi en={en} ar={ar} />
        </p>
      </div>
    </div>
  );
}
