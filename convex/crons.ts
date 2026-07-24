import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Keeps the raw events table bounded. See README "Data retention" for how
// to change the window or run this manually.
crons.interval("purge old analytics events", { hours: 24 }, internal.analytics.purgeOldEvents, {});

// A missed heartbeat only becomes "disconnected" once enough time has
// passed without a new one — this sweep is what actually makes that call.
crons.interval("sweep player presence", { seconds: 20 }, internal.players.sweepDisconnects, {});

export default crons;
