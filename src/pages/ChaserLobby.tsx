import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import chaserQuestionsData from "../data/chaserQuestions.json";
import type { ChaserQuestion } from "../types/chaser";
import { useLanguageMode } from "../context/LanguageMode";
import { Bi } from "../components/Bi";
import { ChaserQuestionManager } from "../components/chaser/ChaserQuestionManager";

const seedQuestions = chaserQuestionsData as ChaserQuestion[];

export function ChaserLobby() {
  const { mode } = useLanguageMode();
  const games = useQuery(api.chaser.listMine);
  const createGame = useMutation(api.chaser.create);
  const removeGame = useMutation(api.chaser.remove);
  const renameGame = useMutation(api.chaser.rename);
  const addQuestion = useMutation(api.chaser.addQuestion);
  const updateQuestion = useMutation(api.chaser.updateQuestion);
  const removeQuestion = useMutation(api.chaser.removeQuestion);
  const ensureSeeded = useMutation(api.chaser.ensureSeeded);

  const [newName, setNewName] = useState("");
  const seeded = useRef(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingQuestionsId, setEditingQuestionsId] = useState<string | null>(null);

  const startEditingName = (gameId: string, currentName: string) => {
    setEditingNameId(gameId);
    setEditingName(currentName);
  };

  const commitEditingName = async (gameId: string, currentName: string) => {
    const trimmed = editingName.trim();
    setEditingNameId(null);
    if (trimmed.length > 0 && trimmed !== currentName) {
      await renameGame({ gameId: gameId as Id<"chaserGames">, name: trimmed });
    }
  };

  const editingGame = games?.find((g) => g._id === editingQuestionsId) ?? null;

  useEffect(() => {
    if (games && games.length === 0 && !seeded.current) {
      seeded.current = true;
      void ensureSeeded({ name: "El7a2o — Sample Game", questions: seedQuestions });
    }
  }, [games, ensureSeeded]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createGame({ name, questions: [] });
    setNewName("");
  };

  const namePlaceholder =
    mode === "en" ? "New game name (e.g. Friday Night Chase)" : "New game name / اسم اللعبة الجديدة";

  return (
    <div className="page-center chaser-theme">
      <div className="lobby-card lobby-card--chaser">
        <Link to="/" className="stub-back">
          ← <Bi en="Back to menu" ar="رجوع للقائمة" />
        </Link>
        <span className="lobby-card__eyebrow">
          <Bi en="Host mode" ar="وضع المُقدِّم" />
        </span>
        <h1 className="lobby-title">
          <Bi en="El7a2o — Your Games" ar="اهزم الملاحقين — ألعابك" />
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
              editingNameId === game._id ? (
                <li key={game._id} className="lobby-list__item">
                  <input
                    type="text"
                    className="lobby-list__name-input"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => void commitEditingName(game._id, game.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitEditingName(game._id, game.name);
                      if (e.key === "Escape") setEditingNameId(null);
                    }}
                  />
                </li>
              ) : (
                <li key={game._id} className="lobby-list__item">
                  <Link to={`/chaser/${game._id}`} className="lobby-list__link">
                    <span
                      className="lobby-list__name"
                      title={mode === "en" ? "Click to rename" : "اضغط للتعديل"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEditingName(game._id, game.name);
                      }}
                    >
                      {game.name}
                    </span>
                    <span className="lobby-list__count">{game.questions.length} question(s)</span>
                  </Link>
                  <button
                    type="button"
                    className="lobby-list__edit"
                    onClick={() => setEditingQuestionsId(game._id)}
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

      <ChaserQuestionManager
        open={editingGame !== null}
        onClose={() => setEditingQuestionsId(null)}
        questions={editingGame?.questions ?? []}
        onAddQuestion={(question) =>
          void addQuestion({ gameId: editingGame!._id, question })
        }
        onUpdateQuestion={(question) =>
          void updateQuestion({ gameId: editingGame!._id, question })
        }
        onRemoveQuestion={(questionId) =>
          void removeQuestion({ gameId: editingGame!._id, questionId })
        }
      />
    </div>
  );
}
