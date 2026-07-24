import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { downloadCsv } from "../utils/csvExport";

type Period = "today" | "7d" | "30d" | "all";
type Tab = "overview" | "popularity" | "time" | "reliability" | "questions" | "sessions" | "hosts";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "popularity", label: "Popularity" },
  { id: "time", label: "Time Patterns" },
  { id: "reliability", label: "Reliability" },
  { id: "questions", label: "Question Health" },
  { id: "sessions", label: "Sessions" },
  { id: "hosts", label: "Hosts" },
];

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-tile">
      <div className="admin-tile__value">{value}</div>
      <div className="admin-tile__label">{label}</div>
    </div>
  );
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="admin-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="admin-skeleton__row" style={{ width: `${60 + ((i * 13) % 35)}%` }} />
      ))}
    </div>
  );
}

// Ranked magnitude bars — a single sequential hue, not one color per row
// (this is a ranked list, not a chart where each row needs its own
// identity), per the dataviz "one axis / color follows the job" rule.
function BarList({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="admin-empty">No data yet.</p>;
  return (
    <div className="admin-barlist">
      {rows.map((row, i) => (
        <div key={i} className="admin-barlist__row">
          <div className="admin-barlist__label">
            {row.label}
            {row.sub && <span className="admin-barlist__sub">{row.sub}</span>}
          </div>
          <div className="admin-barlist__track">
            <div className="admin-barlist__fill" style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }} />
          </div>
          <div className="admin-barlist__value">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function WeekTrend({ points }: { points: { weekStart: string; count: number }[] }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const w = 480;
  const h = 100;
  const step = w / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => [i * step, h - (p.count / max) * (h - 16) - 4] as const);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="admin-trend" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--admin-accent)" strokeWidth={2} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--admin-accent)" />
      ))}
    </svg>
  );
}

