import type { PoseSequence } from './types';

/**
 * Hardcoded test sequence that cycles through various poses.
 * Used for development/testing — will be replaced by real backend data.
 */
export const TEST_SEQUENCE: PoseSequence = [
  {
    time: 0,
    pose: {
      leftShoulderAngle: 10,
      rightShoulderAngle: 10,
      leftElbowAngle: 160,
      rightElbowAngle: 160,
      leftHandShape: 'open',
      rightHandShape: 'open',
      leftFoot: 'M',
      rightFoot: 'M',
    },
  },
  {
    time: 1.5,
    pose: {
      leftShoulderAngle: 140,
      rightShoulderAngle: 140,
      leftElbowAngle: 170,
      rightElbowAngle: 170,
      leftHandShape: 'peace',
      rightHandShape: 'peace',
      leftFoot: 'M',
      rightFoot: 'M',
    },
  },
  {
    time: 3,
    pose: {
      leftShoulderAngle: 90,
      rightShoulderAngle: 90,
      leftElbowAngle: 90,
      rightElbowAngle: 90,
      leftHandShape: 'fist',
      rightHandShape: 'fist',
      leftFoot: 'T',
      rightFoot: 'B',
    },
  },
  {
    time: 4.5,
    pose: {
      leftShoulderAngle: 90,
      rightShoulderAngle: 90,
      leftElbowAngle: 180,
      rightElbowAngle: 180,
      leftHandShape: 'four',
      rightHandShape: 'four',
      leftFoot: 'L',
      rightFoot: 'R',
    },
  },
  {
    time: 6,
    pose: {
      leftShoulderAngle: 50,
      rightShoulderAngle: 50,
      leftElbowAngle: 120,
      rightElbowAngle: 120,
      leftHandShape: 'heart',
      rightHandShape: 'heart',
      leftFoot: 'TL',
      rightFoot: 'BR',
    },
  },
  {
    time: 7.5,
    pose: {
      leftShoulderAngle: 10,
      rightShoulderAngle: 10,
      leftElbowAngle: 160,
      rightElbowAngle: 160,
      leftHandShape: 'open',
      rightHandShape: 'open',
      leftFoot: 'M',
      rightFoot: 'M',
    },
  },
];
