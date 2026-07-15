import { useCallback, useMemo, useReducer } from "react";
import type { Round, RevealedState, TeamId, Lang } from "../types/game";
import { playAward, playBuzzer, playDing } from "../audio/sounds";

interface Team {
  name: string;
  score: number;
}

interface GameState {
  roundIndex: number;
  revealed: RevealedState;
  strikes: number;
  pot: number;
  teams: Record<TeamId, Team>;
  primaryLang: Lang;
  muted: boolean;
  strikeFlash: boolean;
}

type Action =
  | { type: "REVEAL"; index: number; count: number }
  | { type: "STRIKE" }
  | { type: "AWARD"; team: TeamId }
  | { type: "NEXT_ROUND"; max: number }
  | { type: "PREV_ROUND" }
  | { type: "GOTO_ROUND"; index: number; max: number }
  | { type: "RESET_ROUND" }
  | { type: "RESET_GAME" }
  | { type: "SET_TEAM_NAME"; team: TeamId; name: string }
  | { type: "TOGGLE_LANG" }
  | { type: "TOGGLE_MUTE" }
  | { type: "CLEAR_STRIKE_FLASH" }
  | { type: "ADJUST_SCORE"; team: TeamId; delta: number };

const initialState: GameState = {
  roundIndex: 0,
  revealed: {},
  strikes: 0,
  pot: 0,
  teams: {
    A: { name: "Team A", score: 0 },
    B: { name: "Team B", score: 0 },
  },
  primaryLang: "ar",
  muted: false,
  strikeFlash: false,
};

function sortedAnswers(round: Round | undefined) {
  if (!round) return [];
  return round.answers
    .map((answer, originalIndex) => ({ ...answer, originalIndex }))
    .sort((a, b) => b.count - a.count);
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "REVEAL": {
      if (state.revealed[action.index]) return state;
      return {
        ...state,
        revealed: { ...state.revealed, [action.index]: true },
        pot: state.pot + action.count,
      };
    }
    case "STRIKE": {
      if (state.strikes >= 3) return state;
      return { ...state, strikes: state.strikes + 1, strikeFlash: true };
    }
    case "CLEAR_STRIKE_FLASH":
      return { ...state, strikeFlash: false };
    case "AWARD": {
      const team = state.teams[action.team];
      return {
        ...state,
        teams: {
          ...state.teams,
          [action.team]: { ...team, score: team.score + state.pot },
        },
        pot: 0,
        strikes: 0,
      };
    }
    case "NEXT_ROUND": {
      const nextIndex = Math.min(state.roundIndex + 1, Math.max(action.max, 0));
      return { ...state, roundIndex: nextIndex, revealed: {}, strikes: 0, pot: 0 };
    }
    case "PREV_ROUND": {
      const prevIndex = Math.max(state.roundIndex - 1, 0);
      return { ...state, roundIndex: prevIndex, revealed: {}, strikes: 0, pot: 0 };
    }
    case "GOTO_ROUND": {
      const index = Math.max(0, Math.min(action.index, Math.max(action.max, 0)));
      return { ...state, roundIndex: index, revealed: {}, strikes: 0, pot: 0 };
    }
    case "RESET_ROUND":
      return { ...state, revealed: {}, strikes: 0, pot: 0 };
    case "RESET_GAME":
      return {
        ...state,
        roundIndex: 0,
        revealed: {},
        strikes: 0,
        pot: 0,
        teams: {
          A: { name: state.teams.A.name, score: 0 },
          B: { name: state.teams.B.name, score: 0 },
        },
      };
    case "SET_TEAM_NAME":
      return {
        ...state,
        teams: {
          ...state.teams,
          [action.team]: { ...state.teams[action.team], name: action.name },
        },
      };
    case "TOGGLE_LANG":
      return { ...state, primaryLang: state.primaryLang === "en" ? "ar" : "en" };
    case "TOGGLE_MUTE":
      return { ...state, muted: !state.muted };
    case "ADJUST_SCORE": {
      const team = state.teams[action.team];
      return {
        ...state,
        teams: {
          ...state.teams,
          [action.team]: { ...team, score: Math.max(0, team.score + action.delta) },
        },
      };
    }
    default:
      return state;
  }
}

export function useGameState(rounds: Round[]) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const clampedIndex = Math.min(state.roundIndex, Math.max(rounds.length - 1, 0));
  const round = rounds[clampedIndex];
  const answers = useMemo(() => sortedAnswers(round), [round]);

  const reveal = useCallback(
    (index: number) => {
      const answer = round?.answers[index];
      if (!answer) return;
      dispatch({ type: "REVEAL", index, count: answer.count });
      playDing();
    },
    [round],
  );

  const strike = useCallback(() => {
    dispatch({ type: "STRIKE" });
    playBuzzer();
    window.setTimeout(() => dispatch({ type: "CLEAR_STRIKE_FLASH" }), 900);
  }, []);

  const award = useCallback((team: TeamId) => {
    dispatch({ type: "AWARD", team });
    playAward();
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: "NEXT_ROUND", max: rounds.length - 1 });
  }, [rounds.length]);

  const gotoRound = useCallback(
    (index: number) => {
      dispatch({ type: "GOTO_ROUND", index, max: rounds.length - 1 });
    },
    [rounds.length],
  );

  const allRevealed = answers.length > 0 && answers.every((a) => state.revealed[a.originalIndex]);

  return {
    state,
    dispatch,
    roundIndex: clampedIndex,
    round,
    answers,
    allRevealed,
    reveal,
    strike,
    award,
    nextRound,
    gotoRound,
  };
}

export type UseGameState = ReturnType<typeof useGameState>;
