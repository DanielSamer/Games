import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Bi } from "../components/Bi";
import { MenuBackground } from "../components/menu/MenuBackground";
import { TopBar } from "../components/menu/TopBar";

export function ForgotPasswordPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, flow: "reset" });
      setStep("verify");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/InvalidAccountId/i.test(message)) {
        // Deliberately generic: don't reveal whether this email is registered.
        setError("If that email has an account, a reset code has been sent.");
        setStep("verify");
      } else {
        // eslint-disable-next-line no-console
        console.error("Password reset request failed:", err);
        setError(`Couldn't send the reset code: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, code, newPassword, flow: "reset-verification" });
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(/invalid|expired/i.test(message) ? "That code is invalid or expired." : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="menu-shell">
      <MenuBackground accent={null} />

      <TopBar
        masthead={
          <Link to="/" className="menu-masthead" style={{ textDecoration: "none" }}>
            Games
          </Link>
        }
      />

      <div className="menu-content menu-content--center">
        <form
          className="menu-auth-card"
          onSubmit={step === "request" ? requestCode : submitNewPassword}
        >
          <h1 className="menu-auth-title">
            <Bi en="Reset Password" ar="إعادة تعيين كلمة المرور" />
          </h1>

          {step === "request" ? (
            <>
              <p className="menu-auth-subtitle">
                <Bi
                  en="Enter your email and we'll send you a reset code."
                  ar="اكتب بريدك الإلكتروني وهنبعتلك كود إعادة التعيين."
                />
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
            </>
          ) : (
            <>
              <p className="menu-auth-subtitle">
                <Bi en="Enter the code we emailed you and a new password." ar="اكتب الكود اللي وصلك وكلمة مرور جديدة." />
              </p>
              <label className="menu-auth-field">
                <span>
                  <Bi en="Reset code" ar="كود إعادة التعيين" />
                </span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              <label className="menu-auth-field">
                <span>
                  <Bi en="New password" ar="كلمة المرور الجديدة" />
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
            </>
          )}

          {error && <p className="menu-auth-error">{error}</p>}

          <button type="submit" className="menu-auth-submit" disabled={submitting}>
            {submitting ? (
              <Bi en="Please wait…" ar="لحظة..." />
            ) : step === "request" ? (
              <Bi en="Send code" ar="إرسال الكود" />
            ) : (
              <Bi en="Reset password" ar="إعادة تعيين" />
            )}
          </button>

          <Link to="/sign-in" className="menu-auth-back">
            ← <Bi en="Back to sign in" ar="رجوع لتسجيل الدخول" />
          </Link>
        </form>
      </div>
    </div>
  );
}
