import { v } from "convex/values";
import {
  mutation,
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertHostOwnsRoom } from "./rooms";
import { verifyPlayerSecret } from "./players";
import { logEvent } from "./analytics";

const settingsValidator = v.object({
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

const LEADERBOARD_DISPLAY_MS = 5_000;

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function activePlayerStates(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"dblOrNothingSessions">,
) {
  return await ctx.db
    .query("dblOrNothingPlayerState")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .collect();
}

// Difficulty/category for the question currently in play — stamped onto
// wager/round-resolved events so question-quality analysis doesn't need a
// fragile join through a pack that might later be edited or deleted.
async function currentQuestionMeta(
  ctx: QueryCtx | MutationCtx,
  session: Doc<"dblOrNothingSessions">,
  roundIndex: number,
) {
  const pack = await ctx.db.get(session.packId);
  const questionId = session.questionOrder[roundIndex];
  const question = pack?.questions.find((q) => q.id === questionId);
  return {
    questionId,
    difficulty: question?.difficulty,
    category: question?.category?.en ?? question?.category?.ar,
    packId: session.packId,
  };
}

async function roundRowsFor(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"dblOrNothingSessions">,
  roundIndex: number,
) {
  return await ctx.db
    .query("dblOrNothingPlayerRounds")
    .withIndex("by_sessionId_and_roundIndex", (q) =>
      q.eq("sessionId", sessionId).eq("roundIndex", roundIndex),
    )
    .collect();
}

// --- Host: start a new session ---

export const startSession = mutation({
  args: {
    roomId: v.id("rooms"),
    packId: v.id("dblOrNothingGames"),
    settings: settingsValidator,
  },
  handler: async (ctx, { roomId, packId, settings }) => {
    const userId = await getAuthUserId(ctx);
    await assertHostOwnsRoom(ctx, userId, roomId);
    const pack = await ctx.db.get(packId);
    if (!pack || pack.ownerId !== userId) throw new Error("Pack not found");
    if (pack.questions.length < settings.rounds) {
      throw new Error(
        `This pack only has ${pack.questions.length} questions but ${settings.rounds} rounds were requested`,
      );
    }
    const questionOrder = shuffled(pack.questions.map((q) => q.id)).slice(0, settings.rounds);

    const deadline = Date.now() + settings.wagerSeconds * 1000;
    const sessionId = await ctx.db.insert("dblOrNothingSessions", {
      roomId,
      packId,
      settings,
      phase: "wager",
      phaseDeadline: deadline,
      roundIndex: 0,
      questionOrder,
    });

    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
      .collect();
    for (const player of players) {
      await ctx.db.insert("dblOrNothingPlayerState", {
        sessionId,
        playerId: player._id,
        stack: settings.startingChips,
        eliminated: false,
        joinedAtRoundIndex: 0,
      });
    }

    await ctx.db.patch(roomId, { status: "active", gameType: "dbl-or-nothing" });

    await ctx.scheduler.runAfter(settings.wagerSeconds * 1000, internal.dblOrNothingSession.autoLockWagers, {
      sessionId,
      roundIndex: 0,
    });

    await logEvent(ctx, "game_started", userId, {
      roomId,
      sessionId,
      packId,
      packCategory: pack.category,
      playerCount: players.length,
      settings,
    });

    return { sessionId };
  },
});

// --- Shared: transition wager -> question once everyone is locked (or timed out) ---

async function beginQuestionPhase(
  ctx: MutationCtx,
  session: Doc<"dblOrNothingSessions">,
) {
  const deadline = Date.now() + session.settings.answerSeconds * 1000;
  await ctx.db.patch(session._id, { phase: "question", phaseDeadline: deadline });
  await ctx.scheduler.runAfter(
    session.settings.answerSeconds * 1000,
    internal.dblOrNothingSession.autoResolveRound,
    { sessionId: session._id, roundIndex: session.roundIndex },
  );
}

async function maybeAdvanceFromWager(ctx: MutationCtx, sessionId: Id<"dblOrNothingSessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.phase !== "wager") return;
  const states = await activePlayerStates(ctx, sessionId);
  const eligible = states.filter(
    (s) => s.joinedAtRoundIndex <= session.roundIndex && !s.eliminated,
  );
  const rows = await roundRowsFor(ctx, sessionId, session.roundIndex);
  const lockedIds = new Set(rows.filter((r) => r.wagerLockedAt !== undefined).map((r) => r.playerId));
  if (eligible.length > 0 && eligible.every((s) => lockedIds.has(s.playerId))) {
    await beginQuestionPhase(ctx, session);
  }
}

export const autoLockWagers = internalMutation({
  args: { sessionId: v.id("dblOrNothingSessions"), roundIndex: v.number() },
  handler: async (ctx, { sessionId, roundIndex }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.phase !== "wager" || session.roundIndex !== roundIndex) return;

    const states = await activePlayerStates(ctx, sessionId);
    const rows = await roundRowsFor(ctx, sessionId, roundIndex);
    const rowsByPlayer = new Map(rows.map((r) => [r.playerId, r]));
    for (const state of states) {
      if (state.eliminated) continue;
      const existing = rowsByPlayer.get(state.playerId);
      if (existing && existing.wagerLockedAt !== undefined) continue;
      if (existing) {
        await ctx.db.patch(existing._id, { wagerAmount: 0, sure: false, wagerLockedAt: Date.now() });
      } else {
        await ctx.db.insert("dblOrNothingPlayerRounds", {
          sessionId,
          roundIndex,
          playerId: state.playerId,
          wagerAmount: 0,
          sure: false,
          wagerLockedAt: Date.now(),
        });
      }
    }
    await beginQuestionPhase(ctx, session);
  },
});

// --- Player: submit a secret wager ---

export const submitWager = mutation({
  args: {
    sessionId: v.id("dblOrNothingSessions"),
    playerId: v.id("players"),
    secret: v.string(),
    amount: v.number(),
    sure: v.boolean(),
  },
  handler: async (ctx, { sessionId, playerId, secret, amount, sure }) => {
    await verifyPlayerSecret(ctx, playerId, secret);
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.phase !== "wager") throw new Error("Wagers are not open right now");

    const state = await ctx.db
      .query("dblOrNothingPlayerState")
      .withIndex("by_sessionId_and_playerId", (q) => q.eq("sessionId", sessionId).eq("playerId", playerId))
      .unique();
    if (!state) throw new Error("You're not in this session");
    if (state.eliminated) throw new Error("You've been eliminated");

    const clampedAmount = Math.max(0, Math.min(Math.round(amount), state.stack));
    const useSure = session.settings.sureEnabled && sure;

    const existing = await ctx.db
      .query("dblOrNothingPlayerRounds")
      .withIndex("by_sessionId_and_roundIndex_and_playerId", (q) =>
        q.eq("sessionId", sessionId).eq("roundIndex", session.roundIndex).eq("playerId", playerId),
      )
      .unique();
    if (existing) {
      if (existing.wagerLockedAt !== undefined) throw new Error("Your wager is already locked in");
      await ctx.db.patch(existing._id, {
        wagerAmount: clampedAmount,
        sure: useSure,
        wagerLockedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("dblOrNothingPlayerRounds", {
        sessionId,
        roundIndex: session.roundIndex,
        playerId,
        wagerAmount: clampedAmount,
        sure: useSure,
        wagerLockedAt: Date.now(),
      });
    }

    const meta = await currentQuestionMeta(ctx, session, session.roundIndex);
    await logEvent(ctx, "wager_locked", undefined, {
      roomId: session.roomId,
      sessionId,
      roundIndex: session.roundIndex,
      playerId,
      wagerPercent: state.stack === 0 ? 0 : clampedAmount / state.stack,
      sure: useSure,
      ...meta,
    });

    await maybeAdvanceFromWager(ctx, sessionId);
  },
});

// --- Player: submit an answer ---

export const submitAnswer = mutation({
  args: {
    sessionId: v.id("dblOrNothingSessions"),
    playerId: v.id("players"),
    secret: v.string(),
    answerIndex: v.number(),
  },
  handler: async (ctx, { sessionId, playerId, secret, answerIndex }) => {
    await verifyPlayerSecret(ctx, playerId, secret);
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.phase !== "question") throw new Error("Answers are not open right now");

    const existing = await ctx.db
      .query("dblOrNothingPlayerRounds")
      .withIndex("by_sessionId_and_roundIndex_and_playerId", (q) =>
        q.eq("sessionId", sessionId).eq("roundIndex", session.roundIndex).eq("playerId", playerId),
      )
      .unique();
    if (!existing) throw new Error("No wager on record for this round");
    if (existing.answeredAt !== undefined) throw new Error("You already answered");

    await ctx.db.patch(existing._id, { answerIndex, answeredAt: Date.now() });
    await logEvent(ctx, "answer_submitted", undefined, {
      roomId: session.roomId,
      sessionId,
      roundIndex: session.roundIndex,
      playerId,
    });

    const states = await activePlayerStates(ctx, sessionId);
    const eligible = states.filter(
      (s) => s.joinedAtRoundIndex <= session.roundIndex && !s.eliminated,
    );
    const rows = await roundRowsFor(ctx, sessionId, session.roundIndex);
    const answeredIds = new Set(rows.filter((r) => r.answeredAt !== undefined).map((r) => r.playerId));
    if (eligible.length > 0 && eligible.every((s) => answeredIds.has(s.playerId))) {
      await resolveRound(ctx, sessionId, session.roundIndex);
    }
  },
});

// --- Shared round resolution (server-authoritative chip math) ---

async function resolveRound(
  ctx: MutationCtx,
  sessionId: Id<"dblOrNothingSessions">,
  roundIndex: number,
) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.phase !== "question" || session.roundIndex !== roundIndex) return;
  // Flip phase first so a near-simultaneous timeout/answer can't double-resolve.
  await ctx.db.patch(sessionId, { phase: "reveal" });
  await ctx.scheduler.runAfter(LEADERBOARD_DISPLAY_MS, internal.dblOrNothingSession.autoAdvanceRound, {
    sessionId,
    roundIndex,
  });

  const pack = await ctx.db.get(session.packId);
  if (!pack) return;
  const questionId = session.questionOrder[roundIndex];
  const question = pack.questions.find((q) => q.id === questionId);
  if (!question) return;

  const states = await activePlayerStates(ctx, sessionId);
  const rows = await roundRowsFor(ctx, sessionId, roundIndex);
  const rowsByPlayer = new Map(rows.map((r) => [r.playerId, r]));
  const meta = await currentQuestionMeta(ctx, session, roundIndex);

  for (const state of states) {
    if (state.eliminated) continue;
    const row = rowsByPlayer.get(state.playerId);
    const wager = row?.wagerAmount ?? 0;
    const sure = row?.sure ?? false;
    const correct = row?.answerIndex === question.correctIndex;
    const multiplier = sure ? 1.5 : 1;
    const stackBefore = state.stack;
    let stackAfter = stackBefore + (correct ? wager * multiplier : -wager * multiplier);
    let eliminated: boolean = state.eliminated;

    if (stackAfter <= 0) {
      stackAfter = 0;
      eliminated = true;
    }

    if (row) {
      await ctx.db.patch(row._id, { correct, stackBefore, stackAfter });
    } else {
      await ctx.db.insert("dblOrNothingPlayerRounds", {
        sessionId,
        roundIndex,
        playerId: state.playerId,
        wagerAmount: 0,
        sure: false,
        correct,
        stackBefore,
        stackAfter,
      });
    }
    await ctx.db.patch(state._id, { stack: stackAfter, eliminated });

    await logEvent(ctx, "round_resolved", undefined, {
      roomId: session.roomId,
      sessionId,
      roundIndex,
      playerId: state.playerId,
      correct,
      wagerAmount: wager,
      wagerPercent: stackBefore === 0 ? 0 : wager / stackBefore,
      sure,
      stackBefore,
      stackAfter,
      ...meta,
    });
  }
}

