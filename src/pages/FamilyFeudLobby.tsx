import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import roundsData from "../data/rounds.json";
import type { Round } from "../types/game";
import { useLanguageMode } from "../context/LanguageMode";
import { Bi } from "../components/Bi";
import { RoundManager } from "../components/RoundManager";

const seedRounds = roundsData as Round[];

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
  const seeded = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRoundsId, setEditingRoundsId] = useState<string | null>(null);

  const startEditing = (gameId: string, currentName: string) => {
    setEditingId(gameId);
    setEditingName(currentName);
  };

  const commitEditing = async (gameId: string, currentName: string) => {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (trimmed.length > 0 && trimmed !== currentName) {
      await renameGame({ gameId: gameId as Id<"games">, name: trimmed });
    }
  };

  const editingGame = games?.find((g) => g._id === editingRoundsId) ?? null;

  useEffect(() => {
    if (games && games.length === 0 && !seeded.current) {
      seeded.current = true;
      void ensureSeeded({ name: "Sample Church Feud", rounds: seedRounds });
    }
  }, [games, ensureSeeded]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createGame({ name, rounds: [] });
    setNewName("");
  };

  const namePlaceholder =
    mode === "en"
      ? "New game name (e.g. Youth Retreat 2026)"
      : "New game name / اسم اللعبة الجديدة";

  return (
    <div className="page-center">
      <div className="lobby-card">
        <Link to="/" className="stub-back">
          ← <Bi en="Back to menu" ar="رجوع للقائمة" />
        </Link>
        <h1 className="lobby-title">
          <Bi en="Family Feud — Your Games" ar="عيلة وعيلة — ألعابك" />
        </h1>
        <p className="lobby-subtitle">
          <Bi en="Pick a saved game to host, or create a new one." ar="اختار لعبة محفوظة أو أنشئ لعبة جديدة." />
        </p>

        <div className="lobby-create">
          <input
            type="text"
            placeholder={namePlaceholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <button type="button" onClick={() => void handleCreate()} disabled={!newName.trim()}>
            + <Bi en="Create Game" ar="إنشاء لعبة" />
          </button>
        </div>

        {games === undefined ? (
          <p className="loading-text">
            <Bi en="Loading your games…" ar="بيتم تحميل ألعابك..." />
          </p>
        ) : games.length === 0 ? (
          <p className="modal__empty">
            <Bi en="No saved games yet — create one above." ar="لسه مفيش ألعاب محفوظة — أنشئ واحدة فوق." />
          </p>
        ) : (
          <ul className="lobby-list">
            {games.map((game) =>
              editingId === game._id ? (
                <li key={game._id} className="lobby-list__item">
                  <input
                    type="text"
                    className="lobby-list__name-input"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => void commitEditing(game._id, game.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitEditing(game._id, game.name);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                </li>
              ) : (
                <li key={game._id} className="lobby-list__item">
                  <Link to={`/family-feud/${game._id}`} className="lobby-list__link">
                    <span
                      className="lobby-list__name"
                      title={mode === "en" ? "Click to rename" : "اضغط للتعديل"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEditing(game._id, game.name);
                      }}
                    >
                      {game.name}
                    </span>
                    <span className="lobby-list__count">{game.rounds.length} round(s)</span>
                  </Link>
                  <button
                    type="button"
                    className="lobby-list__edit"
                    onClick={() => setEditingRoundsId(game._id)}
                  >
                    <Bi en="Edit" ar="تعديل" />
                  </button>
                  <button
                    type="button"
                    className="lobby-list__delete"
                    onClick={() => void removeGame({ gameId: game._id })}
                  >
                    <Bi en="Delete" ar="حذف" />
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <RoundManager
        open={editingGame !== null}
        onClose={() => setEditingRoundsId(null)}
        rounds={editingGame?.rounds ?? []}
        onAddRound={(round) => void addRound({ gameId: editingGame!._id, round })}
        onUpdateRound={(round) => void updateRound({ gameId: editingGame!._id, round })}
        onRemoveRound={(roundId) => void removeRound({ gameId: editingGame!._id, roundId })}
      />
    </div>
  );
}
