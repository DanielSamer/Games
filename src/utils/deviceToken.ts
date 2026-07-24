const STORAGE_KEY = "e3dady-device-token";

// A random anonymous identifier for this browser, persisted so returning to
// a room (or reconnecting after a dropped connection) restores the same
// player row and stack. Never derived from IP, user agent, or any
// fingerprint — see README "Analytics" section for the same rule applied
// to instrumentation.
export function getDeviceToken(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    return crypto.randomUUID();
  }
}
