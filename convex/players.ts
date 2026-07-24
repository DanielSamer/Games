import { v } from "convex/values";
import { mutation, query, internalMutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { logEvent } from "./analytics";

const MAX_NICKNAME_LENGTH = 24;
const CONNECTED_WINDOW_MS = 30_000;

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Every player-authenticated mutation/query must call this before reading
// or writing anything tied to that player — playerId alone is not a
// credential, it's visible to the whole room.
export async function verifyPlayerSecret(
  ctx: QueryCtx | MutationCtx,
  playerId: Id<"players">,
  secret: string,
) {
  const player = await ctx.db.get(playerId);
  if (!player || player.secret !== secret) throw new Error("Not authorized");
  return player;
}

async function currentRoundIndexFor(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
  const session = await ctx.db
    .query("dblOrNothingSessions")
    .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
    .unique();
  return session && session.phase !== "ended" ? session.roundIndex : null;
}

function assertValidNickname(nickname: string) {
  const trimmed = nickname.trim();
  if (trimmed.length === 0) throw new Error("Nickname cannot be empty");
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    throw new Error(`Nickname cannot exceed ${MAX_NICKNAME_LENGTH} characters`);
  }
  return trimmed;
}

// Join-or-reconnect. Identity is purely `deviceToken` (a client-generated
// UUID in localStorage) — there is no account, no email, nothing that
// survives a device wipe. A dropped connection never loses a stack: the
// same deviceToken reconnecting just finds its existing player row.
export const joinRoom = mutation({
  args: { code: v.string(), nickname: v.string(), deviceToken: v.string() },
  handler: async (ctx, { code, nickname, deviceToken }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .unique();
    if (!room) throw new Error("Room not found. Double-check the code.");

    const existing = await ctx.db
      .query("players")
      .withIndex("by_roomId_and_deviceToken", (q) =>
        q.eq("roomId", room._id).eq("deviceToken", deviceToken),
      )
      .unique();

    const now = Date.now();
    let playerId;
    let secret;
    if (existing) {
      const wasDisconnected = !existing.connected;
      await ctx.db.patch(existing._id, { connected: true, lastSeenAt: now });
      playerId = existing._id;
      secret = existing.secret;
      if (wasDisconnected) {
        await logEvent(ctx, "player_reconnected", undefined, {
          roomId: room._id,
          playerId,
          roundIndex: await currentRoundIndexFor(ctx, room._id),
        });
      }
    } else {
      const cleanNickname = assertValidNickname(nickname);
      secret = randomSecret();
      playerId = await ctx.db.insert("players", {
        roomId: room._id,
        deviceToken,
        nickname: cleanNickname,
        secret,
        connected: true,
        joinedAt: now,
        lastSeenAt: now,
      });
    }

    // Late joiner into an already-active Double or Nothing session: give
    // them a starting stack per the host's configured rule, not a free
    // pass to the top or bottom of the board.
    if (room.status === "active") {
      const session = await ctx.db
        .query("dblOrNothingSessions")
        .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
        .unique();
      if (session && session.phase !== "ended") {
        const existingState = await ctx.db
          .query("dblOrNothingPlayerState")
          .withIndex("by_sessionId_and_playerId", (q) =>
            q.eq("sessionId", session._id).eq("playerId", playerId),
          )
          .unique();
        if (!existingState) {
          const activeStates = await ctx.db
            .query("dblOrNothingPlayerState")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
            .collect();
          const startingStack =
            session.settings.lateJoinerAverageStack && activeStates.length > 0
              ? Math.round(
                  activeStates.reduce((sum, s) => sum + s.stack, 0) / activeStates.length,
                )
              : session.settings.startingChips;
          await ctx.db.insert("dblOrNothingPlayerState", {
            sessionId: session._id,
            playerId,
            stack: startingStack,
            eliminated: false,
            joinedAtRoundIndex: session.roundIndex,
          });
        }
      }
    }

    await logEvent(ctx, "room_joined", undefined, {
      roomId: room._id,
      playerId,
      isNewPlayer: !existing,
    });

    return { playerId, roomId: room._id, secret };
  },
});

// Cheap presence signal — call every ~15s from a connected player client.
export const heartbeat = mutation({
  args: { playerId: v.id("players"), secret: v.string() },
  handler: async (ctx, { playerId, secret }) => {
    const player = await verifyPlayerSecret(ctx, playerId, secret);
    await ctx.db.patch(playerId, { connected: true, lastSeenAt: Date.now() });
    if (!player.connected) {
      await logEvent(ctx, "player_reconnected", undefined, {
        roomId: player.roomId,
        playerId,
        roundIndex: await currentRoundIndexFor(ctx, player.roomId),
      });
    }
  },
});

const DISCONNECT_THRESHOLD_MS = 30_000;

// Scheduled sweep (see crons.ts) — this is the only way "disconnected" is
// ever actually detected. A stopped heartbeat doesn't tell us anything by
// itself; only checking after time has passed does. Reconnects, by
// contrast, are detected immediately above, the moment a heartbeat or
// re-join arrives — no sweep needed for that direction.
export const sweepDisconnects = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeRooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const cutoff = Date.now() - DISCONNECT_THRESHOLD_MS;
    for (const room of activeRooms) {
      const players = await ctx.db
        .query("players")
        .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
        .collect();
      const staleConnected = players.filter((p) => p.connected && p.lastSeenAt < cutoff);
      if (staleConnected.length === 0) continue;
      const roundIndex = await currentRoundIndexFor(ctx, room._id);
      for (const player of staleConnected) {
        await ctx.db.patch(player._id, { connected: false });
        await logEvent(ctx, "player_disconnected", undefined, {
          roomId: room._id,
          playerId: player._id,
          roundIndex,
        });
      }
    }
  },
});

// Roster for a room. `connected` is derived from recency of the last
// heartbeat rather than trusted as a static flag, so a phone that dies
// without a clean disconnect still ages out.
export const listForRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
      .collect();
    const now = Date.now();
    return players.map((p) => ({
      _id: p._id,
      nickname: p.nickname,
      joinedAt: p.joinedAt,
      connected: now - p.lastSeenAt < CONNECTED_WINDOW_MS,
    }));
  },
});
