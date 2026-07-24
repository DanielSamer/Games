import { useEffect, useState } from "react";

interface StandingRow {
  playerId: string;
  nickname: string;
  stack: number;
  eliminated: boolean;
  rank: number;
}

interface Props {
  standings: StandingRow[];
  // Rank each player held going into this round (by pre-round stack). When
  // given, the wall renders bars in their OLD order first, then animates
  // to the new order a beat later via the existing `top` transition —
  // the overtake itself is the exciting part, not just the end state.
  previousRanks?: Record<string, number>;
  // Changing this (e.g. the round index) replays the before→after animation.
  revealKey?: number;
}

const ROW_HEIGHT = 44;
const ROW_GAP = 8;
const SETTLE_DELAY_MS = 550;

// "The wall" — a ranked bar chart that animates as stacks change and
// players re-sort. Positions are absolute so reordering animates via a
// `top` transition instead of relying on the DOM to animate reflow, which
// browsers don't do natively.
export function StandingsWall({ standings, previousRanks, revealKey }: Props) {
  const maxStack = Math.max(1, ...standings.map((s) => s.stack));
  const [settled, setSettled] = useState(!previousRanks);

  useEffect(() => {
    if (!previousRanks) {
      setSettled(true);
      return;
    }
    setSettled(false);
    const id = setTimeout(() => setSettled(true), SETTLE_DELAY_MS);
    return () => clearTimeout(id);
  }, [revealKey, previousRanks]);

  return (
    <div className="don-wall" style={{ height: standings.length * (ROW_HEIGHT + ROW_GAP) }}>
      {standings.map((row) => {
        const beforeRank = previousRanks?.[row.playerId];
        const displayRank = !settled && beforeRank !== undefined ? beforeRank : row.rank;
        const delta = beforeRank !== undefined ? beforeRank - row.rank : 0;
        return (
          <div
            key={row.playerId}
            className={`don-wall__row${row.eliminated ? " don-wall__row--eliminated" : ""}`}
            style={{ top: (displayRank - 1) * (ROW_HEIGHT + ROW_GAP), height: ROW_HEIGHT }}
          >
            <span className="don-wall__rank">#{row.rank}</span>
            <div className="don-wall__bar-track">
              <div
                className="don-wall__bar"
                style={{ width: `${Math.max(4, (row.stack / maxStack) * 100)}%` }}
              />
            </div>
            <span className="don-wall__name">{row.nickname}</span>
            {settled && delta !== 0 && (
              <span className={`don-wall__delta ${delta > 0 ? "don-wall__delta--up" : "don-wall__delta--down"}`}>
                {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
              </span>
            )}
            <span className="don-wall__stack">{row.stack}</span>
          </div>
        );
      })}
    </div>
  );
}
