import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./admin";
import type { Id } from "./_generated/dataModel";

// Design note: wherever the same fact is captured redundantly in a
// permanent operational table (rooms, sessions, player rounds), these
// queries read from that table rather than the `events` log, because
// `events` rows are purged after N days (see analytics.ts) and a "full
// professional" dashboard shouldn't silently lose history past that
// window. `events` is only used here for activity that has no other
// record at all (host sign-ins, Family Feud/Chaser play counts, CRUD
// timestamps).

const DAY_MS = 24 * 60 * 60 * 1000;

const periodValidator = v.union(v.literal("today"), v.literal("7d"), v.literal("30d"), v.literal("all"));
type Period = "today" | "7d" | "30d" | "all";

function periodStart(period: Period): number {
  const now = Date.now();
  if (period === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "7d") return now - 7 * DAY_MS;
  if (period === "30d") return now - 30 * DAY_MS;
  return 0;
}

export const overview = query({
  args: { period: periodValidator },
  handler: async (ctx, { period }) => {
    await requireAdmin(ctx);
    const since = periodStart(period);

    const allPlayers = await ctx.db.query("players").collect();
    const playersInPeriod = allPlayers.filter((p) => p.joinedAt >= since);
    const uniqueDevices = new Set(playersInPeriod.map((p) => p.deviceToken)).size;
    const uniqueDevicesAllTime = new Set(allPlayers.map((p) => p.deviceToken)).size;

    const joinEvents = await ctx.db
      .query("events")
      .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", "room_joined").gte("occurredAt", since))
      .collect();

    const allSessions = await ctx.db.query("dblOrNothingSessions").collect();
    const sessionsInPeriod = allSessions.filter((s) => s._creationTime >= since);

    const familyFeudPlays = await ctx.db
      .query("events")
      .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", "game_play_started").gte("occurredAt", since))
      .collect();
    const chaserCount = familyFeudPlays.filter((e) => (e.payload as { gameType?: string })?.gameType === "chaser").length;
    const feudCount = familyFeudPlays.filter((e) => (e.payload as { gameType?: string })?.gameType === "family-feud").length;

    // Sessions-per-week trend, last 8 weeks, from the permanent sessions table.
    const weeks: { weekStart: string; count: number }[] = [];
    const now = Date.now();
    for (let i = 7; i >= 0; i--) {
      const weekStart = now - i * 7 * DAY_MS;
      const weekEnd = weekStart + 7 * DAY_MS;
      const count = allSessions.filter((s) => s._creationTime >= weekStart && s._creationTime < weekEnd).length;
      weeks.push({ weekStart: new Date(weekStart).toISOString().slice(0, 10), count });
    }

    return {
      uniqueDevices: period === "all" ? uniqueDevicesAllTime : uniqueDevices,
      totalJoins: joinEvents.length,
      sessionsRun: sessionsInPeriod.length,
      gamesPlayed: { familyFeud: feudCount, chaser: chaserCount, dblOrNothing: sessionsInPeriod.length },
      sessionsPerWeek: weeks,
    };
  },
});

