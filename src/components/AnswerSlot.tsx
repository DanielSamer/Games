import type { RoundAnswer, Lang } from "../types/game";
import { LocalizedText } from "./LocalizedText";

interface Props {
  answer: RoundAnswer;
  rank: number;
  revealed: boolean;
  primaryLang: Lang;
  onReveal: () => void;
}

export function AnswerSlot({ answer, rank, revealed, primaryLang, onReveal }: Props) {
  return (
    <button
      type="button"
      onClick={onReveal}
      disabled={revealed}
      className={`feud-slot ${revealed ? "feud-slot--revealed" : "feud-slot--hidden"}`}
      aria-label={revealed ? undefined : `Reveal answer ${rank}`}
    >
      {revealed ? (
        <div className="feud-slot__inner">
          <span className="feud-slot__text">
            <LocalizedText text={answer.text} primaryLang={primaryLang} />
          </span>
          <span className="feud-slot__badge">{answer.count}</span>
        </div>
      ) : (
        <span className="feud-slot__rank">{rank}</span>
      )}
    </button>
  );
}
