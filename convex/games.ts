import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOwnedGame, assertValidName, assertValidRounds } from "./model";

const localizedText = v.object({
  en: v.optional(v.string()),
  ar: v.optional(v.string()),
});

const roundAnswer = v.object({
  text: localizedText,
  count: v.number(),
});

const round = v.object({
  id: v.string(),
  question: localizedText,
  answers: v.array(roundAnswer),
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("games")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const game = await ctx.db.get(gameId);
    if (!game || game.ownerId !== userId) return null;
    return game;
  },
});

export const create = mutation({
  args: { name: v.string(), rounds: v.optional(v.array(round)) },
  handler: async (ctx, { name, rounds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    assertValidName(name);
    assertValidRounds(rounds ?? []);
    return await ctx.db.insert("games", {
      ownerId: userId,
      name,
      rounds: rounds ?? [],
    });
  },
});

export const rename = mutation({
  args: { gameId: v.id("games"), name: v.string() },
  handler: async (ctx, { gameId, name }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    assertValidName(name);
    await ctx.db.patch(gameId, { name });
  },
});

export const remove = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    await ctx.db.delete(gameId);
  },
});

export const addRound = mutation({
  args: { gameId: v.id("games"), round },
  handler: async (ctx, { gameId, round: newRound }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const rounds = [...game.rounds, newRound];
    assertValidRounds(rounds);
    await ctx.db.patch(gameId, { rounds });
  },
});

export const updateRound = mutation({
  args: { gameId: v.id("games"), round },
  handler: async (ctx, { gameId, round: updated }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const rounds = game.rounds.map((r) => (r.id === updated.id ? updated : r));
    assertValidRounds(rounds);
    await ctx.db.patch(gameId, { rounds });
  },
});

export const removeRound = mutation({
  args: { gameId: v.id("games"), roundId: v.string() },
  handler: async (ctx, { gameId, roundId }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    await ctx.db.patch(gameId, {
      rounds: game.rounds.filter((r) => r.id !== roundId),
    });
  },
});

export const ensureSeeded = mutation({
  args: { name: v.string(), rounds: v.array(round) },
  handler: async (ctx, { name, rounds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("games")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    if (existing.length > 0) return existing[0]._id;
    return await ctx.db.insert("games", { ownerId: userId, name, rounds });
  },
});
