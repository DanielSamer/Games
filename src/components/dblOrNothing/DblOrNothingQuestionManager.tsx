import { useState } from "react";
import type { DblOrNothingQuestion, Difficulty } from "../../types/dblOrNothing";
import { Bi } from "../Bi";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: DblOrNothingQuestion[];
  onAddQuestion: (question: DblOrNothingQuestion) => void;
  onUpdateQuestion: (question: DblOrNothingQuestion) => void;
  onRemoveQuestion: (id: string) => void;
}

const EMPTY_OPTIONS = ["", "", "", ""];

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "question"
  );
}

export function DblOrNothingQuestionManager({
  open,
  onClose,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryEn, setCategoryEn] = useState("");
  const [categoryAr, setCategoryAr] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [questionEn, setQuestionEn] = useState("");
  const [questionAr, setQuestionAr] = useState("");
  const [optionsEn, setOptionsEn] = useState<string[]>(EMPTY_OPTIONS);
  const [optionsAr, setOptionsAr] = useState<string[]>(EMPTY_OPTIONS);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setEditingId(null);
    setCategoryEn("");
    setCategoryAr("");
    setDifficulty("easy");
    setQuestionEn("");
    setQuestionAr("");
    setOptionsEn(EMPTY_OPTIONS);
    setOptionsAr(EMPTY_OPTIONS);
    setCorrectIndex(0);
    setError(null);
  };

  const startEditing = (q: DblOrNothingQuestion) => {
    setEditingId(q.id);
    setCategoryEn(q.category.en ?? "");
    setCategoryAr(q.category.ar ?? "");
    setDifficulty(q.difficulty);
    setQuestionEn(q.question.en ?? "");
    setQuestionAr(q.question.ar ?? "");
    setOptionsEn(q.options.map((o) => o.en ?? ""));
    setOptionsAr(q.options.map((o) => o.ar ?? ""));
    setCorrectIndex(q.correctIndex);
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    if (!categoryEn.trim() && !categoryAr.trim()) {
      setError("Enter a category in English or Arabic.");
      return;
    }
    if (!questionEn.trim() && !questionAr.trim()) {
      setError("Enter a question in English or Arabic.");
      return;
    }
    const filledOptions = optionsEn.map((_, i) => optionsEn[i].trim() || optionsAr[i].trim());
    if (filledOptions.filter(Boolean).length < 2) {
      setError("Enter at least 2 options.");
      return;
    }
    if (!optionsEn[correctIndex].trim() && !optionsAr[correctIndex].trim()) {
      setError("The correct option can't be empty.");
      return;
    }

    const options = optionsEn.map((_, i) => {
      const opt: DblOrNothingQuestion["options"][number] = {};
      if (optionsEn[i].trim()) opt.en = optionsEn[i].trim();
      if (optionsAr[i].trim()) opt.ar = optionsAr[i].trim();
      return opt;
    });

    const category: DblOrNothingQuestion["category"] = {};
    if (categoryEn.trim()) category.en = categoryEn.trim();
    if (categoryAr.trim()) category.ar = categoryAr.trim();
    const question: DblOrNothingQuestion["question"] = {};
    if (questionEn.trim()) question.en = questionEn.trim();
    if (questionAr.trim()) question.ar = questionAr.trim();

    if (editingId) {
      onUpdateQuestion({ id: editingId, category, difficulty, question, options, correctIndex });
    } else {
      const id = `don-${slugify(questionEn || questionAr)}-${Date.now().toString(36)}`;
      onAddQuestion({ id, category, difficulty, question, options, correctIndex });
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
              {editingId ? <Bi en="Edit question" ar="تعديل السؤال" /> : <Bi en="Create a new question" ar="أضف سؤال جديد" />}
            </h3>

            <div className="round-form__row">
              <label className="round-form__field">
                <span>Category (English)</span>
                <input type="text" value={categoryEn} onChange={(e) => setCategoryEn(e.target.value)} placeholder="e.g. Geography" />
              </label>
              <label className="round-form__field">
                <span>Category (Arabic)</span>
                <input type="text" dir="rtl" value={categoryAr} onChange={(e) => setCategoryAr(e.target.value)} placeholder="مثال: جغرافيا" />
              </label>
            </div>

            <label className="round-form__field">
              <span>Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <div className="round-form__row">
              <label className="round-form__field">
                <span>Question (English)</span>
                <input type="text" value={questionEn} onChange={(e) => setQuestionEn(e.target.value)} placeholder="e.g. What is the capital of Egypt?" />
              </label>
              <label className="round-form__field">
                <span>Question (Arabic)</span>
                <input type="text" dir="rtl" value={questionAr} onChange={(e) => setQuestionAr(e.target.value)} placeholder="مثال: ما هي عاصمة مصر؟" />
              </label>
            </div>

            {[0, 1, 2, 3].map((i) => (
              <div className="round-form__row" key={i}>
                <label className="round-form__field">
                  <span>
                    <input
                      type="radio"
                      name="correctIndex"
                      checked={correctIndex === i}
                      onChange={() => setCorrectIndex(i)}
                    />{" "}
                    Option {i + 1} (English) {correctIndex === i ? "✓ correct" : ""}
                  </span>
                  <input
                    type="text"
                    value={optionsEn[i]}
                    onChange={(e) => setOptionsEn((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  />
                </label>
                <label className="round-form__field">
                  <span>Option {i + 1} (Arabic)</span>
                  <input
                    type="text"
                    dir="rtl"
                    value={optionsAr[i]}
                    onChange={(e) => setOptionsAr((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  />
                </label>
              </div>
            ))}

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
              <Bi en="Questions in this pack" ar="أسئلة الحزمة" /> ({questions.length})
            </h3>
            {questions.length === 0 ? (
              <p className="modal__empty">
                <Bi en="No questions yet — create one above." ar="لسه مفيش أسئلة — أضف واحد فوق." />
              </p>
            ) : (
              <ul className="round-list">
                {questions.map((q) => (
                  <li key={q.id} className="round-list__item">
                    <span>
                      [{q.difficulty}] {q.category.en ?? q.category.ar} — {q.question.en ?? q.question.ar}
                    </span>
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
