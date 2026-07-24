import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

const CODE_LENGTH = 5;
// Avoid visually ambiguous characters (0/O, 1/I/L) so a host can read a
// code aloud or a player can type one in without confusion.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .unique();
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique room code, please try again");
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const code = await generateUniqueCode(ctx);
    const roomId = await ctx.db.insert("rooms", {
      hostId: userId,
      code,
      status: "lobby",
      createdAt: Date.now(),
    });
    return { roomId, code };
  },
});

// Host-side view of their own room (verifies ownership).
export const getForHost = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    const room = await ctx.db.get(roomId);
    if (!room || !userId || room.hostId !== userId) return null;
    return room;
  },
});

// Public lookup used by the join screen before a nickname is chosen.
// Deliberately minimal — no host identity, no player list.
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .unique();
    if (!room) return null;
    return { roomId: room._id, status: room.status, gameType: room.gameType ?? null };
  },
});

export const endRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    const room = await ctx.db.get(roomId);
    if (!room || !userId || room.hostId !== userId) throw new Error("Not found");
    await ctx.db.patch(roomId, { status: "ended", endedAt: Date.now() });
  },
});

export async function assertHostOwnsRoom(
  ctx: MutationCtx,
  userId: Id<"users"> | null,
  roomId: Id<"rooms">,
) {
  const room = await ctx.db.get(roomId);
  if (!room || !userId || room.hostId !== userId) throw new Error("Not found");
  return room;
}