export const autoResolveRound = internalMutation({
  args: { sessionId: v.id("dblOrNothingSessions"), roundIndex: v.number() },
  handler: async (ctx, { sessionId, roundIndex }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.phase !== "question" || session.roundIndex !== roundIndex) return;
    // Anyone who never answered is scored wrong on whatever they wagered.
    const rows = await roundRowsFor(ctx, sessionId, roundIndex);
    for (const row of rows) {
      if (row.answeredAt === undefined) {
        await ctx.db.patch(row._id, { answerIndex: -1, answeredAt: Date.now() });
      }
    }
    await resolveRound(ctx, sessionId, roundIndex);
  },
});

// --- System: after the leaderboard has been shown for a few seconds, move
// from reveal to the next round's wager phase automatically, or end the game ---

export const autoAdvanceRound = internalMutation({
  args: { sessionId: v.id("dblOrNothingSessions"), roundIndex: v.number() },
  handler: async (ctx, { sessionId, roundIndex }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.phase !== "reveal" || session.roundIndex !== roundIndex) return;

    const nextRoundIndex = session.roundIndex + 1;
    if (nextRoundIndex >= session.settings.rounds) {
      // A session's own end time, not the room's — a room can host more
      // than one game, so "ended" here must not imply the room closed.
      await ctx.db.patch(sessionId, { phase: "ended", phaseDeadline: undefined, endedAt: Date.now() });
      const finalStates = await activePlayerStates(ctx, sessionId);
      const sorted = [...finalStates].sort((a, b) => b.stack - a.stack);
      const standings = sorted.map((s) => ({ playerId: s.playerId, stack: s.stack, eliminated: s.eliminated }));
      const winnerStack = sorted[0]?.stack ?? 0;
      const runnerUpStack = sorted[1]?.stack ?? 0;
      await logEvent(ctx, "game_ended", undefined, {
        roomId: session.roomId,
        sessionId,
        packId: session.packId,
        playerCount: sorted.length,
        standings,
        winnerMargin: winnerStack - runnerUpStack,
        tiedForFirst: sorted.filter((s) => s.stack === winnerStack).length > 1,
      });
      return;
    }

    const deadline = Date.now() + session.settings.wagerSeconds * 1000;
    await ctx.db.patch(sessionId, {
      phase: "wager",
      roundIndex: nextRoundIndex,
      phaseDeadline: deadline,
    });
    await ctx.scheduler.runAfter(session.settings.wagerSeconds * 1000, internal.dblOrNothingSession.autoLockWagers, {
      sessionId,
      roundIndex: nextRoundIndex,
    });
  },
});

