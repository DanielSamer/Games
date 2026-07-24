import { useState } from "react";
import { Link } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useLanguageMode } from "../context/LanguageMode";
import { MenuBackground } from "../components/menu/MenuBackground";
import { ShowCard, type ShowCardData } from "../components/menu/ShowCard";
import { TopBar } from "../components/menu/TopBar";

const shows: ShowCardData[] = [
  {
    id: "feud",
    to: "/family-feud",
    accent: "#3b82f6",
    titleLinesEn: ["Asked", "the People"],
    nameAr: "سألنا الناس",
    descEn: "Survey says! Bilingual, host-run board game.",
    descAr: "استطلاع رأي! لعبة يديرها المُقدِّم.",
    tagEn: "2 teams · host-run",
    tagAr: "فريقين · بيتحكم فيها المُقدِّم",
  },
  {
    id: "chaser",
    to: "/chaser",
    accent: "#e0333f",
    titleLinesEn: ["Catch", "Him"],
    nameAr: "إلحقوه",
    descEn: "Outrun the Chaser for the prize fund.",
    descAr: "اهرب من الملاحق واكسب الجائزة.",
    tagEn: "1 vs 1 · host-run",
    tagAr: "واحد ضد واحد · بيتحكم فيها المُقدِّم",
  },
  {
    id: "don",
    to: "/double-or-nothing",
    accent: "#2f9e6b",
    titleLinesEn: ["Double or", "Nothing"],
    nameAr: "ضاعف أو اخسر",
    descEn: "Wager your stack, answer to double it.",
    descAr: "راهن برصيدك وجاوب صح تضاعفه.",
    tagEn: "Live phones · QR join",
    tagAr: "لعب مباشر · انضمام بالكيو آر",
  },
  {
    id: "nhie",
    to: "/never-have-i-ever",
    accent: "#ec4899",
    titleLinesEn: ["I Didn't", "Do It"],
    nameAr: "عمري ما",
    descEn: "Confess, laugh, and put a finger down.",
    descAr: "اعترف واضحك ونزّل صباعك.",
    tagEn: "Group game · coming soon",
    tagAr: "لعبة جماعية · قريباً",
  },
];

export function MainMenu() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const { mode } = useLanguageMode();
  const isAr = mode === "ar";
  const [hoveredId, setHoveredId] = useState<ShowCardData["id"] | null>(null);

  const hoveredShow = shows.find((s) => s.id === hoveredId) ?? null;

  return (
    <div className="menu-shell">
      <MenuBackground accent={hoveredShow?.accent ?? null} />

      <TopBar
        masthead={<span className="menu-masthead">Games</span>}
        right={
          <>
            {isAdmin && (
              <Link to="/admin" className="menu-signout">
                {isAr ? "لوحة التحكم" : "Dashboard"}
              </Link>
            )}
            {isAuthenticated ? (
              <button type="button" className="menu-signout" onClick={() => void signOut()}>
                {isAr ? "تسجيل خروج" : "Sign out"}
              </button>
            ) : (
              <Link to="/sign-in" className="menu-signout">
                {isAr ? "تسجيل دخول" : "Sign in"}
              </Link>
            )}
          </>
        }
      />

      <div className="menu-content">
        <p className="menu-eyebrow">
          {isAr ? (
            <span dir="rtl" lang="ar">
              عروض الليلة
            </span>
          ) : (
            "Tonight's shows"
          )}
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
