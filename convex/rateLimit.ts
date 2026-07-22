import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getRecord(ctx: MutationCtx, email: string) {
  return await ctx.db
    .query("signInAttempts")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
}

export const assertSignInAllowed = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = normalizeEmail(email);
    const record = await getRecord(ctx, key);
    if (!record) return;
    const withinWindow = Date.now() - record.windowStart < WINDOW_MS;
    if (withinWindow && record.count >= MAX_ATTEMPTS) {
      throw new Error("Too many sign-in attempts. Please wait 15 minutes and try again.");
    }
  },
});

export const recordFailedSignIn = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = normalizeEmail(email);
    const record = await getRecord(ctx, key);
    const now = Date.now();
    if (!record || now - record.windowStart >= WINDOW_MS) {
      if (record) {
        await ctx.db.patch(record._id, { count: 1, windowStart: now });
      } else {
        await ctx.db.insert("signInAttempts", { email: key, count: 1, windowStart: now });
      }
      return;
    }
    await ctx.db.patch(record._id, { count: record.count + 1 });
  },
});

export const clearSignInAttempts = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = normalizeEmail(email);
    const record = await getRecord(ctx, key);
    if (record) await ctx.db.delete(record._id);
  },
});