export const popularity = query({
  args: { period: periodValidator },
  handler: async (ctx, { period }) => {
    await requireAdmin(ctx);
    const since = periodStart(period);

    const sessions = (await ctx.db.query("dblOrNothingSessions").collect()).filter((s) => s._creationTime >= since);
    const byPack = new Map<string, { packId: string; packName: string; category: string | null; timesHosted: number }>();
    for (const s of sessions) {
      const key = s.packId;
      const existing = byPack.get(key);
      if (existing) {
        existing.timesHosted++;
      } else {
        const pack = await ctx.db.get(s.packId);
        byPack.set(key, {
          packId: key,
          packName: pack?.name ?? "(deleted pack)",
          category: pack?.category ?? null,
          timesHosted: 1,
        });
      }
    }

    const familyFeudPlays = await ctx.db
      .query("events")
      .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", "game_play_started").gte("occurredAt", since))
      .collect();
    const byFeudGame = new Map<string, { gameId: string; gameName: string; category: string | null; gameType: string; plays: number }>();
    for (const e of familyFeudPlays) {
      const payload = e.payload as { gameId?: string; gameType?: string } | undefined;
      if (!payload?.gameId) continue;
      const existing = byFeudGame.get(payload.gameId);
      if (existing) {
        existing.plays++;
        continue;
      }
      const game =
        payload.gameType === "chaser"
          ? await ctx.db.get(payload.gameId as Id<"chaserGames">)
          : await ctx.db.get(payload.gameId as Id<"games">);
      byFeudGame.set(payload.gameId, {
        gameId: payload.gameId,
        gameName: game?.name ?? "(deleted game)",
        category: game?.category ?? null,
        gameType: payload.gameType ?? "unknown",
        plays: 1,
      });
    }

    const byGameType = [
      { gameType: "family-feud", plays: familyFeudPlays.filter((e) => (e.payload as { gameType?: string })?.gameType === "family-feud").length },
      { gameType: "chaser", plays: familyFeudPlays.filter((e) => (e.payload as { gameType?: string })?.gameType === "chaser").length },
      { gameType: "dbl-or-nothing", plays: sessions.length },
    ].sort((a, b) => b.plays - a.plays);

    const categoryCounts = new Map<string, number>();
    for (const p of byPack.values()) {
      if (!p.category) continue;
      categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + p.timesHosted);
    }
    for (const g of byFeudGame.values()) {
      if (!g.category) continue;
      categoryCounts.set(g.category, (categoryCounts.get(g.category) ?? 0) + g.plays);
    }

    return {
      byGameType,
      byPack: [...byPack.values()].sort((a, b) => b.timesHosted - a.timesHosted),
      byFeudGame: [...byFeudGame.values()].sort((a, b) => b.plays - a.plays),
      byCategory: [...categoryCounts.entries()].map(([category, plays]) => ({ category, plays })).sort((a, b) => b.plays - a.plays),
    };
  },
});

export const timePatterns = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const sessions = await ctx.db.query("dblOrNothingSessions").collect();
    const players = await ctx.db.query("players").collect();

    const byHour = new Array(24).fill(0);
    const byDayOfWeek = new Array(7).fill(0);
    const tally = (ms: number) => {
      const d = new Date(ms);
      byHour[d.getHours()]++;
      byDayOfWeek[d.getDay()]++;
    };
    for (const s of sessions) tally(s._creationTime);
    for (const p of players) tally(p.joinedAt);

    return { byHour, byDayOfWeek };
  },
});

export const hostsList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rooms = await ctx.db.query("rooms").collect();
    const sessions = await ctx.db.query("dblOrNothingSessions").collect();
    const roomById = new Map(rooms.map((r) => [r._id, r]));

    const byHost = new Map<string, number[]>();
    for (const s of sessions) {
      const room = roomById.get(s.roomId);
      if (!room) continue;
      const times = byHost.get(room.hostId) ?? [];
      times.push(s._creationTime);
      byHost.set(room.hostId, times);
    }

    const DAY = 24 * 60 * 60 * 1000;
    const result = [];
    for (const [hostId, times] of byHost) {
      times.sort((a, b) => a - b);
      const user = await ctx.db.get(hostId as Id<"users">);
      result.push({
        hostId,
        email: user?.email ?? "(deleted account)",
        sessionCount: times.length,
        firstSession: times[0],
        lastSession: times[times.length - 1],
        repeatWithin30Days: times.length > 1 && times[1] - times[0] <= 30 * DAY,
      });
    }
    return result.sort((a, b) => b.sessionCount - a.sessionCount);
  },
});

