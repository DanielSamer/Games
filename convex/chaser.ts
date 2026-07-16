import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const localizedText = v.object({
  en: v.optional(v.string()),
  ar: v.optional(v.string()),
});

const chaserQuestion = v.object({
  id: v.string(),
  question: localizedText,
  answer: localizedText,
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("chaserGames")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { gameId: v.id("chaserGames") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const game = await ctx.db.get(gameId);
    if (!game || game.ownerId !== userId) return null;
    return game;
  },
});

export const create = mutation({
  args: { name: v.string(), questions: v.optional(v.array(chaserQuestion)) },
  handler: async (ctx, { name, questions }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await ctx.db.insert("chaserGames", {
      ownerId: userId,
      name,
      questions: questions ?? [],
    });
  },
});

export const rename = mutation({
  args: { gameId: v.id("chaserGames"), name: v.string() },
  handler: async (ctx, { gameId, name }) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(gameId);
    if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(gameId, { name });
  },
});

export const remove = mutation({
  args: { gameId: v.id("chaserGames") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(gameId);
    if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
    await ctx.db.delete(gameId);
  },
});

export const addQuestion = mutation({
  args: { gameId: v.id("chaserGames"), question: chaserQuestion },
  handler: async (ctx, { gameId, question: newQuestion }) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(gameId);
    if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(gameId, { questions: [...game.questions, newQuestion] });
  },
});

export const updateQuestion = mutation({
  args: { gameId: v.id("chaserGames"), question: chaserQuestion },
  handler: async (ctx, { gameId, question: updated }) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(gameId);
    if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(gameId, {
      questions: game.questions.map((q) => (q.id === updated.id ? updated : q)),
    });
  },
});

export const removeQuestion = mutation({
  args: { gameId: v.id("chaserGames"), questionId: v.string() },
  handler: async (ctx, { gameId, questionId }) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(gameId);
    if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(gameId, {
      questions: game.questions.filter((q) => q.id !== questionId),
    });
  },
});

export const importQuestions = mutation({
  args: { gameId: v.id("chaserGames"), questions: v.array(chaserQuestion) },
  handler: async (ctx, { gameId, questions: incoming }) => {
    const userId = await getAuthUserId(ctx);
    const game = await ctx.db.get(gameId);
    if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
    await ctx.db.patch(gameId, { questions: [...game.questions, ...incoming] });
    return incoming.length;
  },
});

export const ensureSeeded = mutation({
  args: { name: v.string(), questions: v.array(chaserQuestion) },
  handler: async (ctx, { name, questions }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("chaserGames")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    if (existing.length > 0) return existing[0]._id;
    return await ctx.db.insert("chaserGames", { ownerId: userId, name, questions });
  },
});
