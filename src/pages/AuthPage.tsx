import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Bi } from "../components/Bi";
import { useLanguageMode } from "../context/LanguageMode";
import { MenuBackground } from "../components/menu/MenuBackground";

interface Props {
  mode: "signIn" | "signUp";
}

export function AuthPage({ mode }: Props) {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode: siteLangMode, setMode: setSiteLangMode } = useLanguageMode();
  const bilingual = siteLangMode === "bilingual";
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, password, flow: mode });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Auth error:", err);
      const message = err instanceof Error ? err.message : String(err);
      const looksLikeDuplicateAccount = /already.*(exist|use)/i.test(message);
      const looksLikeBadCredentials = /invalid|password|not found/i.test(message);

      if (mode === "signUp" && looksLikeDuplicateAccount) {
        setError("That email is already in use.");
      } else if (mode === "signIn" && looksLikeBadCredentials) {
        setError("Couldn't sign in. Check your email and password.");
      } else {
        setError(`Something went wrong: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="menu-shell">
      <MenuBackground accent={null} />

      <div className="menu-topbar">
        <Link to="/" className="menu-masthead" style={{ textDecoration: "none" }}>
          Game Shows
        </Link>

        <div className="menu-topbar__right">
          <div className="menu-lang" role="group" aria-label="Site language">
            <button
              type="button"
              className={`menu-lang__opt ${siteLangMode === "en" ? "menu-lang__opt--active" : ""}`}
              onClick={() => setSiteLangMode("en")}
            >
              EN
            </button>
            <span className="menu-lang__sep">·</span>
            <button
              type="button"
              className={`menu-lang__opt ${bilingual ? "menu-lang__opt--active" : ""}`}
              onClick={() => setSiteLangMode("bilingual")}
            >
              EN+AR
            </button>
          </div>
        </div>
      </div>

      <div className="menu-content menu-content--center">
        <form className="menu-auth-card" onSubmit={handleSubmit}>
          <h1 className="menu-auth-title">
            {mode === "signIn" ? <Bi en="Sign In" ar="تسجيل الدخول" /> : <Bi en="Sign Up" ar="إنشاء حساب" />}
          </h1>
          <p className="menu-auth-subtitle">
            {mode === "signIn" ? (
              <Bi en="Sign in to host or create games." ar="سجّل الدخول علشان تستضيف أو تنشئ ألعاب." />
            ) : (
              <Bi en="Create an account to build your own games." ar="أنشئ حساب علشان تبني ألعابك الخاصة." />
            )}
          </p>

          <label className="menu-auth-field">
            <span>
              <Bi en="Email" ar="البريد الإلكتروني" />
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="menu-auth-field">
            <span>
              <Bi en="Password" ar="كلمة المرور" />
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="menu-auth-error">{error}</p>}

          <button type="submit" className="menu-auth-submit" disabled={submitting}>
            {submitting ? (
              <Bi en="Please wait…" ar="لحظة..." />
            ) : mode === "signIn" ? (
              <Bi en="Sign In" ar="دخول" />
            ) : (
              <Bi en="Sign Up" ar="تسجيل" />
            )}
          </button>

          <p className="menu-auth-switch">
            {mode === "signIn" ? (
              <>
                <Bi en="Don't have an account?" ar="معندكش حساب؟" />{" "}
                <Link to="/sign-up" state={{ from: redirectTo }}>
                  <Bi en="Sign up" ar="سجّل" />
                </Link>
              </>
            ) : (
              <>
                <Bi en="Already have an account?" ar="عندك حساب بالفعل؟" />{" "}
                <Link to="/sign-in" state={{ from: redirectTo }}>
                  <Bi en="Sign in" ar="دخول" />
                </Link>
              </>
            )}
          </p>

          <Link to="/" className="menu-auth-back">
            ← <Bi en="Back to menu" ar="رجوع للقائمة" />
          </Link>
        </form>
      </div>
    </div>
  );
}
