import type { LocalizedText } from "./game";

export interface ChaserQuestion {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
}

export type ChaserSide = "contestant" | "chaser";

export type ChaserPhase = "setup" | "playing" | "over";
