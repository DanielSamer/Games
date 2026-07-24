"use node";

// Separate file from admin.ts: createAccount's password hashing needs the
// Node runtime, and a file with "use node" can't also export queries or
// mutations (see convex/_generated/ai/guidelines.md).

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// CLI-only, like admin:grantAdmin — creates a host account directly
// (bypassing the sign-up form) and immediately grants it admin.
// `npx convex run adminAccounts:createHostAdminAccount '{"email":"...","password":"..."}'`
export const createHostAdminAccount = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    await createAccount(ctx, {
      provider: "password",
      account: { id: normalized, secret: password },
      profile: { email: normalized },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });
    const result: string = await ctx.runMutation(internal.admin.grantAdmin, { email: normalized });
    return result;
  },
});
