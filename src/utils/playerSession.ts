const STORAGE_KEY = "e3dady-player-sessions";

interface PlayerSession {
  playerId: string;
  secret: string;
  nickname: string;
}

function readAll(): Record<string, PlayerSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlayerSession>) : {};
  } catch {
    return {};
  }
}

// Keyed by roomId so a phone that's played in multiple rooms keeps a
// distinct (playerId, secret) pair for each — the secret is what proves
// ownership of a player row when submitting a wager/answer.
export function getPlayerSession(roomId: string): PlayerSession | null {
  return readAll()[roomId] ?? null;
}

export function savePlayerSession(roomId: string, session: PlayerSession) {
  const all = readAll();
  all[roomId] = session;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage failures (private browsing, quota) — the session just
    // won't survive a reload, which only means re-joining with a nickname.
  }
}
