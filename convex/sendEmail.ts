"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import nodemailer from "nodemailer";

export const sendPasswordResetEmail = internalAction({
  args: { to: v.string(), code: v.string() },
  handler: async (ctx, { to, code }) => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error(
        "GMAIL_USER / GMAIL_APP_PASSWORD are not set. Run `npx convex env set GMAIL_USER ...` and `npx convex env set GMAIL_APP_PASSWORD ...`.",
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `Games <${user}>`,
      to,
      subject: `Your password reset code: ${code}`,
      text: `Your password reset code is ${code}. It expires in 15 minutes.`,
    });
  },
});
