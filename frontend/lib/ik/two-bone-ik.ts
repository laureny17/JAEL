import * as THREE from 'three';

const _rootPos = new THREE.Vector3();
const _midPos = new THREE.Vector3();
const _endPos = new THREE.Vector3();
const _targetClamped = new THREE.Vector3();
const _dirToTarget = new THREE.Vector3();
const _dirToPole = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _desiredWorldQuat = new THREE.Quaternion();
const _tempVec = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();

export interface IKChainLengths {
  upper: number;
  lower: number;
}

export function computeChainLengths(
  root: THREE.Object3D,
  mid: THREE.Object3D,
  end: THREE.Object3D
): IKChainLengths {
  root.getWorldPosition(_rootPos);
  mid.getWorldPosition(_midPos);
  end.getWorldPosition(_endPos);
  return {
    upper: _rootPos.distanceTo(_midPos),
    lower: _midPos.distanceTo(_endPos),
  };
}

export function solveTwoBoneIK(
  root: THREE.Bone,
  mid: THREE.Bone,
  end: THREE.Bone,
  target: THREE.Vector3,
  poleTarget: THREE.Vector3,
  lengths: IKChainLengths
): void {
  const { upper: upperLen, lower: lowerLen } = lengths;
  const totalLen = upperLen + lowerLen;
  const minLen = Math.abs(upperLen - lowerLen) + 0.01;

  // Get current world position of root joint
  root.getWorldPosition(_rootPos);

  // Clamp target distance to reachable range
  const rawDist = _rootPos.distanceTo(target);
  const targetDist = THREE.MathUtils.clamp(rawDist, minLen, totalLen - 0.01);

  // Direction from root to clamped target
  _dirToTarget.copy(target).sub(_rootPos).normalize();
  _targetClamped.copy(_dirToTarget).multiplyScalar(targetDist).add(_rootPos);

  // Law of cosines: angle at root joint
  const cosAngleAtRoot = (upperLen * upperLen + targetDist * targetDist - lowerLen * lowerLen) /
    (2 * upperLen * targetDist);
  const angleAtRoot = Math.acos(THREE.MathUtils.clamp(cosAngleAtRoot, -1, 1));

  // Build the bend plane from the pole target
  _dirToPole.copy(poleTarget).sub(_rootPos);
  // Remove the component along dirToTarget to get perpendicular direction
  const proj = _dirToPole.dot(_dirToTarget);
  _dirToPole.sub(_tempVec.copy(_dirToTarget).multiplyScalar(proj));
  if (_dirToPole.lengthSq() < 0.0001) {
    // Pole target is colinear with root->target, use a fallback
    _dirToPole.set(0, 0, 1);
    _dirToPole.sub(_tempVec.copy(_dirToTarget).multiplyScalar(_dirToPole.dot(_dirToTarget)));
    if (_dirToPole.lengthSq() < 0.0001) {
      _dirToPole.set(0, 1, 0);
    }
  }
  _dirToPole.normalize();

  // Compute the mid-joint world position
  // Rotate dirToTarget by angleAtRoot toward the pole direction
  const bendAxis = _tempVec.clone().crossVectors(_dirToTarget, _dirToPole).normalize();
  const midDir = _dirToTarget.clone().applyAxisAngle(bendAxis, angleAtRoot);
  const computedMidPos = _rootPos.clone().add(midDir.multiplyScalar(upperLen));

  // --- Set root bone rotation ---
  const dirRootToMid = computedMidPos.clone().sub(_rootPos).normalize();
  aimBoneAlongDirection(root, dirRootToMid, bendAxis);
  root.updateWorldMatrix(false, true);

  // --- Set mid bone rotation ---
  mid.getWorldPosition(_midPos);
  const dirMidToTarget = _targetClamped.clone().sub(_midPos).normalize();
  aimBoneAlongDirection(mid, dirMidToTarget, bendAxis);
  mid.updateWorldMatrix(false, true);
}

export function aimBoneAlongDirection(
  bone: THREE.Bone,
  worldDirection: THREE.Vector3,
  hint: THREE.Vector3
): void {
  // For Mixamo rigs, bone's local +Y axis points along the bone (toward child).
  // We need to find a quaternion that, when applied as the bone's local rotation,
  // makes the bone's +Y axis align with worldDirection in world space.

  // Get parent's world quaternion
  if (bone.parent) {
    bone.parent.getWorldQuaternion(_parentWorldQuat);
  } else {
    _parentWorldQuat.identity();
  }

  // Build desired world rotation:
  // Y axis = worldDirection (bone axis)
  // X axis = cross(Y, hint) (perpendicular in bend plane)
  // Z axis = cross(X, Y) (completes the frame)
  const y = worldDirection.clone().normalize();
  let x = new THREE.Vector3().crossVectors(y, hint).normalize();
  if (x.lengthSq() < 0.0001) {
    // Fallback if hint is parallel to direction
    const fallback = Math.abs(y.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    x = new THREE.Vector3().crossVectors(y, fallback).normalize();
  }
  const z = new THREE.Vector3().crossVectors(x, y).normalize();

  _mat4.makeBasis(x, y, z);
  _desiredWorldQuat.setFromRotationMatrix(_mat4);

  // Convert to local: localQuat = parentWorldQuat^-1 * desiredWorldQuat
  bone.quaternion.copy(_parentWorldQuat.clone().invert()).multiply(_desiredWorldQuat);
}
