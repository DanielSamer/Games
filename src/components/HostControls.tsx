import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import type { Round, TeamId } from "../types/game";

interface Props {
  rounds: Round[];
  roundIndex: number;
  teamNames: Record<TeamId, string>;
  strikes: number;
  muted: boolean;
  onStrike: () => void;
  onAward: (team: TeamId) => void;
  onNext: () => void;
  onPrev: () => void;
  onGoto: (index: number) => void;
  onResetRound: () => void;
  onResetGame: () => void;
  onToggleMute: () => void;
  onManageRounds: () => void;
}

export function HostControls({
  rounds,
  roundIndex,
  teamNames,
  strikes,
  muted,
  onStrike,
  onAward,
  onNext,
  onPrev,
  onGoto,
  onResetRound,
  onResetGame,
  onToggleMute,
  onManageRounds,
}: Props) {
  return (
    <div className="host-controls">
      <div className="host-controls__row">
        <label className="host-controls__field">
          <span>Round</span>
          <select
            value={roundIndex}
            onChange={(e) => onGoto(Number(e.target.value))}
          >
            {rounds.map((r, i) => (
              <option key={r.id} value={i}>
                {i + 1}. {r.question.en ?? r.question.ar}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onPrev} disabled={roundIndex === 0}>
          <ChevronLeft size={16} aria-hidden="true" /> Prev
        </button>
        <button type="button" onClick={onNext} disabled={roundIndex === rounds.length - 1}>
          Next <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={onResetRound}>
          Reset Round
        </button>
        <button type="button" onClick={onResetGame} className="host-controls__danger">
          Reset Game
        </button>
        <button type="button" onClick={onManageRounds} className="host-controls__create">
          + Create / Manage Rounds
        </button>
      </div>

      <div className="host-controls__row">
        <button type="button" className="host-controls__strike" onClick={onStrike} disabled={strikes >= 3}>
          <X size={16} aria-hidden="true" /> Wrong / Strike
        </button>
        <button type="button" className="host-controls__award host-controls__award--a" onClick={() => onAward("A")}>
          Give to {teamNames.A}
        </button>
        <button type="button" className="host-controls__award host-controls__award--b" onClick={() => onAward("B")}>
          Give to {teamNames.B}
        </button>
      </div>

      <div className="host-controls__row">
        <button type="button" onClick={onToggleMute}>
          {muted ? (
            <>
              <VolumeX size={16} aria-hidden="true" /> Muted
            </>
          ) : (
            <>
              <Volume2 size={16} aria-hidden="true" /> Sound On
            </>
          )}
        </button>
      </div>
    </div>
  );
}
