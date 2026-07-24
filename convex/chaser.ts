import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOwnedGame, assertValidName, assertValidQuestions, normalizeCategory } from "./model";
import { logEvent } from "./analytics";

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
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    questions: v.optional(v.array(chaserQuestion)),
  },
  handler: async (ctx, { name, category, questions }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    assertValidName(name);
    assertValidQuestions(questions ?? []);
    const gameId = await ctx.db.insert("chaserGames", {
      ownerId: userId,
      name,
      category: normalizeCategory(category),
      questions: questions ?? [],
    });
    await logEvent(ctx, "chaser_created", userId, { gameId });
    return gameId;
  },
});

export const rename = mutation({
  args: { gameId: v.id("chaserGames"), name: v.string() },
  handler: async (ctx, { gameId, name }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    assertValidName(name);
    await ctx.db.patch(gameId, { name });
    await logEvent(ctx, "chaser_renamed", userId, { gameId });
  },
});

export const setCategory = mutation({
  args: { gameId: v.id("chaserGames"), category: v.optional(v.string()) },
  handler: async (ctx, { gameId, category }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    await ctx.db.patch(gameId, { category: normalizeCategory(category) });
  },
});

export const remove = mutation({
  args: { gameId: v.id("chaserGames") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    await ctx.db.delete(gameId);
    await logEvent(ctx, "chaser_deleted", userId, { gameId });
  },
});

export const addQuestion = mutation({
  args: { gameId: v.id("chaserGames"), question: chaserQuestion },
  handler: async (ctx, { gameId, question: newQuestion }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const questions = [...game.questions, newQuestion];
    assertValidQuestions(questions);
    await ctx.db.patch(gameId, { questions });
    await logEvent(ctx, "question_added", userId, { gameId });
  },
});

export const updateQuestion = mutation({
  args: { gameId: v.id("chaserGames"), question: chaserQuestion },
  handler: async (ctx, { gameId, question: updated }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const questions = game.questions.map((q) => (q.id === updated.id ? updated : q));
    assertValidQuestions(questions);
    await ctx.db.patch(gameId, { questions });
    await logEvent(ctx, "question_updated", userId, { gameId });
  },
});

export const removeQuestion = mutation({
  args: { gameId: v.id("chaserGames"), questionId: v.string() },
  handler: async (ctx, { gameId, questionId }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    await ctx.db.patch(gameId, {
      questions: game.questions.filter((q) => q.id !== questionId),
    });
    await logEvent(ctx, "question_removed", userId, { gameId });
  },
});

export const importQuestions = mutation({
  args: { gameId: v.id("chaserGames"), questions: v.array(chaserQuestion) },
  handler: async (ctx, { gameId, questions: incoming }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const questions = [...game.questions, ...incoming];
    assertValidQuestions(questions);
    await ctx.db.patch(gameId, { questions });
    await logEvent(ctx, "questions_imported", userId, { gameId, count: incoming.length });
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
