import { internalQuery } from "./_generated/server";

// Named reporting queries over the `events` table. These back the questions
// documented in analytics/queries.sql (Convex has no SQL layer — this file
// is the real implementation those comments point to).
//
// All internal-only: nothing here is reachable by a player or host client.
// Phase B's admin dashboard will call these from admin-gated functions.

const DAY_MS = 24 * 60 * 60 * 1000;

function dayBucket(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// "Host sign-ups and sign-ins per day, over the last N days."
export const hostActivityByDay = internalQuery({
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - 30 * DAY_MS;
    const buckets = new Map<string, { signedUp: number; signedIn: number }>();
    for (const eventType of ["host_signed_up", "host_signed_in"] as const) {
      const rows = await ctx.db
        .query("events")
        .withIndex("by_eventType_and_occurredAt", (q) =>
          q.eq("eventType", eventType).gte("occurredAt", since),
        )
        .collect();
      for (const row of rows) {
        const key = dayBucket(row.occurredAt);
        const bucket = buckets.get(key) ?? { signedUp: 0, signedIn: 0 };
        if (eventType === "host_signed_up") bucket.signedUp++;
        else bucket.signedIn++;
        buckets.set(key, bucket);
      }
    }
    return [...buckets.entries()]
      .map(([day, counts]) => ({ day, ...counts }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
});

// "How many sessions per host, and did they run a second one within 30 days
// of their first?" A "session" is approximated here as a game_play_started
// event, the closest thing Phase A has to a room/session concept.
export const hostRepeatWithin30Days = internalQuery({
  args: {},
  handler: async (ctx) => {
    const plays = await ctx.db
      .query("events")
      .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", "game_play_started"))
      .collect();

    const byHost = new Map<string, number[]>();
    for (const event of plays) {
      if (!event.userId) continue;
      const times = byHost.get(event.userId) ?? [];
      times.push(event.occurredAt);
      byHost.set(event.userId, times);
    }

    let hostsWithAnyPlay = 0;
    let hostsWithRepeatWithin30Days = 0;
    const playsPerHost: { userId: string; sessionCount: number }[] = [];
    for (const [userId, times] of byHost) {
      hostsWithAnyPlay++;
      times.sort((a, b) => a - b);
      playsPerHost.push({ userId, sessionCount: times.length });
      if (times.length > 1 && times[1] - times[0] <= 30 * DAY_MS) {
        hostsWithRepeatWithin30Days++;
      }
    }

    return {
      hostsWithAnyPlay,
      hostsWithRepeatWithin30Days,
      repeatRate: hostsWithAnyPlay === 0 ? 0 : hostsWithRepeatWithin30Days / hostsWithAnyPlay,
      playsPerHost,
    };
  },
});

// "Which games are chosen, and which are never chosen?" — counts
// game_play_started events grouped by gameId + gameType from the payload.
export const gamePlayStartsByGame = internalQuery({
  args: {},
  handler: async (ctx) => {
    const plays = await ctx.db
      .query("events")
      .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", "game_play_started"))
      .collect();

    const counts = new Map<string, { gameId: string; gameType: string; timesStarted: number }>();
    for (const event of plays) {
      const payload = event.payload as { gameId?: string; gameType?: string } | undefined;
      if (!payload?.gameId) continue;
      const key = payload.gameId;
      const existing = counts.get(key) ?? {
        gameId: payload.gameId,
        gameType: payload.gameType ?? "unknown",
        timesStarted: 0,
      };
      existing.timesStarted++;
      counts.set(key, existing);
    }
    return [...counts.values()].sort((a, b) => b.timesStarted - a.timesStarted);
  },
});

// "How many games were created, by type, over time?"
export const gamesCreatedByDay = internalQuery({
  args: {},
  handler: async (ctx) => {
    const buckets = new Map<string, { familyFeud: number; chaser: number }>();
    for (const eventType of ["game_created", "chaser_created"] as const) {
      const rows = await ctx.db
        .query("events")
        .withIndex("by_eventType_and_occurredAt", (q) => q.eq("eventType", eventType))
        .collect();
      for (const row of rows) {
        const key = dayBucket(row.occurredAt);
        const bucket = buckets.get(key) ?? { familyFeud: 0, chaser: 0 };
        if (eventType === "game_created") bucket.familyFeud++;
        else bucket.chaser++;
        buckets.set(key, bucket);
      }
    }
    return [...buckets.entries()]
      .map(([day, counts]) => ({ day, ...counts }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
});
