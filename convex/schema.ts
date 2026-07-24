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

const dblOrNothingSettings = v.object({
  startingChips: v.number(),
  rounds: v.number(),
  wagerSeconds: v.number(),
  answerSeconds: v.number(),
  bustRule: v.union(v.literal("eliminated"), v.literal("mercy")),
  mercyStipend: v.number(),
  sureEnabled: v.boolean(),
  lateJoinerAverageStack: v.boolean(),
  finalRoundUncapped: v.boolean(),
});

const dblOrNothingPhase = v.union(
  v.literal("lobby"),
  v.literal("preview"),
  v.literal("wager"),
  v.literal("question"),
  v.literal("reveal"),
  v.literal("ended"),
);

export default defineSchema({
  ...authTables,

  games: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.optional(v.string()),
    rounds: v.array(round),
  }).index("by_owner", ["ownerId"]),

  chaserGames: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.optional(v.string()),
    questions: v.array(chaserQuestion),
  }).index("by_owner", ["ownerId"]),

  dblOrNothingGames: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.optional(v.string()),
    questions: v.array(dblOrNothingQuestion),
  }).index("by_owner", ["ownerId"]),

  // --- Live multiplayer room platform ---
  // Generic across future live games; only Double or Nothing uses it today.
  rooms: defineTable({
    hostId: v.id("users"),
    code: v.string(),
    status: v.union(v.literal("lobby"), v.literal("active"), v.literal("ended")),
    gameType: v.optional(v.string()),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_hostId", ["hostId"])
    .index("by_status", ["status"]),

  // A player's identity within a room. Anonymous by design: `deviceToken`
  // is a client-generated UUID in localStorage, never derived from IP/UA.
  // `nickname` is the only PII-adjacent field and is user-chosen/public.
  players: defineTable({
    roomId: v.id("rooms"),
    deviceToken: v.string(),
    nickname: v.string(),
    // Proof-of-ownership for player-authenticated mutations/queries (submit
    // wager/answer, read your own hidden round state). `_id` alone can't
    // serve this role — it's visible to everyone in the room via the
    // roster query, so it must never double as a credential.
    secret: v.string(),
    connected: v.boolean(),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_roomId_and_deviceToken", ["roomId", "deviceToken"]),

  dblOrNothingSessions: defineTable({
    roomId: v.id("rooms"),
    packId: v.id("dblOrNothingGames"),
    settings: dblOrNothingSettings,
    phase: dblOrNothingPhase,
    roundIndex: v.number(),
    phaseDeadline: v.optional(v.number()),
    questionOrder: v.array(v.string()),
    endedAt: v.optional(v.number()),
  }).index("by_roomId", ["roomId"]),

  // Current chip stack per player for a session — the single source of
  // truth for balances. Never trust/derive a stack from the client.
  dblOrNothingPlayerState: defineTable({
    sessionId: v.id("dblOrNothingSessions"),
    playerId: v.id("players"),
    stack: v.number(),
    eliminated: v.boolean(),
    joinedAtRoundIndex: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_and_playerId", ["sessionId", "playerId"]),

  // One row per player per round: the secret wager/answer and its result.
  dblOrNothingPlayerRounds: defineTable({
    sessionId: v.id("dblOrNothingSessions"),
    roundIndex: v.number(),
    playerId: v.id("players"),
    wagerAmount: v.optional(v.number()),
    sure: v.boolean(),
    wagerLockedAt: v.optional(v.number()),
    answerIndex: v.optional(v.number()),
    answeredAt: v.optional(v.number()),
    correct: v.optional(v.boolean()),
    stackBefore: v.optional(v.number()),
    stackAfter: v.optional(v.number()),
  })
    .index("by_sessionId_and_roundIndex", ["sessionId", "roundIndex"])
    .index("by_sessionId_and_roundIndex_and_playerId", ["sessionId", "roundIndex", "playerId"]),

  signInAttempts: defineTable({
    email: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_email", ["email"]),

  // Append-only analytics log. Never joined against player data (there is
  // no player identity yet) — only ever scoped to the host (`userId`).
  events: defineTable({
    eventType: v.string(),
    userId: v.optional(v.id("users")),
    occurredAt: v.number(),
    payload: v.optional(v.any()),
  })
    .index("by_eventType_and_occurredAt", ["eventType", "occurredAt"])
    .index("by_userId_and_occurredAt", ["userId", "occurredAt"])
    .index("by_occurredAt", ["occurredAt"]),

  // Presence in this table (not a flag on `users`) grants admin dashboard
  // access. Deliberately a separate table so there is no field on `users`
  // a client could ever request/patch to escalate themselves — the only
  // way in is `npx convex run admin:grantAdmin`.
  admins: defineTable({
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),

  // Who opened the admin dashboard, and when. IP isn't recorded — Convex
  // mutations/queries don't have access to the caller's network request,
  // only an HTTP action would, and admin access here goes through the
  // same in-app auth as everything else.
  adminAuditLog: defineTable({
    userId: v.id("users"),
    occurredAt: v.number(),
  }).index("by_occurredAt", ["occurredAt"]),
});