// Sequential single-hue heatmap (magnitude, not identity) — numbers are
// always visible on the cell itself, not hidden behind a hover-only title,
// since this needs to be readable at a glance on a phone mid-event.
function Heatmap({ byHour, byDayOfWeek }: { byHour: number[]; byDayOfWeek: number[] }) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxHour = Math.max(1, ...byHour);
  const maxDay = Math.max(1, ...byDayOfWeek);
  return (
    <div className="admin-heatmap-group">
      <div>
        <h4 className="admin-subheading">By hour of day</h4>
        <div className="admin-heatmap-row">
          {byHour.map((v, h) => (
            <div key={h} className="admin-heatmap-cell" style={{ opacity: 0.15 + (v / maxHour) * 0.85 }}>
              <span className="admin-heatmap-cell__label">{h}</span>
              <span className="admin-heatmap-cell__value">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="admin-subheading">By day of week</h4>
        <div className="admin-heatmap-row">
          {byDayOfWeek.map((v, d) => (
            <div key={d} className="admin-heatmap-cell admin-heatmap-cell--wide" style={{ opacity: 0.15 + (v / maxDay) * 0.85 }}>
              <span className="admin-heatmap-cell__label">{dayNames[d]}</span>
              <span className="admin-heatmap-cell__value">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtDate(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function PeriodSelect({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="admin-period-select">
      {(["today", "7d", "30d", "all"] as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          className={`admin-tab${period === p ? " admin-tab--active" : ""}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("7d");

  const overview = useQuery(api.adminDashboard.overview, { period });
  const returningDevices = useQuery(api.adminDashboard.returningDevices, tab === "overview" ? {} : "skip");
  const popularity = useQuery(api.adminDashboard.popularity, tab === "popularity" ? { period } : "skip");
  const timePatterns = useQuery(api.adminDashboard.timePatterns, tab === "time" ? {} : "skip");
  const reliability = useQuery(api.adminDashboard.reliability, tab === "reliability" ? { period } : "skip");
  const hosts = useQuery(api.adminDashboard.hostsList, tab === "hosts" ? {} : "skip");
  const sessions = useQuery(api.adminDashboard.sessionsList, tab === "sessions" ? { period } : "skip");
  const questionHealth = useQuery(api.adminDashboard.questionHealth, tab === "questions" ? {} : "skip");

  const showPeriod = tab === "overview" || tab === "popularity" || tab === "reliability" || tab === "sessions";

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <Link to="/" className="admin-back">
          ← Back to menu
        </Link>
        <h1>Admin Dashboard</h1>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-tab${tab === t.id ? " admin-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showPeriod && <PeriodSelect period={period} onChange={setPeriod} />}

      {tab === "overview" && (
        <div className="admin-panel">
          {overview ? (
            <>
              <div className="admin-tiles">
                <StatTile label="Unique devices" value={overview.uniqueDevices} />
                <StatTile label="Total joins" value={overview.totalJoins} />
                <StatTile label="Sessions run (DoN)" value={overview.sessionsRun} />
                <StatTile label="Family Feud plays" value={overview.gamesPlayed.familyFeud} />
                <StatTile label="Chaser plays" value={overview.gamesPlayed.chaser} />
                {returningDevices && (
                  <StatTile
                    label="Returning devices"
                    value={`${returningDevices.returningDevices} (${Math.round(returningDevices.returningRate * 100)}%)`}
                  />
                )}
              </div>
              <h3 className="admin-subheading">Sessions per week (last 8 weeks)</h3>
              <WeekTrend points={overview.sessionsPerWeek} />
            </>
          ) : (
            <Skeleton />
          )}
        </div>
      )}

      {tab === "popularity" && (
        <div className="admin-panel">
          {popularity ? (
            <>
              <h3 className="admin-subheading">By game type</h3>
              <BarList rows={popularity.byGameType.map((g) => ({ label: g.gameType, value: g.plays }))} />
              <h3 className="admin-subheading">Double or Nothing packs</h3>
              <BarList
                rows={popularity.byPack.map((p) => ({
                  label: p.packName,
                  value: p.timesHosted,
                  sub: p.category ?? undefined,
                }))}
              />
              <h3 className="admin-subheading">Family Feud / Chaser games</h3>
              <BarList
                rows={popularity.byFeudGame.map((g) => ({
                  label: g.gameName,
                  value: g.plays,
                  sub: g.category ?? g.gameType,
                }))}
              />
              <h3 className="admin-subheading">By category</h3>
              <BarList rows={popularity.byCategory.map((c) => ({ label: c.category, value: c.plays }))} />
            </>
          ) : (
            <Skeleton />
          )}
        </div>
      )}

      {tab === "time" && (
        <div className="admin-panel">
          {timePatterns ? <Heatmap byHour={timePatterns.byHour} byDayOfWeek={timePatterns.byDayOfWeek} /> : <Skeleton />}
        </div>
      )}

      {tab === "reliability" && (
        <div className="admin-panel">
          {reliability ? (
            <>
              <div className="admin-tiles">
                <StatTile label="Disconnects" value={reliability.totalDisconnects} />
                <StatTile label="Joined but never answered" value={reliability.neverAnsweredTotal} />
              </div>
              <h3 className="admin-subheading">Sessions with disconnects or non-participants</h3>
              {reliability.sessions.length === 0 ? (
                <p className="admin-empty">Nothing flagged in this period.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Pack</th>
                      <th>Players</th>
                      <th>Disconnects</th>
                      <th>Never answered</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reliability.sessions.map((s) => (
                      <tr key={s.sessionId} className={s.isHighDisconnect ? "admin-table__row--flagged" : ""}>
                        <td>{s.roomCode}</td>
                        <td>{s.packName}</td>
                        <td>{s.playerCount}</td>
                        <td>{s.disconnectCount}</td>
                        <td>{s.neverAnswered}</td>
                        <td>{s.isHighDisconnect && <span className="admin-flag-badge">⚠ high disconnects</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <Skeleton />
          )}
        </div>
      )}

      {tab === "hosts" && (
        <div className="admin-panel">
          {hosts ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Host</th>
                  <th>Sessions</th>
                  <th>First</th>
                  <th>Last</th>
                  <th>Repeat within 30d</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((h) => (
                  <tr key={h.hostId}>
                    <td>{h.email}</td>
                    <td>{h.sessionCount}</td>
                    <td>{fmtDate(h.firstSession)}</td>
                    <td>{fmtDate(h.lastSession)}</td>
                    <td>{h.repeatWithin30Days ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Skeleton />
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="admin-panel">
          <div className="admin-panel__toolbar">
            <button
              type="button"
              className="pack-btn pack-btn--ghost"
              disabled={!sessions || sessions.length === 0}
              onClick={() =>
                sessions &&
                downloadCsv(
                  "sessions.csv",
                  sessions.map((s) => ({
                    room: s.roomCode,
                    host: s.hostEmail,
                    pack: s.packName,
                    players: s.playerCount,
                    round: `${s.roundIndex + 1}/${s.totalRounds}`,
                    phase: s.phase,
                    started: fmtDate(s.startedAt),
                    ended: fmtDate(s.endedAt),
                  })),
                )
              }
            >
              Export CSV
            </button>
          </div>
          {sessions ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Host</th>
                  <th>Pack</th>
                  <th>Players</th>
                  <th>Round</th>
                  <th>Started</th>
                  <th>Ended</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.sessionId}>
                    <td>{s.roomCode}</td>
                    <td>{s.hostEmail}</td>
                    <td>{s.packName}</td>
                    <td>{s.playerCount}</td>
                    <td>
                      {s.roundIndex + 1}/{s.totalRounds} ({s.phase})
                    </td>
                    <td>{fmtDate(s.startedAt)}</td>
                    <td>{fmtDate(s.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Skeleton />
          )}
        </div>
      )}

      {tab === "questions" && (
        <div className="admin-panel">
          <div className="admin-panel__toolbar">
            <button
              type="button"
              className="pack-btn pack-btn--ghost"
              disabled={!questionHealth || questionHealth.length === 0}
              onClick={() =>
                questionHealth &&
                downloadCsv(
                  "question-health.csv",
                  questionHealth.map((q) => ({
                    question: q.questionText,
                    pack: q.packName,
                    category: q.category,
                    difficulty: q.difficulty,
                    timesAsked: q.timesAsked,
                    correctPercent: Math.round(q.correctRate * 100),
                    skipPercent: Math.round(q.skipRate * 100),
                    avgWagerPercent: Math.round(q.avgWagerPercent * 100),
                    difficultyMismatch: q.difficultyMismatch,
                  })),
                )
              }
            >
              Export CSV
            </button>
          </div>
          {questionHealth ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Pack</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Asked</th>
                  <th>Correct %</th>
                  <th>Skip %</th>
                  <th>Avg wager %</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {questionHealth.map((q) => (
                  <tr key={q.questionId} className={q.difficultyMismatch ? "admin-table__row--flagged" : ""}>
                    <td>{q.questionText}</td>
                    <td>{q.packName}</td>
                    <td>{q.category}</td>
                    <td>{q.difficulty}</td>
                    <td>{q.timesAsked}</td>
                    <td>{Math.round(q.correctRate * 100)}%</td>
                    <td>{Math.round(q.skipRate * 100)}%</td>
                    <td>{Math.round(q.avgWagerPercent * 100)}%</td>
                    <td>{q.difficultyMismatch && <span className="admin-flag-badge">⚠ tag mismatch</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Skeleton />
          )}
        </div>
      )}
    </div>
  );
}
