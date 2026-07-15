import type { ChaserSide } from "../../types/chaser";

interface Props {
  contestantScore: number;
  chaserScore: number;
  activeSide: ChaserSide | null;
}

export function ChaserStepBoard({ contestantScore, chaserScore, activeSide }: Props) {
  const leader = Math.max(contestantScore, chaserScore);

  return (
    <div className="chaser-stepboard">
      <div className="chaser-stepboard__track">
        {Array.from({ length: leader }, (_, i) => {
          const litByChaser = i < chaserScore;
          const litByContestant = i < contestantScore;
          const isLatest = i === leader - 1;
          return (
            <div
              key={i}
              className={[
                "chaser-stepboard__cell",
                litByContestant ? "chaser-stepboard__cell--contestant" : "",
                // chaser colour is drawn last so it overlaps the contestant's steps
                litByChaser ? "chaser-stepboard__cell--chaser" : "",
                isLatest ? "chaser-stepboard__cell--latest" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isLatest && activeSide ? leader : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
