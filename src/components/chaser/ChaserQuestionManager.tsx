import { useState } from "react";
import type { ChaserQuestion } from "../../types/chaser";
import { Bi } from "../Bi";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: ChaserQuestion[];
  onAddQuestion: (question: ChaserQuestion) => void;
  onUpdateQuestion: (question: ChaserQuestion) => void;
  onRemoveQuestion: (id: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ChaserQuestionManager({
  open,
  onClose,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionEn, setQuestionEn] = useState("");
  const [questionAr, setQuestionAr] = useState("");
  const [answerEn, setAnswerEn] = useState("");
  const [answerAr, setAnswerAr] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setEditingId(null);
    setQuestionEn("");
    setQuestionAr("");
    setAnswerEn("");
    setAnswerAr("");
    setError(null);
  };

  const startEditing = (q: ChaserQuestion) => {
    setEditingId(q.id);
    setQuestionEn(q.question.en ?? "");
    setQuestionAr(q.question.ar ?? "");
    setAnswerEn(q.answer.en ?? "");
    setAnswerAr(q.answer.ar ?? "");
    setError(null);
  };

  const handleSave = () => {
    setError(null);

    if (!questionEn.trim() && !questionAr.trim()) {
      setError("Enter a question in English or Arabic.");
      return;
    }
    if (!answerEn.trim() && !answerAr.trim()) {
      setError("Enter an answer in English or Arabic.");
      return;
    }

    const question: ChaserQuestion["question"] = {};
    if (questionEn.trim()) question.en = questionEn.trim();
    if (questionAr.trim()) question.ar = questionAr.trim();

    const answer: ChaserQuestion["answer"] = {};
    if (answerEn.trim()) answer.en = answerEn.trim();
    if (answerAr.trim()) answer.ar = answerAr.trim();

    if (editingId) {
      onUpdateQuestion({ id: editingId, question, answer });
    } else {
      const baseSlug = slugify(questionEn || questionAr) || "question";
      const id = `${baseSlug}-${Date.now().toString(36)}`;
      onAddQuestion({ id, question, answer });
    }
    resetForm();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal__header">
          <h2>
            <Bi en="Manage Questions" ar="إدارة الأسئلة" />
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal__body">
          <section className="modal__section">
            <h3>
              {editingId ? (
                <Bi en="Edit question" ar="تعديل السؤال" />
              ) : (
                <Bi en="Create a new question" ar="أضف سؤال جديد" />
              )}
            </h3>

            <div className="round-form__row">
              <label className="round-form__field">
                <span>Question (English)</span>
                <input
                  type="text"
                  value={questionEn}
                  onChange={(e) => setQuestionEn(e.target.value)}
                  placeholder="e.g. What is the capital of France?"
                />
              </label>
              <label className="round-form__field">
                <span>Question (Arabic)</span>
                <input
                  type="text"
                  dir="rtl"
                  value={questionAr}
                  onChange={(e) => setQuestionAr(e.target.value)}
                  placeholder="مثال: ما هي عاصمة فرنسا؟"
                />
              </label>
            </div>

            <div className="round-form__row">
              <label className="round-form__field">
                <span>Answer (English)</span>
                <input
                  type="text"
                  value={answerEn}
                  onChange={(e) => setAnswerEn(e.target.value)}
                  placeholder="e.g. Paris"
                />
              </label>
              <label className="round-form__field">
                <span>Answer (Arabic)</span>
                <input
                  type="text"
                  dir="rtl"
                  value={answerAr}
                  onChange={(e) => setAnswerAr(e.target.value)}
                  placeholder="مثال: باريس"
                />
              </label>
            </div>

            <div className="round-form__actions">
              <button type="button" className="round-form__save" onClick={handleSave}>
                {editingId ? <Bi en="Update Question" ar="تحديث السؤال" /> : <Bi en="Save Question" ar="حفظ السؤال" />}
              </button>
              {editingId && (
                <button type="button" className="round-form__cancel" onClick={resetForm}>
                  <Bi en="Cancel" ar="إلغاء" />
                </button>
              )}
            </div>

            {error && <p className="round-form__error">{error}</p>}
          </section>

          <section className="modal__section">
            <h3>
              <Bi en="Questions in this game" ar="أسئلة اللعبة" /> ({questions.length})
            </h3>
            {questions.length === 0 ? (
              <p className="modal__empty">
                <Bi en="No questions yet — create one above." ar="لسه مفيش أسئلة — أضف واحد فوق." />
              </p>
            ) : (
              <ul className="round-list">
                {questions.map((q) => (
                  <li key={q.id} className="round-list__item">
                    <span>{q.question.en ?? q.question.ar}</span>
                    <span className="round-list__item-actions">
                      <button type="button" onClick={() => startEditing(q)}>
                        <Bi en="Edit" ar="تعديل" />
                      </button>
                      <button type="button" onClick={() => onRemoveQuestion(q.id)}>
                        <Bi en="Delete" ar="حذف" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
