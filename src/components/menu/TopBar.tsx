import type { ReactNode } from "react";
import { useLanguageMode } from "../../context/LanguageMode";

interface Props {
  masthead: ReactNode;
  right?: ReactNode;
}

export function TopBar({ masthead, right }: Props) {
  const { mode, setMode } = useLanguageMode();

  return (
    <div className="menu-topbar">
      {masthead}

      <div className="menu-topbar__right">
        <div className="menu-lang" role="group" aria-label="Site language">
          <button
            type="button"
            className={`menu-lang__opt ${mode === "en" ? "menu-lang__opt--active" : ""}`}
            onClick={() => setMode("en")}
          >
            EN
          </button>
          <span className="menu-lang__sep">·</span>
          <button
            type="button"
            className={`menu-lang__opt ${mode === "ar" ? "menu-lang__opt--active" : ""}`}
            onClick={() => setMode("ar")}
          >
            AR
          </button>
        </div>

        {right}
      </div>
    </div>
  );
}
