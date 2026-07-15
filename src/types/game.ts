export type Lang = "en" | "ar";

export interface LocalizedText {
  en?: string;
  ar?: string;
}

export interface RoundAnswer {
  text: LocalizedText;
  count: number;
}

export interface Round {
  id: string;
  question: LocalizedText;
  answers: RoundAnswer[];
}

export type TeamId = "A" | "B";

export interface RevealedState {
  [answerIndex: number]: boolean;
}
