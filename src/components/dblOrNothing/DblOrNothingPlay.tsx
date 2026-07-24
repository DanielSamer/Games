import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Coins, Flame } from "lucide-react";
import { Bi } from "../Bi";
import { LoadingScreen } from "../LoadingScreen";
import { StandingsWall } from "./StandingsWall";
import { playLossFeedback, playWinFeedback } from "../../utils/donFeedback";

const NEAR_MISS_FRACTION = 0.08;
const NEAR_MISS_MIN_GAP = 25;

interface Props {
  roomId: Id<"rooms">;
  playerId: Id<"players">;
  secret: string;
}

const HEARTBEAT_MS = 15_000;

function useCountdown(deadline: number | undefined, serverNow: number | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!deadline || !serverNow) {
      setRemaining(0);
      return;
    }
    // serverNow anchors the deadline to the server's clock so the countdown
    // is correct even if this device's own clock is off.
    const clockOffset = Date.now() - serverNow;
    const tick = () => setRemaining(Math.max(0, Math.round((deadline - (Date.now() - clockOffset)) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, serverNow]);
  return remaining;
}

export function DblOrNothingPlay({ roomId, playerId, secret }: Props) {
  const session = useQuery(api.dblOrNothingSession.getForRoom, { roomId });
  const question = useQuery(
    api.dblOrNothingSession.getCurrentQuestion,
    session ? { sessionId: session._id } : "skip",
  );
  const myRound = useQuery(
    api.dblOrNothingSession.getMyRound,
    session ? { sessionId: session._id, playerId, secret } : "skip",
  );
  const standings = useQuery(
    api.dblOrNothingSession.getStandings,
    session && (session.phase === "reveal" || session.phase === "ended") ? { sessionId: session._id } : "skip",
  );
  const roundResults = useQuery(
    api.dblOrNothingSession.getRoundResults,
    session && session.phase === "reveal" ? { sessionId: session._id, roundIndex: session.roundIndex } : "skip",
  );

  const heartbeat = useMutation(api.players.heartbeat);
  const submitWager = useMutation(api.dblOrNothingSession.submitWager);
  const submitAnswer = useMutation(api.dblOrNothingSession.submitAnswer);

  const [wager, setWager] = useState(0);
  const [sure, setSure] = useState(false);
  const [wagerError, setWagerError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const countdown = useCountdown(session?.phaseDeadline, session?.serverNow);

  useEffect(() => {
    const id = setInterval(() => void heartbeat({ playerId, secret }), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [heartbeat, playerId, secret]);

  useEffect(() => {
    if (myRound?.stack !== null && myRound?.stack !== undefined) {
      setWager((prev) => Math.min(prev, myRound.stack ?? 0));
    }
  }, [myRound?.stack]);

  const revealedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (!session || session.phase !== "reveal" || myRound?.correct === null || myRound?.correct === undefined) return;
    if (revealedRoundRef.current === session.roundIndex) return;
    revealedRoundRef.current = session.roundIndex;
    if (myRound.correct) {
      playWinFeedback();
      setStreak((s) => s + 1);
    } else {
      playLossFeedback();
      setStreak(0);
    }
  }, [session?.phase, session?.roundIndex, myRound?.correct]);

  if (session === undefined) {
    return <LoadingScreen en="Loading room…" ar="جاري تحميل الغرفة..." theme="don" />;
  }

  if (!session) {
    return (
      <div className="page-center don-theme">
        <div className="stub-card">
          <h1 className="stub-title">
            <Bi en="Waiting for the host to start" ar="في انتظار بدء المُقدِّم للعبة" />
          </h1>
        </div>
      </div>
    );
  }

  const stack = myRound?.stack ?? 0;
  const myRank = standings?.find((s) => s.playerId === playerId)?.rank;

  const handleConfirmWager = async () => {
    setWagerError(null);
    try {
      await submitWager({ sessionId: session._id, playerId, secret, amount: wager, sure });
    } catch (err) {
      setWagerError(err instanceof Error ? err.message : "Could not submit wager");
    }
  };

  const handleAnswer = async (index: number) => {
    setAnswerError(null);
    try {
      await submitAnswer({ sessionId: session._id, playerId, secret, answerIndex: index });
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : "Could not submit answer");
    }
  };

  return (
    <div className="don-player don-theme">
      <div className="don-player__stack-bar">
        <span>
          <Bi en="Your stack" ar="رصيدك" />
        </span>
        <strong>{stack}</strong>
        {myRound?.eliminated && (
          <span className="don-player__eliminated">
            <Bi en="Eliminated" ar="خرجت من اللعبة" />
          </span>
        )}
      </div>

      {session.phase === "wager" && (
        <div className="don-player__wager">
          {myRound?.wagerLocked ? (
            <p className="don-player__locked">
              <Bi en="Wager locked in. Waiting for others…" ar="اتقفل الرهان. في انتظار الباقيين..." />
            </p>
          ) : (
            <>
              <p className="don-countdown">{countdown}s</p>
              <p className="don-player__wager-amount">{wager}</p>
              <input
                type="range"
                min={0}
                max={stack}
                value={wager}
                onChange={(e) => setWager(Number(e.target.value))}
                className="don-player__slider"
              />
              {wager > 0 && (
                <p className="don-player__payoff-preview">
                  <span className="don-player__payoff-preview--win">
                    <Bi en="If right" ar="لو صح" />: +{Math.round(wager * (sure ? 1.5 : 1))}
                  </span>
                  <span className="don-player__payoff-preview--loss">
                    <Bi en="If wrong" ar="لو غلط" />: −{Math.round(wager * (sure ? 1.5 : 1))}
                  </span>
                </p>
              )}
              <div className="don-quick-bets">
                <button type="button" onClick={() => setWager((w) => Math.max(0, w - 100))}>
                  -100
                </button>
                <button type="button" onClick={() => setWager((w) => Math.min(stack, w + 100))}>
                  +100
                </button>
                <button type="button" onClick={() => setWager(Math.round(stack / 2))}>
                  <Bi en="Half" ar="النص" />
                </button>
                <button type="button" onClick={() => setWager(stack)}>
                  <Bi en="ALL IN" ar="كل الرصيد" />
                </button>
              </div>
              {session.settings.sureEnabled && (
                <label className="don-sure-toggle">
                  <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
                  <span>
                    <Bi en="SURE (1.5x win or loss)" ar="متأكد (١.٥ ضعف الربح أو الخسارة)" />
                  </span>
                </label>
              )}
              <button type="button" className="don-confirm-button" onClick={() => void handleConfirmWager()}>
                <Bi en="Confirm Wager" ar="تأكيد الرهان" />
              </button>
              {wagerError && <p className="round-form__error">{wagerError}</p>}
            </>
          )}
        </div>
      )}

      {session.phase === "question" && question?.options && (
        <div className="don-player__question">
          <p className="don-countdown">{countdown}s</p>
          <p className="don-player__wager-reminder">
            <Bi en="You bet" ar="راهنت بـ" /> {myRound?.wagerAmount ?? 0}
            {myRound?.sure ? " (SURE)" : ""}
          </p>
          <div className="don-answer-grid">
            {question.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="don-answer-tile"
                disabled={myRound?.answerIndex !== null && myRound?.answerIndex !== undefined}
                onClick={() => void handleAnswer(i)}
              >
                <Bi en={opt.en ?? ""} ar={opt.ar ?? ""} />
              </button>
            ))}
          </div>
          {myRound?.answerIndex !== null && myRound?.answerIndex !== undefined && (
            <p className="don-player__locked">
              <Bi en="Answer locked in." ar="اتقفلت إجابتك." />
            </p>
          )}
          {answerError && <p className="round-form__error">{answerError}</p>}
        </div>
      )}

      {session.phase === "reveal" && (
        <div className={`don-player__reveal ${myRound?.correct ? "don-player__reveal--win" : "don-player__reveal--loss"}`}>
          {(() => {
            const wagerAmount = myRound?.wagerAmount ?? 0;
            const multiplier = myRound?.sure ? 1.5 : 1;
            const delta = Math.round(wagerAmount * multiplier) * (myRound?.correct ? 1 : -1);
            return (
              <p className={`don-player__result ${myRound?.correct ? "don-player__result--win" : "don-player__result--loss"}`}>
                {delta >= 0 ? `+${delta}` : delta}
              </p>
            );
          })()}
          <p>
            <Bi en="Your new stack" ar="رصيدك الجديد" />: {myRound?.stackAfter ?? stack}
          </p>
          {myRank && (
            <p>
              <Bi en="Your position" ar="ترتيبك" />: #{myRank}
            </p>
          )}

          {myRound?.correct && streak >= 2 && (
            <p className="don-player__callout don-player__callout--streak">
              <Flame size={16} aria-hidden="true" /> <Bi en={`On a streak — ${streak} in a row!`} ar={`في سلسلة انتصارات — ${streak} على التوالي!`} />
            </p>
          )}

          {(() => {
            if (!roundResults) return null;
            const me = roundResults.find((r) => r.playerId === playerId);
            if (!me?.correct || me.stackBefore <= 0) return null;
            const isBigRisk = me.wagerAmount >= me.stackBefore * 0.5 && me.wagerAmount > 0;
            if (!isBigRisk) return null;
            return (
              <p className="don-player__callout don-player__callout--big-risk">
                <Coins size={16} aria-hidden="true" /> <Bi en="Big risk paid off!" ar="المخاطرة الكبيرة نجحت!" />
              </p>
            );
          })()}

          {(() => {
            if (!roundResults || !standings) return null;
            const me = roundResults.find((r) => r.playerId === playerId);
            if (!me) return null;

            const passed = roundResults.filter(
              (r) => r.playerId !== playerId && r.stackBefore > me.stackBefore && r.stackAfter < me.stackAfter,
            );
            if (passed.length > 0) {
              const names = passed.map((p) => p.nickname).join(", ");
              return (
                <p className="don-player__callout don-player__callout--passed">
                  <Flame size={16} aria-hidden="true" /> <Bi en={`You just passed ${names}!`} ar={`لسه فُت ${names}!`} />
                </p>
              );
            }

            const leader = standings[0];
            if (leader && leader.playerId !== playerId) {
              const gap = leader.stack - (me.stackAfter ?? 0);
              const threshold = Math.max(NEAR_MISS_MIN_GAP, leader.stack * NEAR_MISS_FRACTION);
              if (gap > 0 && gap <= threshold) {
                return (
                  <p className="don-player__callout don-player__callout--near-miss">
                    <Bi
                      en={`Only ${gap} chips from the lead!`}
                      ar={`ناقصك ${gap} بس عشان تتصدر!`}
                    />
                  </p>
                );
              }
            }
            return null;
          })()}
        </div>
      )}

      {session.phase === "ended" && (
        <div className="don-player__ended">
          <h2>
            <Bi en="Final Standings" ar="الترتيب النهائي" />
          </h2>
          {standings && <StandingsWall standings={standings} />}
        </div>
      )}
    </div>
  );
}
