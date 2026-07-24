import { v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// Single source of truth for every event this app emits. Add new event
// types here — do not scatter ad-hoc string literals across the codebase.
export const EVENT_TYPES = [
  // Host account lifecycle
  "host_signed_up",
  "host_signed_in",
  // Family Feud game CRUD
  "game_created",
  "game_renamed",
  "game_deleted",
  "round_added",
  "round_updated",
  "round_removed",
  // Chaser game CRUD
  "chaser_created",
  "chaser_renamed",
  "chaser_deleted",
  "question_added",
  "question_updated",
  "question_removed",
  "questions_imported",
  // Gameplay
  "game_play_started",
  // Double or Nothing content pack
  "dbl_or_nothing_pack_created",
  // Live room platform
  "room_joined",
  "player_disconnected",
  "player_reconnected",
  // Double or Nothing live rounds
  "game_started",
  "round_preview_shown",
  "wager_locked",
  "answer_submitted",
  "round_resolved",
  "game_ended",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// Event types a client is allowed to report directly (via logClientEvent).
// Everything else is only ever logged from trusted server-side mutations,
// so a player/host can't forge arbitrary event rows.
const CLIENT_EVENT_TYPES = ["host_signed_up", "host_signed_in", "game_play_started"] as const;

const RETENTION_DAYS_DEFAULT = 90;
const PURGE_BATCH_SIZE = 200;

export const insertEvent = internalMutation({
  args: {
    eventType: v.string(),
    userId: v.optional(v.id("users")),
    occurredAt: v.number(),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", args);
  },
});

/**
 * Fire-and-forget event logger for use inside mutations. The write is
 * scheduled rather than inlined and every failure is swallowed here, so an
 * analytics outage can never fail or slow down the caller's own mutation.
 */
export async function logEvent(
  ctx: MutationCtx,
  eventType: EventType,
  userId: Id<"users"> | null | undefined,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await ctx.scheduler.runAfter(0, internal.analytics.insertEvent, {
      eventType,
      userId: userId ?? undefined,
      occurredAt: Date.now(),
      payload,
    });
  } catch (err) {
    console.error("[analytics] failed to schedule event", eventType, err);
  }
}

// Entry point for events the client observes directly (sign-in/up
// succeeding, a play screen mounting) that have no corresponding server
// mutation of their own to hang the log call off of.
export const logClientEvent = mutation({
  args: {
    eventType: v.union(...CLIENT_EVENT_TYPES.map((t) => v.literal(t))),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, { eventType, payload }) => {
    const userId = await getAuthUserId(ctx);
    await logEvent(ctx, eventType, userId, payload);
  },
});

// Deletes raw event rows older than `olderThanDays` (default 90), batching
// so each invocation stays within a single transaction's limits and
// rescheduling itself until the backlog is clear. See README for how to
// invoke this manually or on a schedule.
export const purgeOldEvents = internalMutation({
  args: { olderThanDays: v.optional(v.number()) },
  handler: async (ctx, { olderThanDays }) => {
    const cutoff = Date.now() - (olderThanDays ?? RETENTION_DAYS_DEFAULT) * 24 * 60 * 60 * 1000;
    const batch = await ctx.db
      .query("events")
      .withIndex("by_occurredAt", (q) => q.lt("occurredAt", cutoff))
      .take(PURGE_BATCH_SIZE);
    for (const row of batch) {
      await ctx.db.delete(row._id);
    }
    if (batch.length === PURGE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.analytics.purgeOldEvents, { olderThanDays });
    }
  },
});
