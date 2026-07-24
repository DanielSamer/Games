import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getOwnedGame,
  assertValidName,
  assertValidDblOrNothingQuestions,
  normalizeCategory,
} from "./model";
import { logEvent } from "./analytics";

const localizedText = v.object({
  en: v.optional(v.string()),
  ar: v.optional(v.string()),
});

const difficulty = v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"));

const dblOrNothingQuestion = v.object({
  id: v.string(),
  category: localizedText,
  difficulty,
  question: localizedText,
  options: v.array(localizedText),
  correctIndex: v.number(),
  imageUrl: v.optional(v.string()),
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("dblOrNothingGames")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { gameId: v.id("dblOrNothingGames") },
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
    questions: v.optional(v.array(dblOrNothingQuestion)),
  },
  handler: async (ctx, { name, category, questions }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    assertValidName(name);
    assertValidDblOrNothingQuestions(questions ?? []);
    const gameId = await ctx.db.insert("dblOrNothingGames", {
      ownerId: userId,
      name,
      category: normalizeCategory(category),
      questions: questions ?? [],
    });
    await logEvent(ctx, "dbl_or_nothing_pack_created", userId, { gameId });
    return gameId;
  },
});

export const setCategory = mutation({
  args: { gameId: v.id("dblOrNothingGames"), category: v.optional(v.string()) },
  handler: async (ctx, { gameId, category }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    await ctx.db.patch(gameId, { category: normalizeCategory(category) });
  },
});

export const rename = mutation({
  args: { gameId: v.id("dblOrNothingGames"), name: v.string() },
  handler: async (ctx, { gameId, name }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    assertValidName(name);
    await ctx.db.patch(gameId, { name });
  },
});

export const remove = mutation({
  args: { gameId: v.id("dblOrNothingGames") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    await getOwnedGame(ctx, userId, gameId);
    await ctx.db.delete(gameId);
  },
});

export const addQuestion = mutation({
  args: { gameId: v.id("dblOrNothingGames"), question: dblOrNothingQuestion },
  handler: async (ctx, { gameId, question: newQuestion }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const questions = [...game.questions, newQuestion];
    assertValidDblOrNothingQuestions(questions);
    await ctx.db.patch(gameId, { questions });
  },
});

export const updateQuestion = mutation({
  args: { gameId: v.id("dblOrNothingGames"), question: dblOrNothingQuestion },
  handler: async (ctx, { gameId, question: updated }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const questions = game.questions.map((q) => (q.id === updated.id ? updated : q));
    assertValidDblOrNothingQuestions(questions);
    await ctx.db.patch(gameId, { questions });
  },
});

export const removeQuestion = mutation({
  args: { gameId: v.id("dblOrNothingGames"), questionId: v.string() },
  handler: async (ctx, { gameId, questionId }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    await ctx.db.patch(gameId, {
      questions: game.questions.filter((q) => q.id !== questionId),
    });
  },
});

export const importQuestions = mutation({
  args: { gameId: v.id("dblOrNothingGames"), questions: v.array(dblOrNothingQuestion) },
  handler: async (ctx, { gameId, questions: incoming }) => {
    const userId = await getAuthUserId(ctx);
    const game = await getOwnedGame(ctx, userId, gameId);
    const questions = [...game.questions, ...incoming];
    assertValidDblOrNothingQuestions(questions);
    await ctx.db.patch(gameId, { questions });
    return incoming.length;
  },
});

export const ensureSeeded = mutation({
  args: { name: v.string(), questions: v.array(dblOrNothingQuestion) },
  handler: async (ctx, { name, questions }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("dblOrNothingGames")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    if (existing.length > 0) return existing[0]._id;
    return await ctx.db.insert("dblOrNothingGames", { ownerId: userId, name, questions });
  },
});
