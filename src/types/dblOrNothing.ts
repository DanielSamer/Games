import type { LocalizedText } from "./game";

export type Difficulty = "easy" | "medium" | "hard";

export interface DblOrNothingQuestion {
  id: string;
  category: LocalizedText;
  difficulty: Difficulty;
  question: LocalizedText;
  options: LocalizedText[];
  correctIndex: number;
  imageUrl?: string;
}

export type BustRule = "eliminated" | "mercy";

export interface DblOrNothingSettings {
  startingChips: number;
  rounds: number;
  wagerSeconds: number;
  answerSeconds: number;
  bustRule: BustRule;
  mercyStipend: number;
  sureEnabled: boolean;
  lateJoinerAverageStack: boolean;
  finalRoundUncapped: boolean;
}

export const DEFAULT_DBL_OR_NOTHING_SETTINGS: DblOrNothingSettings = {
  startingChips: 1000,
  rounds: 6,
  wagerSeconds: 20,
  answerSeconds: 5,
  bustRule: "eliminated",
  mercyStipend: 0,
  sureEnabled: false,
  lateJoinerAverageStack: true,
  finalRoundUncapped: false,
};

export type DblOrNothingPhase = "lobby" | "preview" | "wager" | "question" | "reveal" | "ended";
