import * as THREE from 'three';
import { HIP_HEIGHT, LEG_LENGTH, STEP_WIDTH } from '../constants';

export interface WeightShiftResult {
  hipPosition: THREE.Vector3;
  hipRotation: THREE.Euler;
  spineCompensation: THREE.Euler;
}

export function computeWeightShift(
  leftFootWorld: THREE.Vector3,
  rightFootWorld: THREE.Vector3
): WeightShiftResult {
  // Center of support
  const cosX = (leftFootWorld.x + rightFootWorld.x) / 2;
  const cosZ = (leftFootWorld.z + rightFootWorld.z) / 2;

  // Stance dimensions
  const stanceWidth = Math.abs(leftFootWorld.x - rightFootWorld.x);
  const stanceDepth = Math.abs(leftFootWorld.z - rightFootWorld.z);

  // Hip lateral shift toward center of support (70%)
  const hipX = cosX * 0.7;
  const hipZ = cosZ * 0.5;

  // Hip vertical drop from wider stance
  const halfStanceX = stanceWidth / 2;
  const halfStanceZ = stanceDepth / 2;
  const effectiveHalfStance = Math.sqrt(halfStanceX * halfStanceX + halfStanceZ * halfStanceZ);
  const hipDrop = LEG_LENGTH - Math.sqrt(Math.max(0, LEG_LENGTH * LEG_LENGTH - effectiveHalfStance * effectiveHalfStance));
  const hipY = HIP_HEIGHT - hipDrop;

  // Hip yaw from foot depth difference
  const footZDiff = leftFootWorld.z - rightFootWorld.z;
  const hipYaw = footZDiff * 0.02;

  // Hip roll from lateral asymmetry
  const hipRoll = STEP_WIDTH > 0 ? (cosX / STEP_WIDTH) * 0.05 : 0;

  // Spine compensation to keep torso upright
  const spineTiltX = -hipRoll * 0.6;
  const spineTiltZ = -hipYaw * 0.4;

  return {
    hipPosition: new THREE.Vector3(hipX, hipY, hipZ),
    hipRotation: new THREE.Euler(0, hipYaw, hipRoll),
    spineCompensation: new THREE.Euler(spineTiltX, 0, spineTiltZ),
  };
}
