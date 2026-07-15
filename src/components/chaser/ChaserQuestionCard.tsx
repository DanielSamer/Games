import type { ChaserQuestion } from "../../types/chaser";
import { useLanguageMode } from "../../context/LanguageMode";
import { Bi } from "../Bi";

interface Props {
  question: ChaserQuestion | null;
  flash: "correct" | "wrong" | null;
  showAnswer: boolean;
}

export function ChaserQuestionCard({ question, flash, showAnswer }: Props) {
  const { mode } = useLanguageMode();

  if (!question) {
    return (
      <div className="chaser-question-card">
        <p className="chaser-question-card__text">
          <Bi en="No questions loaded yet." ar="لسه مفيش أسئلة." />
        </p>
      </div>
    );
  }

  const questionText =
    mode === "en" ? question.question.en ?? question.question.ar : question.question.ar ?? question.question.en;
  const answerText =
    mode === "en" ? question.answer.en ?? question.answer.ar : question.answer.ar ?? question.answer.en;

  return (
    <div
      className={[
        "chaser-question-card",
        flash === "correct" ? "chaser-question-card--correct" : "",
        flash === "wrong" ? "chaser-question-card--wrong" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="chaser-question-card__text">{questionText}</p>
      {showAnswer && answerText && (
        <p className="chaser-question-card__answer">
          <Bi en="Answer" ar="الإجابة" />: {answerText}
        </p>
      )}
    </div>
  );
}
