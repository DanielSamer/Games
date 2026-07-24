import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DEFAULT_DBL_OR_NOTHING_SETTINGS, type DblOrNothingSettings } from "../types/dblOrNothing";
import { Check } from "lucide-react";
import { Bi } from "../components/Bi";
import { LoadingScreen } from "../components/LoadingScreen";
import { RoomQrCode } from "../components/dblOrNothing/RoomQrCode";
import { StandingsWall } from "../components/dblOrNothing/StandingsWall";

function useCountdown(deadline: number | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

export function DblOrNothingHost() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const packId = searchParams.get("packId") as Id<"dblOrNothingGames"> | null;

  const room = useQuery(api.rooms.getForHost, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const players = useQuery(api.players.listForRoom, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const session = useQuery(api.dblOrNothingSession.getForRoom, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const question = useQuery(
    api.dblOrNothingSession.getCurrentQuestion,
    session ? { sessionId: session._id } : "skip",
  );
  const standings = useQuery(
    api.dblOrNothingSession.getStandings,
    session ? { sessionId: session._id } : "skip",
  );
  const wagerProgress = useQuery(
    api.dblOrNothingSession.getWagerProgress,
    session && session.phase === "wager" ? { sessionId: session._id } : "skip",
  );
  const answerProgress = useQuery(
    api.dblOrNothingSession.getAnswerProgress,
    session && session.phase === "question" ? { sessionId: session._id } : "skip",
  );
  const roundResults = useQuery(
    api.dblOrNothingSession.getRoundResults,
    session && session.phase === "reveal" ? { sessionId: session._id, roundIndex: session.roundIndex } : "skip",
  );
  const previousRanks = useMemo(() => {
    if (!roundResults) return undefined;
    const sorted = [...roundResults].sort((a, b) => b.stackBefore - a.stackBefore);
    const map: Record<string, number> = {};
    sorted.forEach((r, i) => {
      map[r.playerId] = i + 1;
    });
    return map;
  }, [roundResults]);

  const startSession = useMutation(api.dblOrNothingSession.startSession);

  const [settings, setSettings] = useState<DblOrNothingSettings>(DEFAULT_DBL_OR_NOTHING_SETTINGS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countdown = useCountdown(session?.phaseDeadline);

  if (!roomId) {
    return (
      <div className="page-center don-theme">
        <p className="loading-text">Missing room id.</p>
      </div>
    );
  }

  if (room === undefined || players === undefined || session === undefined) {
    return <LoadingScreen en="Loading room…" ar="جاري تحميل الغرفة..." theme="don" />;
  }

  if (room === null) {
    return (
      <div className="page-center don-theme">
        <div className="stub-card">
          <h1 className="stub-title">
            <Bi en="Room not found" ar="الغرفة مش موجودة" />
          </h1>
          <Link to="/double-or-nothing" className="stub-back">
            ← <Bi en="Back to packs" ar="رجوع للحزم" />
          </Link>
        </div>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/don/${room.code}`;

  // --- Pre-game: room lobby, settings, start ---
  if (!session) {
    return (
      <div className="app-shell don-theme">
        <div className="app-topbar">
          <Link to="/double-or-nothing" className="app-topbar__back">
            ← <Bi en="Back to packs" ar="رجوع للحزم" />
          </Link>
        </div>
        <header className="app-header app-header--solo">
          <h1 className="app-title">
            <Bi en="Double or Nothing" ar="ضاعف أو اخسر" />
          </h1>
        </header>
        <main className="app-main don-setup">
          <div className="don-setup__grid">
            <div className="don-setup__join">
              <p className="don-setup__code">{room.code}</p>
              <RoomQrCode url={joinUrl} />
              <p className="don-setup__hint">
                <Bi en="Players: scan or go to" ar="اللاعبين: اسكنوا أو روحوا لـ" /> <code>{joinUrl}</code>
              </p>
              <h3>
                <Bi en="Players in room" ar="اللاعبين في الغرفة" /> ({players.length})
              </h3>
              <ul className="don-roster">
                {players.map((p) => (
                  <li key={p._id}>
                    {p.nickname}{" "}
                    <span
                      className={`don-roster__dot ${p.connected ? "don-roster__dot--online" : ""}`}
                      aria-label={p.connected ? "Online" : "Offline"}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="don-setup__settings">
              <h3>
                <Bi en="Settings" ar="الإعدادات" />
              </h3>
              <label className="round-form__field">
                <span>Rounds</span>
                <input
                  type="number"
                  value={settings.rounds}
                  onChange={(e) => setSettings((s) => ({ ...s, rounds: Number(e.target.value) }))}
                />
              </label>

              <button
                type="button"
                className="don-advanced-toggle"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                {advancedOpen ? "▾" : "▸"} <Bi en="Advanced settings" ar="إعدادات متقدمة" />
              </button>

              {advancedOpen && (
                <div className="don-advanced-panel">
                  <label className="round-form__field">
                    <span>Starting chips</span>
                    <input
                      type="number"
                      value={settings.startingChips}
                      onChange={(e) => setSettings((s) => ({ ...s, startingChips: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="round-form__field">
                    <span>Wager timer (seconds)</span>
                    <input
                      type="number"
                      value={settings.wagerSeconds}
                      onChange={(e) => setSettings((s) => ({ ...s, wagerSeconds: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="round-form__field">
                    <span>Answer timer (seconds)</span>
                    <input
                      type="number"
                      value={settings.answerSeconds}
                      onChange={(e) => setSettings((s) => ({ ...s, answerSeconds: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="round-form__field round-form__field--checkbox">
                    <input
                      type="checkbox"
                      checked={settings.lateJoinerAverageStack}
                      onChange={(e) => setSettings((s) => ({ ...s, lateJoinerAverageStack: e.target.checked }))}
                    />
                    <span>Late joiners start at average stack</span>
                  </label>
                  <label className="round-form__field round-form__field--checkbox">
                    <input
                      type="checkbox"
                      checked={settings.finalRoundUncapped}
                      onChange={(e) => setSettings((s) => ({ ...s, finalRoundUncapped: e.target.checked }))}
                    />
                    <span>Announce final round as uncapped</span>
                  </label>
                </div>
              )}

              <button
                type="button"
                className="round-form__save"
                disabled={!packId || players.length === 0}
                onClick={() => {
                  if (!packId) return;
                  setError(null);
                  void startSession({ roomId: room._id, packId, settings }).catch((err) =>
                    setError(err instanceof Error ? err.message : "Could not start the game"),
                  );
                }}
              >
                <Bi en="Start Game" ar="ابدأ اللعبة" />
              </button>
              {players.length === 0 && (
                <p className="round-form__hint">
                  <Bi en="Waiting for at least one player to join." ar="في انتظار انضمام لاعب واحد على الأقل." />
                </p>
              )}
              {error && <p className="round-form__error">{error}</p>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Live game ---
  return (
    <div className="app-shell don-theme">
      <div className="app-topbar">
        <span>
          <Bi en="Room" ar="الغرفة" /> {room.code}
        </span>
        <span>
          <Bi en="Round" ar="جولة" /> {session.roundIndex + 1}/{session.settings.rounds}
        </span>
      </div>

      <main className="app-main don-stage">
        {session.phase === "wager" && (
          <div className="don-wager-host">
            {question?.isFinalRound && question.uncapped && (
              <p className="don-uncapped-banner">
                <Bi en="FINAL ROUND — UNCAPPED" ar="الجولة الأخيرة — بدون حد" />
              </p>
            )}
            <p className="don-preview__category">
              {question?.category ? <Bi en={question.category.en ?? ""} ar={question.category.ar ?? ""} /> : null}
            </p>
            <p className="don-countdown">{countdown}s</p>
            <div className="don-lock-bar">
              <div
                className="don-lock-bar__fill"
                style={{
                  width:
                    wagerProgress && wagerProgress.total > 0
                      ? `${(wagerProgress.locked / wagerProgress.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <p>
              {wagerProgress?.locked ?? 0} / {wagerProgress?.total ?? 0} <Bi en="wagers locked in" ar="راهنوا" />
            </p>
            {wagerProgress && wagerProgress.total > 0 && (
              <p className="don-still-deciding">
                {wagerProgress.locked >= wagerProgress.total ? (
                  <Bi en="Everyone's locked in!" ar="الكل قفل رهانه!" />
                ) : (
                  <Bi
                    en={`${wagerProgress.total - wagerProgress.locked} still deciding…`}
                    ar={`${wagerProgress.total - wagerProgress.locked} لسه بيفكروا...`}
                  />
                )}
              </p>
            )}
          </div>
        )}

        {session.phase === "question" && question?.question && (
          <div className="don-question-host">
            <p className="don-countdown">{countdown}s</p>
            {question.imageUrl && (
              <img src={question.imageUrl} alt="" className="don-question-image" />
            )}
            <h2 className="don-question-text">
              <Bi en={question.question.en ?? ""} ar={question.question.ar ?? ""} />
            </h2>
            <div className="don-options-grid">
              {question.options?.map((opt, i) => (
                <div key={i} className="don-option-tile">
                  <Bi en={opt.en ?? ""} ar={opt.ar ?? ""} />
                </div>
              ))}
            </div>
            {answerProgress && answerProgress.total > 0 && (
              <p className="don-still-deciding">
                {answerProgress.answered >= answerProgress.total ? (
                  <Bi en="Everyone's answered!" ar="الكل جاوب!" />
                ) : (
                  <Bi
                    en={`${answerProgress.total - answerProgress.answered} still answering…`}
                    ar={`${answerProgress.total - answerProgress.answered} لسه بيجاوبوا...`}
                  />
                )}
              </p>
            )}
          </div>
        )}

        {session.phase === "reveal" && (
          <div className="don-reveal-host">
            {question?.imageUrl && (
              <img src={question.imageUrl} alt="" className="don-question-image" />
            )}
            {question?.question && (
              <h2 className="don-question-text">
                <Bi en={question.question.en ?? ""} ar={question.question.ar ?? ""} />
              </h2>
            )}
            {question?.options && question.correctIndex !== null && (
              <p className="don-correct-answer">
                <Check size={18} aria-hidden="true" /> <Bi en={question.options[question.correctIndex].en ?? ""} ar={question.options[question.correctIndex].ar ?? ""} />
              </p>
            )}
            <StandingsWall
              standings={standings ?? []}
              previousRanks={previousRanks}
              revealKey={session.roundIndex}
            />
          </div>
        )}

        {session.phase === "ended" && (
          <div className="don-ended">
            <h2>
              <Bi en="Final Standings" ar="الترتيب النهائي" />
            </h2>
            <StandingsWall standings={standings ?? []} />
            <Link to="/double-or-nothing" className="round-form__save" style={{ display: "inline-block", marginTop: 16 }}>
              <Bi en="Back to packs" ar="رجوع للحزم" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
