import { useState } from "react";
import { X } from "lucide-react";
import type { Round, RoundAnswer } from "../types/game";

interface AnswerDraft {
  key: number;
  en: string;
  ar: string;
  count: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rounds: Round[];
  onAddRound: (round: Round) => void;
  onUpdateRound: (round: Round) => void;
  onRemoveRound: (id: string) => void;
}

let draftKeySeq = 0;
function newDraftAnswer(en = "", ar = "", count = ""): AnswerDraft {
  draftKeySeq += 1;
  return { key: draftKeySeq, en, ar, count };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function RoundManager({ open, onClose, rounds, onAddRound, onUpdateRound, onRemoveRound }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionEn, setQuestionEn] = useState("");
  const [questionAr, setQuestionAr] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<AnswerDraft[]>([newDraftAnswer(), newDraftAnswer()]);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const updateAnswer = (key: number, field: "en" | "ar" | "count", value: string) => {
    setAnswerDrafts((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));
  };

  const addAnswerRow = () => {
    setAnswerDrafts((prev) => [...prev, newDraftAnswer()]);
  };

  const removeAnswerRow = (key: number) => {
    setAnswerDrafts((prev) => (prev.length > 2 ? prev.filter((a) => a.key !== key) : prev));
  };

  const resetForm = () => {
    setEditingId(null);
    setQuestionEn("");
    setQuestionAr("");
    setAnswerDrafts([newDraftAnswer(), newDraftAnswer()]);
    setError(null);
  };

  const startEditing = (r: Round) => {
    setEditingId(r.id);
    setQuestionEn(r.question.en ?? "");
    setQuestionAr(r.question.ar ?? "");
    setAnswerDrafts(
      r.answers.length > 0
        ? r.answers.map((a) => newDraftAnswer(a.text.en ?? "", a.text.ar ?? "", String(a.count)))
        : [newDraftAnswer(), newDraftAnswer()],
    );
    setError(null);
  };

  const handleSave = () => {
    setError(null);

    if (!questionEn.trim() && !questionAr.trim()) {
      setError("Enter a question in English or Arabic.");
      return;
    }

    const answers: RoundAnswer[] = [];
    for (const draft of answerDrafts) {
      const en = draft.en.trim();
      const ar = draft.ar.trim();
      if (!en && !ar) continue;
      const count = Number(draft.count);
      if (!Number.isFinite(count) || count < 0) {
        setError(`Enter a valid count for "${en || ar}".`);
        return;
      }
      const text: RoundAnswer["text"] = {};
      if (en) text.en = en;
      if (ar) text.ar = ar;
      answers.push({ text, count });
    }

    if (answers.length < 2) {
      setError("Add at least 2 answers with a count.");
      return;
    }

    const question: Round["question"] = {};
    if (questionEn.trim()) question.en = questionEn.trim();
    if (questionAr.trim()) question.ar = questionAr.trim();

    if (editingId) {
      onUpdateRound({ id: editingId, question, answers });
    } else {
      const baseSlug = slugify(questionEn || questionAr) || "round";
      const id = `${baseSlug}-${Date.now().toString(36)}`;
      onAddRound({ id, question, answers });
    }
    resetForm();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal__header">
          <h2>Manage Rounds</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal__body">
          <section className="modal__section">
            <h3>{editingId ? "Edit round" : "Create a new round"}</h3>

            <div className="round-form__row">
              <label className="round-form__field">
                <span>Question (English)</span>
                <input
                  type="text"
                  value={questionEn}
                  onChange={(e) => setQuestionEn(e.target.value)}
                  placeholder="e.g. Favorite worship song"
                />
              </label>
              <label className="round-form__field">
                <span>Question (Arabic)</span>
                <input
                  type="text"
                  dir="rtl"
                  value={questionAr}
                  onChange={(e) => setQuestionAr(e.target.value)}
                  placeholder="مثال: أكتر ترنيمة بتحبها"
                />
              </label>
            </div>

            <h4>Answers</h4>
            <div className="round-form__answers">
              {answerDrafts.map((draft, i) => (
                <div className="round-form__answer-row" key={draft.key}>
                  <span className="round-form__rank">{i + 1}</span>
                  <input
                    type="text"
                    placeholder="Answer (English)"
                    value={draft.en}
                    onChange={(e) => updateAnswer(draft.key, "en", e.target.value)}
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="الإجابة (عربي)"
                    value={draft.ar}
                    onChange={(e) => updateAnswer(draft.key, "ar", e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Count"
                    className="round-form__count"
                    value={draft.count}
                    onChange={(e) => updateAnswer(draft.key, "count", e.target.value)}
                  />
                  <button
                    type="button"
                    className="round-form__remove"
                    onClick={() => removeAnswerRow(draft.key)}
                    disabled={answerDrafts.length <= 2}
                    aria-label="Remove answer"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="round-form__actions">
              <button type="button" onClick={addAnswerRow}>
                + Add Answer
              </button>
              <button type="button" className="round-form__save" onClick={handleSave}>
                {editingId ? "Update Round" : "Save Round"}
              </button>
              {editingId && (
                <button type="button" className="round-form__cancel" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>

            {error && <p className="round-form__error">{error}</p>}
          </section>

          <section className="modal__section">
            <h3>Rounds in this game ({rounds.length})</h3>
            {rounds.length === 0 ? (
              <p className="modal__empty">No rounds yet — create one above.</p>
            ) : (
              <ul className="round-list">
                {rounds.map((r) => (
                  <li key={r.id} className="round-list__item">
                    <span>{r.question.en ?? r.question.ar}</span>
                    <span className="round-list__item-actions">
                      <button type="button" onClick={() => startEditing(r)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => onRemoveRound(r.id)}>
                        Delete
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
