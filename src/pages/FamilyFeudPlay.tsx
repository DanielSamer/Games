import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useGameState } from "../hooks/useGameState";
import { useLanguageMode } from "../context/LanguageMode";
import { Bi } from "../components/Bi";
import { Board } from "../components/Board";
import { Scoreboard } from "../components/Scoreboard";
import { Strikes } from "../components/Strikes";
import { Pot } from "../components/Pot";
import { HostControls } from "../components/HostControls";
import { EditableTitle } from "../components/EditableTitle";
import { RoundManager } from "../components/RoundManager";
import { setMuted } from "../audio/sounds";

export function FamilyFeudPlay() {
  const { mode: siteLangMode } = useLanguageMode();
  const { gameId } = useParams<{ gameId: string }>();
  const game = useQuery(api.games.get, gameId ? { gameId: gameId as Id<"games"> } : "skip");
  const addRound = useMutation(api.games.addRound);
  const updateRound = useMutation(api.games.updateRound);
  const removeRound = useMutation(api.games.removeRound);
  const logClientEvent = useMutation(api.analytics.logClientEvent);

  const rounds = game?.rounds ?? [];
  const {
    state,
    dispatch,
    roundIndex,
    round,
    answers,
    reveal,
    strike,
    award,
    nextRound,
    gotoRound,
  } = useGameState(rounds);

  const [roundManagerOpen, setRoundManagerOpen] = useState(false);

  useEffect(() => {
    setMuted(state.muted);
  }, [state.muted]);

  useEffect(() => {
    if (!game) return;
    void logClientEvent({
      eventType: "game_play_started",
      payload: { gameId: game._id, gameType: "family-feud" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?._id]);

  useEffect(() => {
    document.documentElement.dir = siteLangMode === "ar" ? "rtl" : "ltr";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, [siteLangMode]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (roundManagerOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }
      if (e.key >= "1" && e.key <= "8") {
        const rank = Number(e.key) - 1;
        const answer = answers[rank];
        if (answer && !state.revealed[answer.originalIndex]) {
          reveal(answer.originalIndex);
        }
      } else if (e.key.toLowerCase() === "x") {
        strike();
      } else if (e.key === "ArrowRight") {
        nextRound();
      } else if (e.key === "ArrowLeft") {
        dispatch({ type: "PREV_ROUND" });
      } else if (e.key.toLowerCase() === "a") {
        award("A");
      } else if (e.key.toLowerCase() === "b") {
        award("B");
      } else if (e.key.toLowerCase() === "r") {
        dispatch({ type: "RESET_ROUND" });
      } else if (e.key.toLowerCase() === "m") {
        dispatch({ type: "TOGGLE_MUTE" });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answers, state.revealed, reveal, strike, award, dispatch, nextRound, roundManagerOpen]);

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
      <div className="page-center">
        <p className="loading-text">
          <Bi en="Loading game…" ar="جاري تحميل اللعبة..." />
        </p>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="page-center">
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
          <Link to="/family-feud" className="stub-back">
            ← <Bi en="Back to your games" ar="رجوع لألعابك" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Strikes strikes={state.strikes} flash={state.strikeFlash} />

      <div className="app-topbar">
        <Link to="/family-feud" className="app-topbar__back">
          ← {game.name}
        </Link>
      </div>

      <header className="app-header">
        <Scoreboard
          teamId="A"
          name={state.teams.A.name}
          score={state.teams.A.score}
          side="left"
          onRename={(name) => dispatch({ type: "SET_TEAM_NAME", team: "A", name })}
          onAdjust={(delta) => dispatch({ type: "ADJUST_SCORE", team: "A", delta })}
        />
        <div className="app-header__center">
          <EditableTitle
            title={state.title}
            onChange={(title) => dispatch({ type: "SET_TITLE", title })}
          />
          <Pot pot={state.pot} />
        </div>
        <Scoreboard
          teamId="B"
          name={state.teams.B.name}
          score={state.teams.B.score}
          side="right"
          onRename={(name) => dispatch({ type: "SET_TEAM_NAME", team: "B", name })}
          onAdjust={(delta) => dispatch({ type: "ADJUST_SCORE", team: "B", delta })}
        />
      </header>

      <main className="app-main">
        {round ? (
          <Board
            round={round}
            answers={answers}
            revealed={state.revealed}
            primaryLang={state.primaryLang}
            onReveal={reveal}
          />
        ) : (
          <div className="stub-card">
            <h1 className="stub-title">
              <Bi en="No rounds yet" ar="لسه مفيش جولات" />
            </h1>
            <p className="stub-desc">
              <Bi
                en='Use "Create / Manage Rounds" below to add your first question.'
                ar="استخدم زرار «إنشاء / إدارة الجولات» تحت لإضافة أول سؤال."
              />
            </p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <HostControls
          rounds={rounds}
          roundIndex={roundIndex}
          teamNames={{ A: state.teams.A.name, B: state.teams.B.name }}
          strikes={state.strikes}
          muted={state.muted}
          onStrike={strike}
          onAward={award}
          onNext={nextRound}
          onPrev={() => dispatch({ type: "PREV_ROUND" })}
          onGoto={gotoRound}
          onResetRound={() => dispatch({ type: "RESET_ROUND" })}
          onResetGame={() => dispatch({ type: "RESET_GAME" })}
          onToggleMute={() => dispatch({ type: "TOGGLE_MUTE" })}
          onManageRounds={() => setRoundManagerOpen(true)}
        />
      </footer>

      <RoundManager
        open={roundManagerOpen}
        onClose={() => setRoundManagerOpen(false)}
        rounds={rounds}
        onAddRound={(round) => void addRound({ gameId: gameId as Id<"games">, round })}
        onUpdateRound={(round) => void updateRound({ gameId: gameId as Id<"games">, round })}
        onRemoveRound={(roundId) => void removeRound({ gameId: gameId as Id<"games">, roundId })}
      />
    </div>
  );
}
