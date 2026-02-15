import { create } from 'zustand';

interface GameState {
  score: number;
  currentTime: number;
}

interface GameActions {
  addScore: (points: number) => void;
  resetScore: () => void;
  setCurrentTime: (time: number) => void;
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  score: 12450,
  currentTime: 0,

  addScore: (points) => set((s) => ({ score: s.score + points })),
  resetScore: () => set({ score: 0 }),
  setCurrentTime: (time) => set({ currentTime: time }),
}));