export const sessionsList = query({
  args: { period: periodValidator },
  handler: async (ctx, { period }) => {
    await requireAdmin(ctx);
    const since = periodStart(period);
    const sessions = (await ctx.db.query("dblOrNothingSessions").order("desc").take(200))
      .filter((s) => s._creationTime >= since)
      .slice(0, 50);

    return await Promise.all(
      sessions.map(async (s) => {
        const room = await ctx.db.get(s.roomId);
        const host = room ? await ctx.db.get(room.hostId) : null;
        const pack = await ctx.db.get(s.packId);
        const playerStates = await ctx.db
          .query("dblOrNothingPlayerState")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", s._id))
          .collect();
        return {
          sessionId: s._id,
          roomCode: room?.code ?? "?",
          hostEmail: host?.email ?? "(deleted account)",
          packName: pack?.name ?? "(deleted pack)",
          playerCount: playerStates.length,
          startedAt: s._creationTime,
          endedAt: s.endedAt ?? null,
          phase: s.phase,
          roundIndex: s.roundIndex,
          totalRounds: s.settings.rounds,
        };
      }),
    );
  },
});

const DIFFICULTY_EXPECTED_RANGE: Record<string, [number, number]> = {
  easy: [0.65, 1],
  medium: [0.35, 0.7],
  hard: [0, 0.4],
};

export const questionHealth = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const packs = await ctx.db.query("dblOrNothingGames").collect();
    const sessions = await ctx.db.query("dblOrNothingSessions").collect();

    type Agg = {
      questionId: string;
      packName: string;
      category: string;
      difficulty: string;
      questionText: string;
      timesAsked: number;
      timesAnswered: number;
      timesCorrect: number;
      wagerPercentSum: number;
    };
    const byQuestion = new Map<string, Agg>();

    for (const session of sessions) {
      const pack = packs.find((p) => p._id === session.packId);
      if (!pack) continue;
      const rows = await ctx.db
        .query("dblOrNothingPlayerRounds")
        .withIndex("by_sessionId_and_roundIndex", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const row of rows) {
        const questionId = session.questionOrder[row.roundIndex];
        const question = pack.questions.find((q) => q.id === questionId);
        if (!question) continue;
        const key = `${pack._id}:${questionId}`;
        const agg = byQuestion.get(key) ?? {
          questionId,
          packName: pack.name,
          category: question.category.en ?? question.category.ar ?? "",
          difficulty: question.difficulty,
          questionText: question.question.en ?? question.question.ar ?? "",
          timesAsked: 0,
          timesAnswered: 0,
          timesCorrect: 0,
          wagerPercentSum: 0,
        };
        agg.timesAsked++;
        if (row.answeredAt !== undefined) agg.timesAnswered++;
        if (row.correct) agg.timesCorrect++;
        if (row.stackBefore && row.wagerAmount !== undefined) {
          agg.wagerPercentSum += row.stackBefore > 0 ? row.wagerAmount / row.stackBefore : 0;
        }
        byQuestion.set(key, agg);
      }
    }

    const results = [...byQuestion.values()].map((a) => {
      const correctRate = a.timesAnswered > 0 ? a.timesCorrect / a.timesAnswered : 0;
      const skipRate = a.timesAsked > 0 ? (a.timesAsked - a.timesAnswered) / a.timesAsked : 0;
      const avgWagerPercent = a.timesAsked > 0 ? a.wagerPercentSum / a.timesAsked : 0;
      const range = DIFFICULTY_EXPECTED_RANGE[a.difficulty] ?? [0, 1];
      const difficultyMismatch = a.timesAnswered >= 3 && (correctRate < range[0] || correctRate > range[1]);
      return { ...a, correctRate, skipRate, avgWagerPercent, difficultyMismatch };
    });

    // "Most broken first": flagged mismatches float up, then sort by lowest correct rate.
    return results.sort((a, b) => {
      if (a.difficultyMismatch !== b.difficultyMismatch) return a.difficultyMismatch ? -1 : 1;
      return a.correctRate - b.correctRate;
    });
  },
});

