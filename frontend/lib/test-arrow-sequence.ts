import type { ArrowSequence } from './types';

/**
 * Dummy arrow sequences for testing the R and L foot lanes.
 * Will be replaced by real game data from the backend.
 * Total duration: 16 seconds, then loops.
 */

export const TEST_RIGHT_ARROWS: ArrowSequence = [
  { time: 0,    direction: 'R' },
  { time: 1,    direction: 'TR' },
  { time: 2,    direction: 'T' },
  { time: 3,    direction: 'R' },
  { time: 4,    direction: 'BR' },
  { time: 5,    direction: 'B' },
  { time: 6,    direction: 'R' },
  { time: 7,    direction: 'TR' },
  { time: 8,    direction: 'T' },
  { time: 9,    direction: 'R' },
  { time: 10,   direction: 'BR' },
  { time: 11,   direction: 'B' },
  { time: 12,   direction: 'TR' },
  { time: 13,   direction: 'R' },
  { time: 14,   direction: 'T' },
  { time: 15,   direction: 'BR' },
];

export const TEST_LEFT_ARROWS: ArrowSequence = [
  { time: 0.5,  direction: 'L' },
  { time: 1.5,  direction: 'TL' },
  { time: 2.5,  direction: 'T' },
  { time: 3.5,  direction: 'L' },
  { time: 4.5,  direction: 'BL' },
  { time: 5.5,  direction: 'B' },
  { time: 6.5,  direction: 'L' },
  { time: 7.5,  direction: 'TL' },
  { time: 8.5,  direction: 'T' },
  { time: 9.5,  direction: 'L' },
  { time: 10.5, direction: 'BL' },
  { time: 11.5, direction: 'B' },
  { time: 12.5, direction: 'TL' },
  { time: 13.5, direction: 'L' },
  { time: 14.5, direction: 'T' },
  { time: 15.5, direction: 'BL' },
];

export const ARROW_SEQUENCE_DURATION = 16;