// --- Public queries (no secrets â€” wagers/answers of other players never appear here) ---

export const getForRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db
      .query("dblOrNothingSessions")
      .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
      .unique();
  },
});

export const getCurrentQuestion = query({
  args: { sessionId: v.id("dblOrNothingSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const pack = await ctx.db.get(session.packId);
    if (!pack) return null;
    const questionId = session.questionOrder[session.roundIndex];
    const question = pack.questions.find((q) => q.id === questionId);
    if (!question) return null;

    const base = {
      roundIndex: session.roundIndex,
      roundsTotal: session.settings.rounds,
      category: question.category,
      difficulty: question.difficulty,
      isFinalRound: session.roundIndex === session.settings.rounds - 1,
      uncapped: session.roundIndex === session.settings.rounds - 1 && session.settings.finalRoundUncapped,
    };
    if (session.phase === "preview" || session.phase === "wager") {
      return { ...base, question: null, options: null, correctIndex: null, imageUrl: null };
    }
    return {
      ...base,
      question: question.question,
      options: question.options,
      correctIndex: session.phase === "reveal" || session.phase === "ended" ? question.correctIndex : null,
      imageUrl: question.imageUrl ?? null,
    };
  },
});

export const getStandings = query({
  args: { sessionId: v.id("dblOrNothingSessions") },
  handler: async (ctx, { sessionId }) => {
    const states = await ctx.db
      .query("dblOrNothingPlayerState")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
    const withNicknames = await Promise.all(
      states.map(async (s) => {
        const player = await ctx.db.get(s.playerId);
        return {
          playerId: s.playerId,
          nickname: player?.nickname ?? "?",
          stack: s.stack,
          eliminated: s.eliminated,
        };
      }),
    );
    withNicknames.sort((a, b) => b.stack - a.stack);
    let rank = 0;
    let lastStack: number | null = null;
    return withNicknames.map((row, i) => {
      if (lastStack === null || row.stack !== lastStack) {
        rank = i + 1;
        lastStack = row.stack;
      }
      return { ...row, rank };
    });
  },
});

export const getWagerProgress = query({
  args: { sessionId: v.id("dblOrNothingSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return { locked: 0, total: 0 };
    const states = await ctx.db
      .query("dblOrNothingPlayerState")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
    const eligible = states.filter(
      (s) => s.joinedAtRoundIndex <= session.roundIndex && !s.eliminated,
    );
    const rows = await roundRowsFor(ctx, sessionId, session.roundIndex);
    const locked = rows.filter((r) => r.wagerLockedAt !== undefined).length;
    return { locked, total: eligible.length };
  },
});

// Same idea as getWagerProgress but for the answer phase â€” used for
// "N still deciding" style copy so the countdown reads as a social wait,
// not dead air.
export const getAnswerProgress = query({
  args: { sessionId: v.id("dblOrNothingSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return { answered: 0, total: 0 };
    const states = await ctx.db
      .query("dblOrNothingPlayerState")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
    const eligible = states.filter(
      (s) => s.joinedAtRoundIndex <= session.roundIndex && !s.eliminated,
    );
    const rows = await roundRowsFor(ctx, sessionId, session.roundIndex);
    const answered = rows.filter((r) => r.answeredAt !== undefined).length;
    return { answered, total: eligible.length };
  },
});

// A player's own hidden state for the current round â€” gated by secret so
// no one can read another player's wager/answer before reveal.
export const getMyRound = query({
  args: { sessionId: v.id("dblOrNothingSessions"), playerId: v.id("players"), secret: v.string() },
  handler: async (ctx, { sessionId, playerId, secret }) => {
    await verifyPlayerSecret(ctx, playerId, secret);
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const state = await ctx.db
      .query("dblOrNothingPlayerState")
      .withIndex("by_sessionId_and_playerId", (q) => q.eq("sessionId", sessionId).eq("playerId", playerId))
      .unique();
    const row = await ctx.db
      .query("dblOrNothingPlayerRounds")
      .withIndex("by_sessionId_and_roundIndex_and_playerId", (q) =>
        q.eq("sessionId", sessionId).eq("roundIndex", session.roundIndex).eq("playerId", playerId),
      )
      .unique();
    return {
      stack: state?.stack ?? null,
      eliminated: state?.eliminated ?? false,
      wagerAmount: row?.wagerAmount ?? null,
      sure: row?.sure ?? false,
      wagerLocked: row?.wagerLockedAt !== undefined,
      answerIndex: row?.answerIndex ?? null,
      correct: row?.correct ?? null,
      stackAfter: row?.stackAfter ?? null,
    };
  },
});

// Every player's wager/answer/result for one round â€” safe to expose only
// once that round has actually resolved (its mystery is over the moment
// the host reaches "reveal"), used for rivalry/near-miss callouts
// ("you just passed Sara") that need before/after stacks for everyone,
// not just the querying player.
export const getRoundResults = query({
  args: { sessionId: v.id("dblOrNothingSessions"), roundIndex: v.number() },
  handler: async (ctx, { sessionId, roundIndex }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const resolved =
      roundIndex < session.roundIndex ||
      (roundIndex === session.roundIndex && (session.phase === "reveal" || session.phase === "ended"));
    if (!resolved) return null;

    const rows = await roundRowsFor(ctx, sessionId, roundIndex);
    return await Promise.all(
      rows.map(async (r) => {
        const player = await ctx.db.get(r.playerId);
        return {
          playerId: r.playerId,
          nickname: player?.nickname ?? "?",
          wagerAmount: r.wagerAmount ?? 0,
          sure: r.sure,
          correct: r.correct ?? false,
          stackBefore: r.stackBefore ?? 0,
          stackAfter: r.stackAfter ?? 0,
        };
      }),
    );
  },
});
