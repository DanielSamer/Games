import { useState } from "react";
import type { TeamId } from "../types/game";

interface Props {
  teamId: TeamId;
  name: string;
  score: number;
  side: "left" | "right";
  onRename: (name: string) => void;
  onAdjust: (delta: number) => void;
}

export function Scoreboard({ name, score, side, onRename, onAdjust }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const trimmed = draft.trim();
    onRename(trimmed.length > 0 ? trimmed : name);
    setEditing(false);
  };

  return (
    <div className={`scoreboard scoreboard--${side}`}>
      {editing ? (
        <input
          className="scoreboard__name-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="scoreboard__name"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          title="Click to rename"
        >
          {name}
        </button>
      )}
      <div className="scoreboard__score">{score}</div>
      <div className="scoreboard__adjust">
        <button type="button" onClick={() => onAdjust(-1)} aria-label="Decrease score">
          −
        </button>
        <button type="button" onClick={() => onAdjust(1)} aria-label="Increase score">
          +
        </button>
      </div>
    </div>
  );
}
