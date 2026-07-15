import type { ChaserSide } from "../../types/chaser";
import { Bi } from "../Bi";

interface Props {
  side: ChaserSide;
  seconds: number;
  score: number;
  active: boolean;
  isWinner: boolean;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChaserTimerPanel({ side, seconds, score, active, isWinner }: Props) {
  const low = seconds <= 10 && seconds > 0;
  const label =
    side === "contestant" ? <Bi en="Contestant" ar="المتسابق" /> : <Bi en="The Chaser" ar="الملاحق" />;

  return (
    <div
      className={[
        "chaser-panel",
        `chaser-panel--${side}`,
        active ? "chaser-panel--active" : "",
        low ? "chaser-panel--low" : "",
        isWinner ? "chaser-panel--winner" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="chaser-panel__label">{label}</div>
      <div className="chaser-panel__clock">{formatTime(seconds)}</div>
      <div className="chaser-panel__score">
        <Bi en="Correct" ar="صحيح" />: {score}
      </div>
    </div>
  );
}
