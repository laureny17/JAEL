import { create } from 'zustand';
import { Score, ScoreResult } from './scoring';

interface Feedback {
  text: string;
  color: string;
}

interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  lastFeedback: Feedback | null;
  scoredKeyframes: Set<number>; // Stores indices of scored keyframes
}

interface ScoreActions {
  addScore: (result: ScoreResult, keyframeIndex: number) => void;
  resetCombo: () => void;
  resetGame: () => void;
}

const FEEDBACK_COLORS: Record<Score, string> = {
  PERFECT: 'text-purple-400',
  GREAT: 'text-green-400',
  GOOD: 'text-yellow-400',
  OKAY: 'text-orange-400',
  MISS: 'text-red-500',
};

export const useScoreStore = create<ScoreState & ScoreActions>((set) => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  lastFeedback: null,
  scoredKeyframes: new Set(),

  addScore: (result: ScoreResult, keyframeIndex: number) =>
    set((state) => {
      // Prevent double scoring
      if (state.scoredKeyframes.has(keyframeIndex)) return state;

      const newCombo = result.score === 'MISS' ? 0 : state.combo + 1;
      const newMaxCombo = Math.max(state.maxCombo, newCombo);
      const newScore = state.score + result.totalPoints + (newCombo * 10); // Simple combo bonus

      const newScoredKeyframes = new Set(state.scoredKeyframes);
      newScoredKeyframes.add(keyframeIndex);

      return {
        score: newScore,
        combo: newCombo,
        maxCombo: newMaxCombo,
        lastFeedback: {
          text: result.score,
          color: FEEDBACK_COLORS[result.score],
        },
        scoredKeyframes: newScoredKeyframes,
      };
    }),

  resetCombo: () => set({ combo: 0 }),

  resetGame: () =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      lastFeedback: null,
      scoredKeyframes: new Set(),
    }),
}));

