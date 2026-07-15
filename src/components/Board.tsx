import type { Round, Lang, RevealedState } from "../types/game";
import { AnswerSlot } from "./AnswerSlot";
import { LocalizedText } from "./LocalizedText";

interface SortedAnswer {
  text: Round["answers"][number]["text"];
  count: number;
  originalIndex: number;
}

interface Props {
  round: Round;
  answers: SortedAnswer[];
  revealed: RevealedState;
  primaryLang: Lang;
  onReveal: (index: number) => void;
}

export function Board({ round, answers, revealed, primaryLang, onReveal }: Props) {
  const twoColumn = answers.length >= 5;

  return (
    <div className="feud-board">
      <div className="feud-question">
        <LocalizedText text={round.question} primaryLang={primaryLang} stacked />
      </div>
      <div className={twoColumn ? "feud-board__grid feud-board__grid--two" : "feud-board__grid"}>
        {answers.map((answer, i) => (
          <AnswerSlot
            key={answer.originalIndex}
            answer={answer}
            rank={i + 1}
            revealed={!!revealed[answer.originalIndex]}
            primaryLang={primaryLang}
            onReveal={() => onReveal(answer.originalIndex)}
          />
        ))}
      </div>
    </div>
  );
}
