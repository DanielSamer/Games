import { useState } from "react";
import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useLanguageMode } from "../context/LanguageMode";
import { MenuBackground } from "../components/menu/MenuBackground";
import { ShowCard, type ShowCardData } from "../components/menu/ShowCard";

const shows: ShowCardData[] = [
  {
    id: "feud",
    to: "/family-feud",
    accent: "#3b82f6",
    titleLinesEn: ["Sa2alna", "El Nas"],
    nameAr: "عيلة وعيلة",
    descEn: "Survey says! Bilingual, host-run board game.",
    descAr: "استطلاع رأي! لعبة يديرها المُقدِّم.",
    tagEn: "2 teams · host-run",
    tagAr: "فريقين · بيتحكم فيها المُقدِّم",
  },
  {
    id: "chaser",
    to: "/chaser",
    accent: "#e0333f",
    titleLinesEn: ["El7a2o"],
    nameAr: "اهزم الملاحقين",
    descEn: "Outrun the Chaser for the prize fund.",
    descAr: "اهرب من الملاحق واكسب الجائزة.",
    tagEn: "1 vs 1 · host-run",
    tagAr: "واحد ضد واحد · بيتحكم فيها المُقدِّم",
  },
  {
    id: "nhie",
    to: "/never-have-i-ever",
    accent: "#ec4899",
    titleLinesEn: ["3omry", "Ma"],
    nameAr: "أبداً ما عملت",
    descEn: "Confess, laugh, and put a finger down.",
    descAr: "اعترف واضحك ونزّل صباعك.",
    tagEn: "Group game · coming soon",
    tagAr: "لعبة جماعية · قريباً",
  },
];

export function MainMenu() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const { mode, setMode } = useLanguageMode();
  const bilingual = mode === "bilingual";
  const [hoveredId, setHoveredId] = useState<ShowCardData["id"] | null>(null);

  const hoveredShow = shows.find((s) => s.id === hoveredId) ?? null;

  return (
    <div className="menu-shell">
      <MenuBackground accent={hoveredShow?.accent ?? null} />

      <div className="menu-topbar">
        <span className="menu-masthead">Game Shows</span>

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
              className={`menu-lang__opt ${bilingual ? "menu-lang__opt--active" : ""}`}
              onClick={() => setMode("bilingual")}
            >
              EN+AR
            </button>
          </div>

          {isAuthenticated ? (
            <button type="button" className="menu-signout" onClick={() => void signOut()}>
              {bilingual ? "تسجيل خروج / Sign out" : "Sign out"}
            </button>
          ) : (
            <Link to="/sign-in" className="menu-signout">
              {bilingual ? "تسجيل دخول / Sign in" : "Sign in"}
            </Link>
          )}
        </div>
      </div>

      <div className="menu-content">
        <p className="menu-eyebrow">
          {bilingual ? (
            <span dir="rtl" lang="ar">
              عروض الليلة
            </span>
          ) : (
            "Tonight's shows"
          )}
          {bilingual && <span className="menu-eyebrow__ar">Tonight's shows</span>}
        </p>

        <div className="menu-grid">
          {shows.map((show, i) => (
            <ShowCard
              key={show.id}
              show={show}
              dimmed={hoveredId !== null && hoveredId !== show.id}
              onHoverChange={setHoveredId}
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
