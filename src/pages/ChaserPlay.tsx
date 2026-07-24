import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useChaserState } from "../hooks/useChaserState";
import { Bi } from "../components/Bi";
import { ChaserTimerPanel } from "../components/chaser/ChaserTimerPanel";
import { ChaserStepBoard } from "../components/chaser/ChaserStepBoard";
import { ChaserQuestionCard } from "../components/chaser/ChaserQuestionCard";
import { ChaserHostControls } from "../components/chaser/ChaserHostControls";
import { ChaserQuestionManager } from "../components/chaser/ChaserQuestionManager";
import { setMuted } from "../audio/sounds";

export function ChaserPlay() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = useQuery(api.chaser.get, gameId ? { gameId: gameId as Id<"chaserGames"> } : "skip");
  const addQuestion = useMutation(api.chaser.addQuestion);
  const updateQuestion = useMutation(api.chaser.updateQuestion);
  const removeQuestion = useMutation(api.chaser.removeQuestion);
  const importQuestions = useMutation(api.chaser.importQuestions);
  const logClientEvent = useMutation(api.analytics.logClientEvent);

  const questions = game?.questions ?? [];
  const {
    state,
    currentQuestion,
    times,
    setTime,
    start,
    correct,
    wrong,
    stealResolve,
    togglePause,
    reset,
    toggleMute,
  } = useChaserState(questions);

  const [questionManagerOpen, setQuestionManagerOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setMuted(state.muted);
  }, [state.muted]);

  useEffect(() => {
    if (!game) return;
    void logClientEvent({
      eventType: "game_play_started",
      payload: { gameId: game._id, gameType: "chaser" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?._id]);

  useEffect(() => {
    document.documentElement.dir = "ltr";
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (questionManagerOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }
      if (state.phase !== "playing") return;
      if (state.stealActive) {
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          stealResolve(true);
        } else if (e.key.toLowerCase() === "x") {
          stealResolve(false);
        } else if (e.key.toLowerCase() === "p") {
          togglePause();
        }
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        correct();
      } else if (e.key.toLowerCase() === "x") {
        wrong();
      } else if (e.key.toLowerCase() === "p") {
        togglePause();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state.phase, state.stealActive, correct, wrong, stealResolve, togglePause, questionManagerOpen]);

  if (!gameId) {
    return (
      <div className="page-center">
        <p>
          <Bi en="Missing game id." ar="مفيش رقم لعبة." />
        </p>
      </div>
    );
  }

  if (game === undefined) {
    return (
      <div className="page-center chaser-theme">
        <p className="loading-text">
          <Bi en="Loading game…" ar="جاري تحميل اللعبة..." />
        </p>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="page-center chaser-theme">
        <div className="stub-card">
          <h1 className="stub-title">
            <Bi en="Game not found" ar="اللعبة مش موجودة" />
          </h1>
          <p className="stub-desc">
            <Bi
              en="This game doesn't exist or you don't have access to it."
              ar="اللعبة دي مش موجودة أو معندكش صلاحية تدخلها."
            />
          </p>
          <Link to="/chaser" className="stub-back">
            ← <Bi en="Back to your games" ar="رجوع لألعابك" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell chaser-theme">
      <div className="app-topbar">
        <Link to="/chaser" className="app-topbar__back">
          ← {game.name}
        </Link>
      </div>

      <header className="app-header">
        <ChaserTimerPanel
          side="contestant"
          seconds={times.contestant}
          score={state.scores.contestant}
          active={state.activeSide === "contestant"}
          isWinner={state.winner === "contestant"}
        />
        <div className="app-header__center">
          <h1 className="app-title chaser-title">
            <Bi en="Catch Him" ar="إلحقوه" />
          </h1>
          {state.phase === "over" && (
            <p className="chaser-winner-banner">
              {state.winner === "contestant" ? (
                <Bi
                  en={`Contestant wins ${state.scores.contestant} to ${state.scores.chaser}!`}
                  ar={`المتسابق كسب ${state.scores.contestant} مقابل ${state.scores.chaser}!`}
                />
              ) : (
                <Bi
                  en={`Chaser catches the contestant, ${state.scores.chaser} to ${state.scores.contestant}!`}
                  ar={`الملاحق لحق بالمتسابق، ${state.scores.chaser} مقابل ${state.scores.contestant}!`}
                />
              )}
            </p>
          )}
        </div>
        <ChaserTimerPanel
          side="chaser"
          seconds={times.chaser}
          score={state.scores.chaser}
          active={state.activeSide === "chaser"}
          isWinner={state.winner === "chaser"}
        />
      </header>

      <main className="app-main">
        {state.phase === "setup" ? (
          <div className="stub-card">
            <h1 className="stub-title">
              <Bi en="Ready to start" ar="جاهزين نبدأ" />
            </h1>
            <p className="stub-desc">
              <Bi
                en="Set the clocks below, then choose who answers first."
                ar="اضبط الساعات تحت، وبعدين اختار مين يجاوب الأول."
              />
            </p>
          </div>
        ) : (
          <div className="chaser-main-stack">
            <ChaserQuestionCard question={currentQuestion} flash={state.flash} showAnswer={showAnswer} />
            <ChaserStepBoard
              contestantScore={state.scores.contestant}
              chaserScore={state.scores.chaser}
              activeSide={state.activeSide}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <ChaserHostControls
          phase={state.phase}
          running={state.running}
          muted={state.muted}
          showAnswer={showAnswer}
          configuredTimes={state.configuredTimes}
          questionCount={questions.length}
          stealActive={state.stealActive}
          onSetTime={setTime}
          onStart={start}
          onCorrect={correct}
          onWrong={wrong}
          onStealResolve={stealResolve}
          onTogglePause={togglePause}
          onReset={() => {
            reset();
            setShowAnswer(false);
          }}
          onToggleMute={toggleMute}
          onToggleShowAnswer={() => setShowAnswer((v) => !v)}
          onManageQuestions={() => setQuestionManagerOpen(true)}
        />
      </footer>

      <ChaserQuestionManager
        open={questionManagerOpen}
        onClose={() => setQuestionManagerOpen(false)}
        questions={questions}
        onAddQuestion={(question) => void addQuestion({ gameId: gameId as Id<"chaserGames">, question })}
        onUpdateQuestion={(question) => void updateQuestion({ gameId: gameId as Id<"chaserGames">, question })}
        onRemoveQuestion={(questionId) =>
          void removeQuestion({ gameId: gameId as Id<"chaserGames">, questionId })
        }
        onImportQuestions={(imported) =>
          void importQuestions({ gameId: gameId as Id<"chaserGames">, questions: imported })
        }
      />
    </div>
  );
}
