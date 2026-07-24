import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import chaserQuestionsData from "../data/chaserQuestions.json";
import type { ChaserQuestion } from "../types/chaser";
import { useLanguageMode } from "../context/LanguageMode";
import { Bi } from "../components/Bi";
import { CategoryFilterBar } from "../components/lobby/CategoryFilterBar";
import { ChaserQuestionManager } from "../components/chaser/ChaserQuestionManager";

const seedQuestions = chaserQuestionsData as ChaserQuestion[];
const ACCENT = "#e0333f";

export function ChaserLobby() {
  const { mode } = useLanguageMode();
  const games = useQuery(api.chaser.listMine);
  const createGame = useMutation(api.chaser.create);
  const removeGame = useMutation(api.chaser.remove);
  const renameGame = useMutation(api.chaser.rename);
  const addQuestion = useMutation(api.chaser.addQuestion);
  const updateQuestion = useMutation(api.chaser.updateQuestion);
  const removeQuestion = useMutation(api.chaser.removeQuestion);
  const importQuestions = useMutation(api.chaser.importQuestions);
  const ensureSeeded = useMutation(api.chaser.ensureSeeded);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const seeded = useRef(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingQuestionsId, setEditingQuestionsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }

  const startEditingName = (gameId: string, currentName: string) => {
    setEditingNameId(gameId);
    setEditingName(currentName);
  };

  const commitEditingName = async (gameId: string, currentName: string) => {
    const trimmed = editingName.trim();
    setEditingNameId(null);
    if (trimmed.length > 0 && trimmed !== currentName) {
      try {
        await renameGame({ gameId: gameId as Id<"chaserGames">, name: trimmed });
      } catch (err) {
        setError(errorMessage(err));
      }
    }
  };

  const editingGame = games?.find((g) => g._id === editingQuestionsId) ?? null;

  const categories = useMemo(
    () => Array.from(new Set((games ?? []).map((g) => g.category).filter((c): c is string => !!c))).sort(),
    [games],
  );
  const visibleGames = useMemo(
    () => (categoryFilter ? (games ?? []).filter((g) => g.category === categoryFilter) : games ?? []),
    [games, categoryFilter],
  );

  useEffect(() => {
    if (games && games.length === 0 && !seeded.current) {
      seeded.current = true;
      void ensureSeeded({ name: "Catch Him — Sample Game", questions: seedQuestions });
    }
  }, [games, ensureSeeded]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createGame({ name, category: newCategory.trim() || undefined, questions: [] });
      setNewName("");
      setNewCategory("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRemove = async (gameId: Id<"chaserGames">) => {
    try {
      await removeGame({ gameId });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="game-lobby game-lobby--chaser">
      <div className="game-lobby__panel" style={{ "--accent": ACCENT } as CSSProperties}>
        <Link to="/" className="game-lobby__back">
          ← <Bi en="Back to menu" ar="رجوع للقائمة" />
        </Link>
        <h1 className="game-lobby__title">
          <Bi en="Catch Him" ar="إلحقوه" />
        </h1>
        <p className="game-lobby__desc">
          <Bi
            en="A contestant races the Chaser to bank as much of the prize fund as possible."
            ar="متسابق بيتسابق مع الملاحق عشان يجمع أكبر قدر من الجائزة."
          />
        </p>

        <CategoryFilterBar categories={categories} selected={categoryFilter} onSelect={setCategoryFilter} />

        <div className="game-lobby__create">
          <input
            type="text"
            placeholder={mode === "en" ? "New game name" : "اسم اللعبة الجديدة"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <input
            type="text"
            name="category"
            placeholder={mode === "en" ? "Category (optional)" : "الفئة (اختياري)"}
            list="chaser-categories"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <datalist id="chaser-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="button" onClick={() => void handleCreate()} disabled={!newName.trim()}>
            + <Bi en="Create" ar="إنشاء" />
          </button>
        </div>

        {games === undefined ? (
          <p className="game-lobby__empty">
            <Bi en="Loading your games…" ar="بيتم تحميل ألعابك..." />
          </p>
        ) : visibleGames.length === 0 ? (
          <p className="game-lobby__empty">
            <Bi en="No saved games here yet." ar="لسه مفيش ألعاب محفوظة هنا." />
          </p>
        ) : (
          <ul className="pack-list">
            {visibleGames.map((game) => (
              <li key={game._id} className="pack-card">
                <div className="pack-card__main">
                  {editingNameId === game._id ? (
                    <input
                      type="text"
                      className="pack-card__name-input"
                      value={editingName}
                      autoFocus
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => void commitEditingName(game._id, game.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitEditingName(game._id, game.name);
                        if (e.key === "Escape") setEditingNameId(null);
                      }}
                    />
                  ) : (
                    <span
                      className="pack-card__name"
                      title={mode === "en" ? "Click to rename" : "اضغط للتعديل"}
                      onClick={() => startEditingName(game._id, game.name)}
                    >
                      {game.name}
                    </span>
                  )}
                  <div className="pack-card__meta">
                    {game.category && <span className="pack-card__category">{game.category}</span>}
                    <span className="pack-card__count">
                      {game.questions.length} {mode === "en" ? "question(s)" : "سؤال"}
                    </span>
                  </div>
                </div>
                <div className="pack-card__actions">
                  <Link to={`/chaser/${game._id}`} className="pack-btn pack-btn--primary">
                    <Bi en="Play" ar="لعب" />
                  </Link>
                  <button
                    type="button"
                    className="pack-btn pack-btn--ghost"
                    onClick={() => setEditingQuestionsId(game._id)}
                  >
                    <Bi en="Edit" ar="تعديل" />
                  </button>
                  <button
                    type="button"
                    className="pack-btn pack-btn--danger"
                    onClick={() => void handleRemove(game._id)}
                  >
                    <Bi en="Delete" ar="حذف" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="game-lobby__error">{error}</p>}
      </div>

      <ChaserQuestionManager
        open={editingGame !== null}
        onClose={() => setEditingQuestionsId(null)}
        questions={editingGame?.questions ?? []}
        onAddQuestion={(question) =>
          void addQuestion({ gameId: editingGame!._id, question }).catch((err) => setError(errorMessage(err)))
        }
        onUpdateQuestion={(question) =>
          void updateQuestion({ gameId: editingGame!._id, question }).catch((err) => setError(errorMessage(err)))
        }
        onRemoveQuestion={(questionId) =>
          void removeQuestion({ gameId: editingGame!._id, questionId }).catch((err) => setError(errorMessage(err)))
        }
        onImportQuestions={(imported) =>
          void importQuestions({ gameId: editingGame!._id, questions: imported }).catch((err) =>
            setError(errorMessage(err)),
          )
        }
      />
    </div>
  );
}
