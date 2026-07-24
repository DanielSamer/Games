import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import seedQuestionsData from "../data/dblOrNothingQuestions.json";
import generalKnowledgeQuestionsData from "../data/generalKnowledgeQuestions.json";
import type { DblOrNothingQuestion } from "../types/dblOrNothing";
import { useLanguageMode } from "../context/LanguageMode";
import { Bi } from "../components/Bi";
import { CategoryFilterBar } from "../components/lobby/CategoryFilterBar";
import { DblOrNothingQuestionManager } from "../components/dblOrNothing/DblOrNothingQuestionManager";

const seedQuestions = seedQuestionsData as DblOrNothingQuestion[];
const generalKnowledgeQuestions = generalKnowledgeQuestionsData as DblOrNothingQuestion[];
const GENERAL_KNOWLEDGE_CATEGORY = "General Knowledge";
const ACCENT = "#2f9e6b";

export function DblOrNothingLobby() {
  const { mode } = useLanguageMode();
  const navigate = useNavigate();
  const packs = useQuery(api.dblOrNothing.listMine);
  const createPack = useMutation(api.dblOrNothing.create);
  const removePack = useMutation(api.dblOrNothing.remove);
  const renamePack = useMutation(api.dblOrNothing.rename);
  const addQuestion = useMutation(api.dblOrNothing.addQuestion);
  const updateQuestion = useMutation(api.dblOrNothing.updateQuestion);
  const removeQuestion = useMutation(api.dblOrNothing.removeQuestion);
  const ensureSeeded = useMutation(api.dblOrNothing.ensureSeeded);
  const createRoom = useMutation(api.rooms.create);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const seeded = useRef(false);
  const seededGeneralKnowledge = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingQuestionsId, setEditingQuestionsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }

  const editingPack = packs?.find((p) => p._id === editingQuestionsId) ?? null;

  const categories = useMemo(
    () => Array.from(new Set((packs ?? []).map((p) => p.category).filter((c): c is string => !!c))).sort(),
    [packs],
  );
  const visiblePacks = useMemo(
    () => (categoryFilter ? (packs ?? []).filter((p) => p.category === categoryFilter) : packs ?? []),
    [packs, categoryFilter],
  );
  const genreRows = useMemo(() => {
    const rows = new Map<string, typeof visiblePacks>();
    for (const pack of visiblePacks) {
      const key = pack.category?.trim() || (mode === "en" ? "Uncategorized" : "بدون فئة");
      const existing = rows.get(key);
      if (existing) existing.push(pack);
      else rows.set(key, [pack]);
    }
    return Array.from(rows.entries());
  }, [visiblePacks, mode]);

  useEffect(() => {
    if (packs && packs.length === 0 && !seeded.current) {
      seeded.current = true;
      void ensureSeeded({
        name: "Placeholder Pack — replace me",
        questions: seedQuestions,
      });
    }
  }, [packs, ensureSeeded]);

  useEffect(() => {
    if (!packs || seededGeneralKnowledge.current) return;
    const hasGeneralKnowledge = packs.some((p) => p.category === GENERAL_KNOWLEDGE_CATEGORY);
    if (!hasGeneralKnowledge) {
      seededGeneralKnowledge.current = true;
      void createPack({
        name: "General Knowledge",
        category: GENERAL_KNOWLEDGE_CATEGORY,
        questions: generalKnowledgeQuestions,
      });
    }
  }, [packs, createPack]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createPack({ name, category: newCategory.trim() || undefined, questions: [] });
      setNewName("");
      setNewCategory("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRemove = async (gameId: Id<"dblOrNothingGames">) => {
    try {
      await removePack({ gameId });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleHost = async (packId: Id<"dblOrNothingGames">) => {
    try {
      const { roomId } = await createRoom({});
      navigate(`/double-or-nothing/host/${roomId}?packId=${packId}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const startEditing = (gameId: string, currentName: string) => {
    setEditingId(gameId);
    setEditingName(currentName);
  };

  const commitEditing = async (gameId: string, currentName: string) => {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (trimmed.length > 0 && trimmed !== currentName) {
      try {
        await renamePack({ gameId: gameId as Id<"dblOrNothingGames">, name: trimmed });
      } catch (err) {
        setError(errorMessage(err));
      }
    }
  };

  return (
    <div className="game-lobby game-lobby--don game-lobby--fullbleed">
      <div
        className="game-lobby__panel game-lobby__panel--wide game-lobby__panel--flat"
        style={{ "--accent": ACCENT } as CSSProperties}
      >
        <Link to="/" className="game-lobby__back">
          ← <Bi en="Back to menu" ar="رجوع للقائمة" />
        </Link>
        <h1 className="game-lobby__title">
          <Bi en="Double or Nothing" ar="ضاعف أو اخسر" />
        </h1>
        <p className="game-lobby__desc">
          <Bi
            en="Everyone wagers part of their stack each round — answer right to double it, wrong to lose it."
            ar="كل واحد بيراهن بجزء من رصيده كل جولة — يجاوب صح يضاعفه، يغلط يخسره."
          />
        </p>

        <CategoryFilterBar categories={categories} selected={categoryFilter} onSelect={setCategoryFilter} />

        <div className="game-lobby__create">
          <input
            type="text"
            placeholder={mode === "en" ? "New pack name" : "اسم الحزمة الجديدة"}
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
            list="don-categories"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <datalist id="don-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="button" onClick={() => void handleCreate()} disabled={!newName.trim()}>
            + <Bi en="Create" ar="إنشاء" />
          </button>
        </div>

        {packs === undefined ? (
          <p className="game-lobby__empty">
            <Bi en="Loading your packs…" ar="بيتم تحميل حزمك..." />
          </p>
        ) : visiblePacks.length === 0 ? (
          <p className="game-lobby__empty">
            <Bi en="No saved packs here yet." ar="لسه مفيش حزم محفوظة هنا." />
          </p>
        ) : (
          <div className="genre-rows">
            {genreRows.map(([genre, genrePacks]) => (
              <section key={genre} className="genre-row">
                <h2 className="genre-row__title">{genre}</h2>
                <div className="genre-row__scroller">
                  {genrePacks.map((pack) => (
                    <div key={pack._id} className="poster-card">
                      <div className="poster-card__art">
                        <span className="poster-card__count">
                          {pack.questions.length} {mode === "en" ? "Q" : "سؤال"}
                        </span>
                      </div>
                      <div className="poster-card__body">
                        {editingId === pack._id ? (
                          <input
                            type="text"
                            className="pack-card__name-input"
                            value={editingName}
                            autoFocus
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => void commitEditing(pack._id, pack.name)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitEditing(pack._id, pack.name);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                        ) : (
                          <span
                            className="poster-card__name"
                            title={mode === "en" ? "Click to rename" : "اضغط للتعديل"}
                            onClick={() => startEditing(pack._id, pack.name)}
                          >
                            {pack.name}
                          </span>
                        )}
                        <div className="poster-card__actions">
                          <button
                            type="button"
                            className="pack-btn pack-btn--primary"
                            onClick={() => void handleHost(pack._id)}
                            disabled={pack.questions.length < 2}
                            title={pack.questions.length < 2 ? "Add at least 2 questions first" : undefined}
                          >
                            <Bi en="Host" ar="استضافة" />
                          </button>
                          <button
                            type="button"
                            className="pack-btn pack-btn--ghost"
                            onClick={() => setEditingQuestionsId(pack._id)}
                          >
                            <Bi en="Edit" ar="تعديل" />
                          </button>
                          <button
                            type="button"
                            className="pack-btn pack-btn--danger"
                            onClick={() => void handleRemove(pack._id)}
                          >
                            <Bi en="Delete" ar="حذف" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {error && <p className="game-lobby__error">{error}</p>}
      </div>

      <DblOrNothingQuestionManager
        open={editingPack !== null}
        onClose={() => setEditingQuestionsId(null)}
        questions={editingPack?.questions ?? []}
        onAddQuestion={(question) =>
          void addQuestion({ gameId: editingPack!._id, question }).catch((err) => setError(errorMessage(err)))
        }
        onUpdateQuestion={(question) =>
          void updateQuestion({ gameId: editingPack!._id, question }).catch((err) => setError(errorMessage(err)))
        }
        onRemoveQuestion={(questionId) =>
          void removeQuestion({ gameId: editingPack!._id, questionId }).catch((err) => setError(errorMessage(err)))
        }
      />
    </div>
  );
}
