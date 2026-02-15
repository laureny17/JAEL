/**
 * Coordinate Mapping — converts foot grid labels to 3D world positions.
 */

import * as THREE from 'three';
import type { GridPosition } from '../types';
import {
  GRID_WORLD_POSITIONS,
  STANCE_HALF_WIDTH,
} from '../constants';

// ---------------------------------------------------------------------------
// Foot grid → world position
// ---------------------------------------------------------------------------

/**
 * Converts a 3x3 grid label to a world-space foot position.
 * Feet are always at Y=0 (ground level). X and Z come from the grid constants.
 *
 * Each foot is offset slightly to its side so the left and right feet never
 * occupy the exact same X position (natural stance width).
 *
 * The character faces +Z (toward camera), so the character's left side is +X
 * in world space (appears on the viewer's RIGHT due to mirroring).
 *   - Left foot:  shifted by +STANCE_HALF_WIDTH in X (character's left = +X)
 *   - Right foot: shifted by -STANCE_HALF_WIDTH in X (character's right = -X)
 */
export function gridToFootWorld(gridLabel: GridPosition, side: 'left' | 'right'): THREE.Vector3 {
  const pos = GRID_WORLD_POSITIONS[gridLabel];
  const stanceOffset = side === 'left' ? STANCE_HALF_WIDTH : -STANCE_HALF_WIDTH;
  return new THREE.Vector3(pos.x + stanceOffset, 0, pos.z);
}