// Disconnects/reconnects only exist as events (no permanent counterpart —
// see convex/players.ts sweepDisconnects), so this one does age out with
// the 90-day event purge. "Never answered" is sourced from the permanent
// player-round tables instead, so that half stays accurate indefinitely.
export const reliability = query({
  args: { period: periodValidator },
  handler: async (ctx, { period }) => {
    await requireAdmin(ctx);
    const since = periodStart(period);

    const allDisconnects = await ctx.db
      .query("events")
      .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", "player_disconnected").gte("occurredAt", since))
      .collect();

    // A disconnect logged with no round in progress (`roundIndex: null`) is
    // just someone closing the tab after the game already ended — normal
    // behavior, not a wifi/reliability problem. Only count disconnects that
    // happened mid-round.
    const disconnects = allDisconnects.filter((e) => {
      const roundIndex = (e.payload as { roundIndex?: number | null })?.roundIndex;
      return roundIndex !== null && roundIndex !== undefined;
    });

    const byRoom = new Map<string, number>();
    for (const e of disconnects) {
      const roomId = (e.payload as { roomId?: string })?.roomId;
      if (!roomId) continue;
      byRoom.set(roomId, (byRoom.get(roomId) ?? 0) + 1);
    }

    const sessions = (await ctx.db.query("dblOrNothingSessions").collect()).filter((s) => s._creationTime >= since);
    const flaggedSessions = [];
    let neverAnsweredTotal = 0;

    for (const session of sessions) {
      const room = await ctx.db.get(session.roomId);
      const disconnectCount = room ? byRoom.get(room._id) ?? 0 : 0;
      const playerStates = await ctx.db
        .query("dblOrNothingPlayerState")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      const rows = await ctx.db
        .query("dblOrNothingPlayerRounds")
        .withIndex("by_sessionId_and_roundIndex", (q) => q.eq("sessionId", session._id))
        .collect();
      const answeredPlayerIds = new Set(rows.filter((r) => r.answeredAt !== undefined).map((r) => r.playerId));
      const neverAnswered = playerStates.filter((s) => !answeredPlayerIds.has(s.playerId)).length;
      neverAnsweredTotal += neverAnswered;
      // Flag: more than one mid-round disconnect per two players is unusually
      // high for a real game night — a wifi hiccup or two is expected, and a
      // solo 1-player session is almost always just testing, not a signal.
      const isHighDisconnect = playerStates.length >= 2 && disconnectCount / playerStates.length > 0.5;
      if (disconnectCount > 0 || neverAnswered > 0) {
        const pack = await ctx.db.get(session.packId);
        flaggedSessions.push({
          sessionId: session._id,
          roomCode: room?.code ?? "?",
          packName: pack?.name ?? "(deleted pack)",
          playerCount: playerStates.length,
          disconnectCount,
          neverAnswered,
          isHighDisconnect,
        });
      }
    }

    return {
      totalDisconnects: disconnects.length,
      neverAnsweredTotal,
      sessions: flaggedSessions.sort((a, b) => b.disconnectCount - a.disconnectCount),
    };
  },
});

// "Returning" = the same anonymous device has joined more than one room —
// the only cross-session signal we have without player accounts, and it's
// permanent (players rows are never purged), unlike anything in `events`.
export const returningDevices = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const players = await ctx.db.query("players").collect();
    const roomsByDevice = new Map<string, Set<string>>();
    for (const p of players) {
      const set = roomsByDevice.get(p.deviceToken) ?? new Set<string>();
      set.add(p.roomId);
      roomsByDevice.set(p.deviceToken, set);
    }
    const totalDevices = roomsByDevice.size;
    const returning = [...roomsByDevice.values()].filter((rooms) => rooms.size > 1).length;
    return {
      totalDevices,
      returningDevices: returning,
      returningRate: totalDevices === 0 ? 0 : returning / totalDevices,
    };
  },
});
