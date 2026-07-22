import { Email } from "@convex-dev/auth/providers/Email";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

function generateOtp(): string {
  const digits = new Uint32Array(6);
  crypto.getRandomValues(digits);
  return Array.from(digits, (d) => d % 10).join("");
}

export const GmailPasswordReset = Email({
  id: "gmail-otp-password-reset",
  maxAge: 60 * 15, // 15 minutes to use the code
  async generateVerificationToken() {
    return generateOtp();
  },
  async sendVerificationRequest(params) {
    const { identifier: email, token } = params;
    // The auth library passes ctx as a second argument at runtime, but its own
    // type declarations for email providers don't include it yet (see
    // signIn.js's own `@ts-expect-error` on this same call).
    const ctx = arguments[1] as ActionCtx;
    await ctx.runAction(internal.sendEmail.sendPasswordResetEmail, { to: email, code: token });
  },
});
