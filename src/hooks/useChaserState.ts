import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { ChaserPhase, ChaserQuestion, ChaserSide } from "../types/chaser";
import { playAward, playBuzzer, playDing, playTick, playTimeUp } from "../audio/sounds";

interface ChaserState {
  phase: ChaserPhase;
  activeSide: ChaserSide | null;
  turnOrder: ChaserSide[];
  turnIndex: number;
  times: Record<ChaserSide, number>;
  configuredTimes: Record<ChaserSide, number>;
  scores: Record<ChaserSide, number>;
  running: boolean;
  order: number[];
  pointer: number;
  currentIndex: number | null;
  muted: boolean;
  flash: "correct" | "wrong" | null;
  winner: ChaserSide | null;
  stealActive: boolean;
}

type Action =
  | { type: "SET_TIME"; side: ChaserSide; seconds: number }
  | { type: "START"; firstSide: ChaserSide; order: number[] }
  | { type: "CORRECT"; nextIndex: number | null; nextPointer: number; nextOrder: number[] }
  | { type: "WRONG"; nextIndex: number | null; nextPointer: number; nextOrder: number[] }
  | { type: "STEAL_RESOLVE"; stolen: boolean; nextIndex: number | null; nextPointer: number; nextOrder: number[] }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET" }
  | { type: "CLEAR_FLASH" }
  | { type: "TOGGLE_MUTE" };

const DEFAULT_TIME: Record<ChaserSide, number> = { contestant: 60, chaser: 60 };

const initialState: ChaserState = {
  phase: "setup",
  activeSide: null,
  turnOrder: [],
  turnIndex: 0,
  times: { ...DEFAULT_TIME },
  configuredTimes: { ...DEFAULT_TIME },
  scores: { contestant: 0, chaser: 0 },
  running: false,
  order: [],
  pointer: 0,
  currentIndex: null,
  muted: false,
  flash: null,
  winner: null,
  stealActive: false,
};

function otherSide(side: ChaserSide): ChaserSide {
  return side === "contestant" ? "chaser" : "contestant";
}

function reducer(state: ChaserState, action: Action): ChaserState {
  switch (action.type) {
    case "SET_TIME": {
      if (state.phase !== "setup") return state;
      const configuredTimes = { ...state.configuredTimes, [action.side]: action.seconds };
      return { ...state, configuredTimes, times: { ...configuredTimes } };
    }
    case "START": {
      const turnOrder: ChaserSide[] = [action.firstSide, otherSide(action.firstSide)];
      return {
        ...state,
        phase: "playing",
        activeSide: turnOrder[0],
        turnOrder,
        turnIndex: 0,
        times: { ...state.configuredTimes },
        scores: { contestant: 0, chaser: 0 },
        running: true,
        order: action.order,
        pointer: 0,
        currentIndex: action.order.length > 0 ? action.order[0] : null,
        winner: null,
        flash: null,
      };
    }
    case "CORRECT": {
      if (state.phase !== "playing" || !state.activeSide || state.stealActive) return state;
      return {
        ...state,
        scores: { ...state.scores, [state.activeSide]: state.scores[state.activeSide] + 1 },
        currentIndex: action.nextIndex,
        pointer: action.nextPointer,
        order: action.nextOrder,
        flash: "correct",
      };
    }
    case "WRONG": {
      if (state.phase !== "playing" || state.stealActive) return state;
      // When the chaser misses one, the contestant gets a shot at stealing it back —
      // hold on the same question instead of advancing.
      if (state.activeSide === "chaser") {
        return { ...state, stealActive: true, flash: "wrong" };
      }
      return {
        ...state,
        currentIndex: action.nextIndex,
        pointer: action.nextPointer,
        order: action.nextOrder,
        flash: "wrong",
      };
    }
    case "STEAL_RESOLVE": {
      if (state.phase !== "playing" || !state.stealActive) return state;
      const scores = action.stolen
        ? { ...state.scores, chaser: Math.max(0, state.scores.chaser - 1) }
        : state.scores;
      return {
        ...state,
        scores,
        stealActive: false,
        currentIndex: action.nextIndex,
        pointer: action.nextPointer,
        order: action.nextOrder,
        flash: action.stolen ? "correct" : "wrong",
      };
    }
    case "TICK": {
      if (state.phase !== "playing" || !state.running || !state.activeSide) return state;
      const remaining = Math.max(0, state.times[state.activeSide] - 1);
      const times = { ...state.times, [state.activeSide]: remaining };
      if (remaining === 0) {
        const isLastTurn = state.turnIndex >= state.turnOrder.length - 1;
        if (!isLastTurn) {
          const nextSide = state.turnOrder[state.turnIndex + 1];
          return {
            ...state,
            times,
            activeSide: nextSide,
            turnIndex: state.turnIndex + 1,
          };
        }
        const { contestant, chaser } = state.scores;
        const winner: ChaserSide = chaser >= contestant ? "chaser" : "contestant";
        return {
          ...state,
          times,
          phase: "over",
          running: false,
          activeSide: null,
          winner,
        };
      }
      return { ...state, times };
    }
    case "TOGGLE_PAUSE":
      if (state.phase !== "playing") return state;
      return { ...state, running: !state.running };
    case "RESET":
      return {
        ...initialState,
        configuredTimes: state.configuredTimes,
        times: { ...state.configuredTimes },
        muted: state.muted,
      };
    case "CLEAR_FLASH":
      return { ...state, flash: null };
    case "TOGGLE_MUTE":
      return { ...state, muted: !state.muted };
    default:
      return state;
  }
}

function shuffledIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useChaserState(questions: ChaserQuestion[]) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentQuestion =
    state.currentIndex !== null ? questions[state.currentIndex] ?? null : null;

  useEffect(() => {
    if (state.phase !== "playing" || !state.running) return;
    const interval = window.setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.phase, state.running]);

  useEffect(() => {
    if (state.phase !== "playing" || !state.running || !state.activeSide) return;
    const remaining = state.times[state.activeSide];
    if (remaining > 0 && remaining <= 5) {
      playTick();
    }
  }, [state.times, state.activeSide, state.phase, state.running]);

  useEffect(() => {
    if (state.phase === "over") playTimeUp();
  }, [state.phase]);

  useEffect(() => {
    if (!state.flash) return;
    const t = window.setTimeout(() => dispatch({ type: "CLEAR_FLASH" }), 700);
    return () => window.clearTimeout(t);
  }, [state.flash]);

  const nextQuestionInfo = useCallback(() => {
    if (questions.length === 0) return { nextIndex: null, nextPointer: 0, nextOrder: state.order };
    let pointer = state.pointer + 1;
    let order = state.order;
    if (pointer >= order.length) {
      order = shuffledIndices(questions.length);
      pointer = 0;
      // Reshuffling can land the same question that's already on screen, which
      // looks like the "wrong" press did nothing. Swap it away when possible.
      if (questions.length > 1 && order[0] === state.currentIndex) {
        const swapWith = 1 + Math.floor(Math.random() * (order.length - 1));
        [order[0], order[swapWith]] = [order[swapWith], order[0]];
      }
    }
    return { nextIndex: order[pointer], nextPointer: pointer, nextOrder: order };
  }, [questions.length, state.order, state.pointer, state.currentIndex]);

  const setTime = useCallback((side: ChaserSide, seconds: number) => {
    dispatch({ type: "SET_TIME", side, seconds: Math.max(5, seconds) });
  }, []);

  const start = useCallback(
    (firstSide: ChaserSide) => {
      if (questions.length === 0) return;
      dispatch({ type: "START", firstSide, order: shuffledIndices(questions.length) });
    },
    [questions.length],
  );

  const correct = useCallback(() => {
    if (state.phase !== "playing") return;
    const info = nextQuestionInfo();
    dispatch({ type: "CORRECT", ...info });
    playDing();
  }, [state.phase, nextQuestionInfo]);

  const wrong = useCallback(() => {
    if (state.phase !== "playing" || state.stealActive) return;
    if (state.activeSide === "chaser") {
      dispatch({ type: "WRONG", nextIndex: state.currentIndex, nextPointer: state.pointer, nextOrder: state.order });
      playBuzzer();
      return;
    }
    const info = nextQuestionInfo();
    dispatch({ type: "WRONG", ...info });
    playBuzzer();
  }, [state.phase, state.stealActive, state.activeSide, state.currentIndex, state.pointer, state.order, nextQuestionInfo]);

  const stealResolve = useCallback(
    (stolen: boolean) => {
      if (state.phase !== "playing" || !state.stealActive) return;
      const info = nextQuestionInfo();
      dispatch({ type: "STEAL_RESOLVE", stolen, ...info });
      if (stolen) playDing();
      else playBuzzer();
    },
    [state.phase, state.stealActive, nextQuestionInfo],
  );

  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const toggleMute = useCallback(() => dispatch({ type: "TOGGLE_MUTE" }), []);

  useEffect(() => {
    if (state.phase === "over" && state.winner) playAward();
  }, [state.phase, state.winner]);

  const clampedTime = useMemo(() => state.times, [state.times]);

  return {
    state,
    dispatch,
    currentQuestion,
    times: clampedTime,
    setTime,
    start,
    correct,
    wrong,
    stealResolve,
    togglePause,
    reset,
    toggleMute,
  };
}

export type UseChaserState = ReturnType<typeof useChaserState>;
