import type { ChaserPhase, ChaserSide } from "../../types/chaser";
import { Bi } from "../Bi";

interface Props {
  phase: ChaserPhase;
  running: boolean;
  muted: boolean;
  showAnswer: boolean;
  configuredTimes: Record<ChaserSide, number>;
  questionCount: number;
  stealActive: boolean;
  onSetTime: (side: ChaserSide, seconds: number) => void;
  onStart: (firstSide: ChaserSide) => void;
  onCorrect: () => void;
  onWrong: () => void;
  onStealResolve: (stolen: boolean) => void;
  onTogglePause: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onToggleShowAnswer: () => void;
  onManageQuestions: () => void;
}

export function ChaserHostControls({
  phase,
  running,
  muted,
  showAnswer,
  configuredTimes,
  questionCount,
  stealActive,
  onSetTime,
  onStart,
  onCorrect,
  onWrong,
  onStealResolve,
  onTogglePause,
  onReset,
  onToggleMute,
  onToggleShowAnswer,
  onManageQuestions,
}: Props) {
  if (phase === "setup") {
    return (
      <div className="host-controls chaser-host-controls">
        <div className="host-controls__row">
          <label className="host-controls__field">
            <span>
              <Bi en="Contestant time (s)" ar="وقت المتسابق (ث)" />
            </span>
            <input
              type="number"
              min={5}
              value={configuredTimes.contestant}
              onChange={(e) => onSetTime("contestant", Number(e.target.value))}
            />
          </label>
          <label className="host-controls__field">
            <span>
              <Bi en="Chaser time (s)" ar="وقت الملاحق (ث)" />
            </span>
            <input
              type="number"
              min={5}
              value={configuredTimes.chaser}
              onChange={(e) => onSetTime("chaser", Number(e.target.value))}
            />
          </label>
          <button type="button" className="host-controls__create" onClick={onManageQuestions}>
            <Bi en="+ Manage Questions" ar="+ إدارة الأسئلة" /> ({questionCount})
          </button>
        </div>
        <div className="host-controls__row">
          <button
            type="button"
            className="host-controls__award host-controls__award--a"
            onClick={() => onStart("contestant")}
            disabled={questionCount === 0}
          >
            <Bi en="Start — Contestant Answers First" ar="ابدأ — المتسابق يجاوب الأول" />
          </button>
          <button
            type="button"
            className="host-controls__award host-controls__award--b"
            onClick={() => onStart("chaser")}
            disabled={questionCount === 0}
          >
            <Bi en="Start — Chaser Answers First" ar="ابدأ — الملاحق يجاوب الأول" />
          </button>
        </div>
        {questionCount === 0 && (
          <p className="round-form__error">
            <Bi en="Add questions before starting." ar="ضيف أسئلة قبل ما تبدأ." />
          </p>
        )}
      </div>
    );
  }

  if (stealActive) {
    return (
      <div className="host-controls chaser-host-controls">
        <div className="host-controls__row">
          <p className="chaser-steal-banner">
            <Bi
              en="Chaser missed it — did the Contestant steal it back?"
              ar="الملاحق غلط — المتسابق خطفها؟"
            />
          </p>
        </div>
        <div className="host-controls__row">
          <button
            type="button"
            className="host-controls__award host-controls__award--a"
            onClick={() => onStealResolve(true)}
          >
            ✓ <Bi en="Contestant Stole It (-1 Chaser)" ar="المتسابق خطفها (-1 للملاحق)" />
          </button>
          <button type="button" className="host-controls__strike" onClick={() => onStealResolve(false)}>
            ✕ <Bi en="Contestant Missed Too" ar="المتسابق غلط برضو" />
          </button>
          <button type="button" onClick={onTogglePause} disabled={phase !== "playing"}>
            {running ? <Bi en="⏸ Pause" ar="⏸ إيقاف مؤقت" /> : <Bi en="▶ Resume" ar="▶ استكمال" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="host-controls chaser-host-controls">
      <div className="host-controls__row">
        <button type="button" className="host-controls__award host-controls__award--a" onClick={onCorrect} disabled={phase !== "playing"}>
          ✓ <Bi en="Correct (Space)" ar="صح (مسافة)" />
        </button>
        <button type="button" className="host-controls__strike" onClick={onWrong} disabled={phase !== "playing"}>
          ✕ <Bi en="Wrong (X)" ar="غلط (X)" />
        </button>
        <button type="button" onClick={onTogglePause} disabled={phase !== "playing"}>
          {running ? <Bi en="⏸ Pause" ar="⏸ إيقاف مؤقت" /> : <Bi en="▶ Resume" ar="▶ استكمال" />}
        </button>
        <button type="button" className="host-controls__danger" onClick={onReset}>
          <Bi en="Reset" ar="إعادة" />
        </button>
      </div>
      <div className="host-controls__row">
        <button type="button" onClick={onToggleShowAnswer}>
          {showAnswer ? <Bi en="Hide Answer" ar="إخفاء الإجابة" /> : <Bi en="Show Answer" ar="إظهار الإجابة" />}
        </button>
        <button type="button" onClick={onToggleMute}>
          {muted ? "🔇" : "🔊"}
        </button>
        <button type="button" onClick={onManageQuestions}>
          <Bi en="Manage Questions" ar="إدارة الأسئلة" />
        </button>
      </div>
    </div>
  );
}
