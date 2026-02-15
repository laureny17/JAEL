import * as THREE from 'three';

interface BoneTransition {
  startQuat: THREE.Quaternion;
  targetQuat: THREE.Quaternion;
  startPos: THREE.Vector3 | null;
  targetPos: THREE.Vector3 | null;
  progress: number;
  duration: number;
}

export class PoseAnimator {
  private transitions: Map<string, BoneTransition> = new Map();

  setTarget(
    boneName: string,
    bone: THREE.Bone,
    targetQuat: THREE.Quaternion,
    duration: number = 0.3,
    targetPos?: THREE.Vector3
  ): void {
    const existing = this.transitions.get(boneName);

    // If we already have a transition to the same target, skip
    if (existing && existing.targetQuat.equals(targetQuat) && existing.progress >= 1.0) {
      return;
    }

    this.transitions.set(boneName, {
      startQuat: bone.quaternion.clone(),
      targetQuat: targetQuat.clone(),
      startPos: targetPos ? bone.position.clone() : null,
      targetPos: targetPos ? targetPos.clone() : null,
      progress: 0,
      duration,
    });
  }

  setPositionTarget(
    boneName: string,
    bone: THREE.Bone,
    targetPos: THREE.Vector3,
    targetQuat: THREE.Quaternion,
    duration: number = 0.35
  ): void {
    this.transitions.set(boneName, {
      startQuat: bone.quaternion.clone(),
      targetQuat: targetQuat.clone(),
      startPos: bone.position.clone(),
      targetPos: targetPos.clone(),
      progress: 0,
      duration,
    });
  }

  update(delta: number, boneMap: Map<string, THREE.Bone>): void {
    for (const [boneName, t] of this.transitions) {
      if (t.progress >= 1.0) continue;

      t.progress = Math.min(1.0, t.progress + delta / t.duration);
      const easedT = easeInOutCubic(t.progress);

      const bone = boneMap.get(boneName);
      if (!bone) continue;

      bone.quaternion.slerpQuaternions(t.startQuat, t.targetQuat, easedT);

      if (t.startPos && t.targetPos) {
        bone.position.lerpVectors(t.startPos, t.targetPos, easedT);
      }
    }
  }

  isTransitioning(): boolean {
    for (const t of this.transitions.values()) {
      if (t.progress < 1.0) return true;
    }
    return false;
  }

  clear(): void {
    this.transitions.clear();
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
