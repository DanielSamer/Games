import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

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

const chaserQuestion = v.object({
  id: v.string(),
  question: localizedText,
  answer: localizedText,
});

export default defineSchema({
  ...authTables,

  games: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    rounds: v.array(round),
  }).index("by_owner", ["ownerId"]),

  chaserGames: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    questions: v.array(chaserQuestion),
  }).index("by_owner", ["ownerId"]),
});
