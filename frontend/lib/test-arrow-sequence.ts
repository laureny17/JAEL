import type { ArrowSequence } from './types';

/**
 * Dummy arrow sequences for testing the R and L foot lanes.
 * Will be replaced by real game data from the backend.
 * Total duration: 16 seconds, then loops.
 */

export const TEST_RIGHT_ARROWS: ArrowSequence = [
  { time: 0,    direction: 'R' },
  { time: 1,    direction: 'T' },
  { time: 2,    direction: 'R' },
  { time: 3,    direction: 'B' },
  { time: 4,    direction: 'T' },
  { time: 5,    direction: 'R' },
  { time: 6,    direction: 'B' },
  { time: 7,    direction: 'T' },
  { time: 8,    direction: 'R' },
  { time: 9,    direction: 'B' },
  { time: 10,   direction: 'T' },
  { time: 11,   direction: 'R' },
  { time: 12,   direction: 'B' },
  { time: 13,   direction: 'R' },
  { time: 14,   direction: 'T' },
  { time: 15,   direction: 'B' },
];

export const TEST_LEFT_ARROWS: ArrowSequence = [
  { time: 0.5,  direction: 'L' },
  { time: 1.5,  direction: 'T' },
  { time: 2.5,  direction: 'L' },
  { time: 3.5,  direction: 'B' },
  { time: 4.5,  direction: 'T' },
  { time: 5.5,  direction: 'L' },
  { time: 6.5,  direction: 'B' },
  { time: 7.5,  direction: 'T' },
  { time: 8.5,  direction: 'L' },
  { time: 9.5,  direction: 'B' },
  { time: 10.5, direction: 'T' },
  { time: 11.5, direction: 'L' },
  { time: 12.5, direction: 'B' },
  { time: 13.5, direction: 'L' },
  { time: 14.5, direction: 'T' },
  { time: 15.5, direction: 'B' },
];

export const ARROW_SEQUENCE_DURATION = 16;
