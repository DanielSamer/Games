import { v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// The only gate for every admin query/mutation below. Never trust a client
// flag — always re-derive admin status server-side from the `admins` table
// on every single call, per-request. A non-admin hitting any of these
// directly gets this thrown error and no data, same as a logged-out user.
async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authorized");
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!admin) throw new Error("Not authorized");
  return userId;
}

// Cheap client-side check to decide whether to render the dashboard shell
// or bounce — NOT the real access control. Every data query below
// independently re-checks via requireAdmin, so this returning `true`
// dishonestly (it can't — it's server-derived too) still wouldn't expose
// any data on its own.
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return !!admin;
  },
});

// CLI-only: `npx convex run admin:grantAdmin '{"email":"you@example.com"}'`.
// Deliberately an internalMutation — there is no public mutation, UI button,
// or signup-flow path that can ever grant admin.
export const grantAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email.trim().toLowerCase()))
      .unique();
    if (!user) throw new Error(`No account found for ${email}`);
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (existing) return "Already an admin";
    await ctx.db.insert("admins", { userId: user._id });
    return `Granted admin to ${email}`;
  },
});

// Called once when the dashboard mounts. Records who opened it and when;
// IP isn't available here (Convex queries/mutations don't see the caller's
// network request — only an HTTP action does, and admin login goes
// through the same in-app session as everything else).
export const logAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAdmin(ctx);
    await ctx.db.insert("adminAuditLog", { userId, occurredAt: Date.now() });
  },
});

export const listAuditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("adminAuditLog").order("desc").take(50);
    return await Promise.all(
      rows.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return { occurredAt: r.occurredAt, email: user?.email ?? "?" };
      }),
    );
  },
});

export { requireAdmin };
