import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import roundsData from "../data/rounds.json";
import type { Round } from "../types/game";
import { useLanguageMode } from "../context/LanguageMode";
import { Bi } from "../components/Bi";
import { CategoryFilterBar } from "../components/lobby/CategoryFilterBar";
import { RoundManager } from "../components/RoundManager";

const seedRounds = roundsData as Round[];
const ACCENT = "#3b82f6";

export function FamilyFeudLobby() {
  const { mode } = useLanguageMode();
  const games = useQuery(api.games.listMine);
  const createGame = useMutation(api.games.create);
  const removeGame = useMutation(api.games.remove);
  const renameGame = useMutation(api.games.rename);
  const addRound = useMutation(api.games.addRound);
  const updateRound = useMutation(api.games.updateRound);
  const removeRound = useMutation(api.games.removeRound);
  const ensureSeeded = useMutation(api.games.ensureSeeded);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const seeded = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRoundsId, setEditingRoundsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }

  const startEditing = (gameId: string, currentName: string) => {
    setEditingId(gameId);
    setEditingName(currentName);
  };

  const commitEditing = async (gameId: string, currentName: string) => {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (trimmed.length > 0 && trimmed !== currentName) {
      try {
        await renameGame({ gameId: gameId as Id<"games">, name: trimmed });
      } catch (err) {
        setError(errorMessage(err));
      }
    }
  };

  const editingGame = games?.find((g) => g._id === editingRoundsId) ?? null;

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
      void ensureSeeded({ name: "Sample Church Feud", rounds: seedRounds });
    }
  }, [games, ensureSeeded]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createGame({ name, category: newCategory.trim() || undefined, rounds: [] });
      setNewName("");
      setNewCategory("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRemove = async (gameId: Id<"games">) => {
    try {
      await removeGame({ gameId });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="game-lobby game-lobby--feud">
      <div className="game-lobby__panel" style={{ "--accent": ACCENT } as CSSProperties}>
        <Link to="/" className="game-lobby__back">
          ← <Bi en="Back to menu" ar="رجوع للقائمة" />
        </Link>
        <h1 className="game-lobby__title">
          <Bi en="Asked the People" ar="سألنا الناس" />
        </h1>
        <p className="game-lobby__desc">
          <Bi
            en="Two teams face off guessing the top survey answers before the board fills up."
            ar="فريقين بيتنافسوا على تخمين أشهر إجابات الاستطلاع قبل ما اللوحة تمتلئ."
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
            list="feud-categories"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <datalist id="feud-categories">
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
                  {editingId === game._id ? (
                    <input
                      type="text"
                      className="pack-card__name-input"
                      value={editingName}
                      autoFocus
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => void commitEditing(game._id, game.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitEditing(game._id, game.name);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span
                      className="pack-card__name"
                      title={mode === "en" ? "Click to rename" : "اضغط للتعديل"}
                      onClick={() => startEditing(game._id, game.name)}
                    >
                      {game.name}
                    </span>
                  )}
                  <div className="pack-card__meta">
                    {game.category && <span className="pack-card__category">{game.category}</span>}
                    <span className="pack-card__count">
                      {game.rounds.length} {mode === "en" ? "round(s)" : "جولة"}
                    </span>
                  </div>
                </div>
                <div className="pack-card__actions">
                  <Link to={`/family-feud/${game._id}`} className="pack-btn pack-btn--primary">
                    <Bi en="Play" ar="لعب" />
                  </Link>
                  <button
                    type="button"
                    className="pack-btn pack-btn--ghost"
                    onClick={() => setEditingRoundsId(game._id)}
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

      <RoundManager
        open={editingGame !== null}
        onClose={() => setEditingRoundsId(null)}
        rounds={editingGame?.rounds ?? []}
        onAddRound={(round) =>
          void addRound({ gameId: editingGame!._id, round }).catch((err) => setError(errorMessage(err)))
        }
        onUpdateRound={(round) =>
          void updateRound({ gameId: editingGame!._id, round }).catch((err) => setError(errorMessage(err)))
        }
        onRemoveRound={(roundId) =>
          void removeRound({ gameId: editingGame!._id, roundId }).catch((err) => setError(errorMessage(err)))
        }
      />
    </div>
  );
}
