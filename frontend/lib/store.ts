import { create } from 'zustand';
import type { GridPosition, HandPoseType, PoseState, PoseActions, PoseInput } from './types';

// ---------------------------------------------------------------------------
// Foot constraint helpers
// ---------------------------------------------------------------------------

function getRow(pos: GridPosition): string {
  if (pos.startsWith('T')) return 'T';
  if (pos.startsWith('B')) return 'B';
  return 'M';
}

function getCol(pos: GridPosition): string {
  if (pos.endsWith('L') || pos === 'L') return 'L';
  if (pos.endsWith('R') || pos === 'R') return 'R';
  return 'C';
}

/**
 * Checks whether a (leftFoot, rightFoot) combination is physically valid.
 *
 * Rules:
 *   1. Both feet on the same square is only allowed when both are M (middle).
 *   2. In the same row, feet cannot cross: the right foot can't be in the left
 *      column, and the left foot can't be in the right column.
 *      Cross-row positions are unrestricted.
 */
export function isFootComboValid(leftFoot: GridPosition, rightFoot: GridPosition): boolean {
  // Rule 1: no overlap (except both M)
  if (leftFoot === rightFoot && leftFoot !== 'M') return false;

  // Rule 2: same-row no-crossing
  if (getRow(leftFoot) === getRow(rightFoot)) {
    if (getCol(rightFoot) === 'L') return false; // right foot crossed to left side
    if (getCol(leftFoot) === 'R') return false;   // left foot crossed to right side
  }

  return true;
}

/**
 * Zustand store for the character's current pose.
 *
 * Two ways to update:
 *   1. setPose(input) — batch-apply an entire PoseInput from the backend
 *   2. Individual setters — used by the test ControlPanel for per-field tweaking
 *
 * Foot constraint: see isFootComboValid() above.
 *
 * The render loop in Character.tsx reads from this store via getState()
 * (non-reactive) on every frame, so updates are picked up immediately.
 */
export const usePoseStore = create<PoseState & PoseActions>((set, get) => ({
  // Default pose: arms slightly out from sides, nearly straight
  leftShoulderAngle: 30,
  rightShoulderAngle: 30,
  leftElbowAngle: 150,
  rightElbowAngle: 150,
  leftHandShape: 'open',
  rightHandShape: 'open',
  leftFoot: 'M',
  rightFoot: 'M',

  // Batch setter — apply an entire PoseInput payload from the backend.
  setPose: (input: PoseInput) => {
    if (!isFootComboValid(input.leftFoot, input.rightFoot)) return;
    set(input);
  },

  // Individual setters (test ControlPanel)
  setLeftFoot: (pos: GridPosition) => {
    const { rightFoot } = get();
    if (!isFootComboValid(pos, rightFoot)) return;
    set({ leftFoot: pos });
  },
  setRightFoot: (pos: GridPosition) => {
    const { leftFoot } = get();
    if (!isFootComboValid(leftFoot, pos)) return;
    set({ rightFoot: pos });
  },
  setLeftHandShape: (pose: HandPoseType) => set({ leftHandShape: pose }),
  setRightHandShape: (pose: HandPoseType) => set({ rightHandShape: pose }),
  setLeftShoulderAngle: (angle: number) => set({ leftShoulderAngle: angle }),
  setRightShoulderAngle: (angle: number) => set({ rightShoulderAngle: angle }),
  setLeftElbowAngle: (angle: number) => set({ leftElbowAngle: angle }),
  setRightElbowAngle: (angle: number) => set({ rightElbowAngle: angle }),
}));
