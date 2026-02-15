'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildBoneMap } from '@/lib/ik/bone-lookup';
import { solveTwoBoneIK, computeChainLengths, aimBoneAlongDirection, type IKChainLengths } from '@/lib/ik/two-bone-ik';
import { gridToFootWorld } from '@/lib/poses/foot-positions';
import { computeWeightShift } from '@/lib/poses/weight-shift';
import { HAND_POSES } from '@/lib/poses/hand-poses';
import { PoseAnimator } from '@/lib/animation/pose-animator';
import { usePoseStore } from '@/lib/store';
import {
  ARM_BONE_NAMES,
  LEG_BONE_NAMES,
  SPINE_BONE_NAMES,
  FINGER_BONE_NAMES,
} from '@/lib/constants';
import type { FingerName, HandPoseType } from '@/lib/types';

const FINGER_NAMES: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const TARGET_HEIGHT = 100; // All constants are calibrated for this height
const DEG_TO_RAD = Math.PI / 180;

export function Character() {
  const { scene } = useGLTF('/character-timmy-2.glb');
  const { camera, controls } = useThree();
  const boneMapRef = useRef<Map<string, THREE.Bone> | null>(null);
  const animatorRef = useRef<PoseAnimator>(new PoseAnimator());
  const chainLengthsRef = useRef<{
    leftArm: IKChainLengths | null;
    rightArm: IKChainLengths | null;
    leftLeg: IKChainLengths | null;
    rightLeg: IKChainLengths | null;
  }>({ leftArm: null, rightArm: null, leftLeg: null, rightLeg: null });
  const initializedRef = useRef(false);
  const prevStateRef = useRef<string>('');
  const sceneRef = useRef<THREE.Object3D | null>(null);
  const restPoseRef = useRef<{
    hipsQuat: THREE.Quaternion;
    spineQuat: THREE.Quaternion;
    boneQuats: Map<string, THREE.Quaternion>;
  }>({
    hipsQuat: new THREE.Quaternion(),
    spineQuat: new THREE.Quaternion(),
    boneQuats: new Map(),
  });

  // Smoothly interpolated targets — exponential smoothing gives framerate-
  // independent, jitter-free animation. Angles are smoothed before FK
  // computation so the arm sweeps in a natural arc (rather than straight-line
  // interpolation through world-space positions).
  const smoothTargetsRef = useRef({
    leftFoot: new THREE.Vector3(),
    rightFoot: new THREE.Vector3(),
    leftShoulderAngle: 0,
    rightShoulderAngle: 0,
    leftElbowAngle: 0,
    rightElbowAngle: 0,
    leftFootPitch: 0,
    rightFootPitch: 0,
    initialized: false,
  });

  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.updateMatrixWorld(true);

    // Compute height from BONE world positions, not bind-pose geometry.
    // Box3.setFromObject gives wrong results for skinned meshes because it
    // uses bind-pose vertices, not the actual deformed/rendered positions.
    // The Armature node has scale=0.01 + 90° rotation, which further confuses
    // the bounding box axes. Bone world positions reflect the true skeleton.
    let minY = Infinity, maxY = -Infinity;
    clone.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const pos = new THREE.Vector3();
        obj.getWorldPosition(pos);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }
    });
    const boneHeight = maxY - minY;
    const scaleFactor = boneHeight > 0 ? TARGET_HEIGHT / boneHeight : 1;

    console.log(`[JAEL] Bone-based height: ${boneHeight.toFixed(4)}, scale factor: ${scaleFactor.toFixed(2)}x`);

    clone.scale.setScalar(scaleFactor);
    clone.updateMatrixWorld(true);

    // Position so feet are at Y=0 (use bone positions, not mesh bbox)
    let lowestBoneY = Infinity;
    clone.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const pos = new THREE.Vector3();
        obj.getWorldPosition(pos);
        lowestBoneY = Math.min(lowestBoneY, pos.y);
      }
    });
    clone.position.y = -lowestBoneY;

    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        (child as THREE.SkinnedMesh).frustumCulled = false;
      }
    });

    sceneRef.current = clone;
    return clone;
  }, [scene]);

  useEffect(() => {
    // Update world matrices after scaling/repositioning
    clonedScene.updateMatrixWorld(true);

    const boneMap = buildBoneMap(clonedScene);
    boneMapRef.current = boneMap;

    // Debug: log bone discovery
    console.log(`[JAEL] Bone map size: ${boneMap.size}`);
    console.log(`[JAEL] Hips: ${boneMap.has(SPINE_BONE_NAMES.hips)}`);
    console.log(`[JAEL] LeftArm: ${boneMap.has(ARM_BONE_NAMES.left.upper)}`);
    console.log(`[JAEL] LeftUpLeg: ${boneMap.has(LEG_BONE_NAMES.left.upper)}`);

    // Log hip world position to verify scale
    const hips = boneMap.get(SPINE_BONE_NAMES.hips);
    if (hips) {
      const hipPos = new THREE.Vector3();
      hips.getWorldPosition(hipPos);
      console.log(`[JAEL] Hip world position: (${hipPos.x.toFixed(1)}, ${hipPos.y.toFixed(1)}, ${hipPos.z.toFixed(1)})`);
      // Capture bind-pose quaternion (critical: includes -90° X rotation)
      restPoseRef.current.hipsQuat = hips.quaternion.clone();
    }

    const spine = boneMap.get(SPINE_BONE_NAMES.spine);
    if (spine) {
      restPoseRef.current.spineQuat = spine.quaternion.clone();
    }

    // Capture rest-pose quaternions for all finger bones (especially critical
    // for thumb bones which have large bind-pose rotations)
    const restQuats = restPoseRef.current.boneQuats;
    restQuats.clear();
    for (const side of ['left', 'right'] as const) {
      const fingerBoneNames = FINGER_BONE_NAMES[side];
      for (const fingerName of FINGER_NAMES) {
        const boneNames = fingerBoneNames[fingerName];
        for (const name of boneNames) {
          const bone = boneMap.get(name);
          if (bone) {
            restQuats.set(name, bone.quaternion.clone());
          }
        }
      }
    }

    const getChainLengths = (upper: string, lower: string, end: string) => {
      const u = boneMap.get(upper);
      const l = boneMap.get(lower);
      const e = boneMap.get(end);
      if (u && l && e) {
        const lengths = computeChainLengths(u, l, e);
        console.log(`[JAEL] Chain ${upper.split(':').pop()}: upper=${lengths.upper.toFixed(1)}, lower=${lengths.lower.toFixed(1)}`);
        return lengths;
      }
      console.warn(`[JAEL] Missing bones for chain: ${upper}=${!!u}, ${lower}=${!!l}, ${end}=${!!e}`);
      return null;
    };

    chainLengthsRef.current = {
      leftArm: getChainLengths(ARM_BONE_NAMES.left.upper, ARM_BONE_NAMES.left.lower, ARM_BONE_NAMES.left.hand),
      rightArm: getChainLengths(ARM_BONE_NAMES.right.upper, ARM_BONE_NAMES.right.lower, ARM_BONE_NAMES.right.hand),
      leftLeg: getChainLengths(LEG_BONE_NAMES.left.upper, LEG_BONE_NAMES.left.lower, LEG_BONE_NAMES.left.foot),
      rightLeg: getChainLengths(LEG_BONE_NAMES.right.upper, LEG_BONE_NAMES.right.lower, LEG_BONE_NAMES.right.foot),
    };

    // Frame camera on the model - front-on view
    const halfHeight = TARGET_HEIGHT / 2;
    camera.position.set(0, halfHeight, 300);
    camera.lookAt(0, halfHeight, 0);
    if (controls) {
      (controls as any).target?.set(0, halfHeight, 0);
      (controls as any).update?.();
    }

    initializedRef.current = true;
  }, [clonedScene, camera, controls]);

  useFrame((_, delta) => {
    if (!initializedRef.current || !boneMapRef.current || !sceneRef.current) return;

    const boneMap = boneMapRef.current;
    const animator = animatorRef.current;
    const state = usePoseStore.getState();
    const chains = chainLengthsRef.current;
    const sceneObj = sceneRef.current;
    const smooth = smoothTargetsRef.current;

    // ----- Compute desired foot IK targets from current state -----
    const desiredLeftFoot = gridToFootWorld(state.leftFoot, 'left');
    const desiredRightFoot = gridToFootWorld(state.rightFoot, 'right');

    // Compute desired foot pitches per grid row:
    //   Back (B): tiptoe — steep downward pitch, ankle raised
    //   Middle row (L/M/R): flat — no pitch
    //   Front (T): heel stance — toes angled upward
    const TIPTOE_PITCH = -1.1;  // ~63° below horizontal (clear tiptoe)
    const FLAT_PITCH = -0.5;    // ~29° correction for visually flat foot
    const HEEL_PITCH = 0.55;    // ~32° above horizontal (clear heel stance)
    const FOOT_BONE_LEN = 12;   // Approximate ankle-to-ball-of-foot distance

    let desiredLeftPitch = FLAT_PITCH;
    let desiredRightPitch = FLAT_PITCH;
    if (state.leftFoot === 'B') desiredLeftPitch = TIPTOE_PITCH;
    else if (state.leftFoot === 'T') desiredLeftPitch = HEEL_PITCH;
    if (state.rightFoot === 'B') desiredRightPitch = TIPTOE_PITCH;
    else if (state.rightFoot === 'T') desiredRightPitch = HEEL_PITCH;

    // Raise ankle for tiptoe so the toes stay near ground level instead of
    // clipping through the floor. The raise = foot bone length * sin(pitch).
    // Only for tiptoe (back row), not for the small flat-foot correction.
    if (desiredLeftPitch <= TIPTOE_PITCH) {
      desiredLeftFoot.y += FOOT_BONE_LEN * Math.sin(Math.abs(desiredLeftPitch));
    }
    if (desiredRightPitch <= TIPTOE_PITCH) {
      desiredRightFoot.y += FOOT_BONE_LEN * Math.sin(Math.abs(desiredRightPitch));
    }

    // ----- Torso follows feet -----
    // Move the entire character so the torso stays above the midpoint of the
    // two feet. Without this the hips stay at the origin and the legs contort.
    const hipCenterX = (desiredLeftFoot.x + desiredRightFoot.x) / 2;
    const hipCenterZ = (desiredLeftFoot.z + desiredRightFoot.z) / 2;

    // ----- Smooth interpolation (exponential decay) -----
    // IK_SMOOTH=8 gives ~95% convergence in ~0.35s — snappy but not instant
    const IK_SMOOTH = 8;

    if (!smooth.initialized) {
      // First frame: snap directly to target (no interpolation)
      smooth.leftFoot.copy(desiredLeftFoot);
      smooth.rightFoot.copy(desiredRightFoot);
      smooth.leftShoulderAngle = state.leftShoulderAngle;
      smooth.rightShoulderAngle = state.rightShoulderAngle;
      smooth.leftElbowAngle = state.leftElbowAngle;
      smooth.rightElbowAngle = state.rightElbowAngle;
      smooth.leftFootPitch = desiredLeftPitch;
      smooth.rightFootPitch = desiredRightPitch;
      smooth.initialized = true;
    } else {
      const t = 1 - Math.exp(-IK_SMOOTH * delta);
      smooth.leftFoot.lerp(desiredLeftFoot, t);
      smooth.rightFoot.lerp(desiredRightFoot, t);
      smooth.leftShoulderAngle += (state.leftShoulderAngle - smooth.leftShoulderAngle) * t;
      smooth.rightShoulderAngle += (state.rightShoulderAngle - smooth.rightShoulderAngle) * t;
      smooth.leftElbowAngle += (state.leftElbowAngle - smooth.leftElbowAngle) * t;
      smooth.rightElbowAngle += (state.rightElbowAngle - smooth.rightElbowAngle) * t;
      smooth.leftFootPitch += (desiredLeftPitch - smooth.leftFootPitch) * t;
      smooth.rightFootPitch += (desiredRightPitch - smooth.rightFootPitch) * t;
    }

    // ----- Detect state changes for discrete animations (weight shift, hand poses) -----
    const stateKey = JSON.stringify({
      lf: state.leftFoot,
      rf: state.rightFoot,
      lhs: state.leftHandShape,
      rhs: state.rightHandShape,
      lsa: state.leftShoulderAngle,
      rsa: state.rightShoulderAngle,
      lea: state.leftElbowAngle,
      rea: state.rightElbowAngle,
    });

    const stateChanged = stateKey !== prevStateRef.current;
    prevStateRef.current = stateKey;

    if (stateChanged) {
      // --- Weight Shift (uses final desired positions for target calculation) ---
      const weightShift = computeWeightShift(desiredLeftFoot, desiredRightFoot);

      const hipsBone = boneMap.get(SPINE_BONE_NAMES.hips);
      if (hipsBone) {
        const deltaQuat = new THREE.Quaternion().setFromEuler(weightShift.hipRotation);
        const targetQuat = restPoseRef.current.hipsQuat.clone().multiply(deltaQuat);
        animator.setTarget(SPINE_BONE_NAMES.hips, hipsBone, targetQuat, 0.4);
      }

      const spineBone = boneMap.get(SPINE_BONE_NAMES.spine);
      if (spineBone) {
        const deltaQuat = new THREE.Quaternion().setFromEuler(weightShift.spineCompensation);
        const targetQuat = restPoseRef.current.spineQuat.clone().multiply(deltaQuat);
        animator.setTarget(SPINE_BONE_NAMES.spine, spineBone, targetQuat, 0.4);
      }

      // --- Hand Poses ---
      applyHandPoseTargets(boneMap, animator, 'left', state.leftHandShape, restPoseRef.current.boneQuats);
      applyHandPoseTargets(boneMap, animator, 'right', state.rightHandShape, restPoseRef.current.boneQuats);
    }

    // Update bone animations (weight shift, hand poses)
    animator.update(delta, boneMap);

    // ----- Position the character model above the feet center -----
    // Derived from smoothed foot positions so the translation is also smooth.
    const smoothHipX = (smooth.leftFoot.x + smooth.rightFoot.x) / 2;
    const smoothHipZ = (smooth.leftFoot.z + smooth.rightFoot.z) / 2;
    sceneObj.position.set(smoothHipX, 0, smoothHipZ);

    // Update world matrices before IK
    sceneObj.updateMatrixWorld(true);

    // ----- Leg IK (using smoothed foot targets) -----
    for (const side of ['left', 'right'] as const) {
      const legNames = LEG_BONE_NAMES[side];
      const upper = boneMap.get(legNames.upper);
      const lower = boneMap.get(legNames.lower);
      const foot = boneMap.get(legNames.foot);
      const chainLen = chains[`${side}Leg`];

      if (upper && lower && foot && chainLen) {
        const target = side === 'left' ? smooth.leftFoot : smooth.rightFoot;
        // Knee pole target: forward (+Z) and slightly above the foot
        const poleTarget = new THREE.Vector3(target.x, target.y + 30, target.z + 30);
        solveTwoBoneIK(upper, lower, foot, target, poleTarget, chainLen);

        // Orient foot with smoothly interpolated pitch
        sceneObj.updateMatrixWorld(true);
        // Toe-out: left foot toes point toward +X (character's left = outward)
        const sideSign = side === 'left' ? 1 : -1;
        const toeOut = sideSign * 0.15; // ~8.5° toe-out
        const footPitch = side === 'left' ? smooth.leftFootPitch : smooth.rightFootPitch;

        const footForward = new THREE.Vector3(
          Math.sin(toeOut),
          Math.sin(footPitch),
          Math.cos(toeOut) * Math.cos(footPitch)
        ).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        aimBoneAlongDirection(foot, footForward, worldUp);
      }
    }

    // Update world matrices after leg IK for arm IK
    sceneObj.updateMatrixWorld(true);

    // ----- Arm FK (direct bone rotations from angles — no IK) -----
    // We know the exact shoulder and elbow angles, so we set bone directions
    // directly instead of computing a target position and solving IK back.
    for (const side of ['left', 'right'] as const) {
      const armNames = ARM_BONE_NAMES[side];
      const upper = boneMap.get(armNames.upper);
      const lower = boneMap.get(armNames.lower);
      const hand = boneMap.get(armNames.hand);

      if (upper && lower && hand) {
        const shoulderAngle = side === 'left' ? smooth.leftShoulderAngle : smooth.rightShoulderAngle;
        const elbowAngle = side === 'left' ? smooth.leftElbowAngle : smooth.rightElbowAngle;
        const outwardSign = side === 'left' ? 1 : -1;

        // Upper arm direction: shoulder angle from straight down, in the frontal plane
        const shoulderRad = shoulderAngle * DEG_TO_RAD;
        const upperDir = new THREE.Vector3(
          Math.sin(shoulderRad) * outwardSign,
          -Math.cos(shoulderRad),
          0
        ).normalize();

        // Hint for twist: forward (+Z) keeps the arm flat in the frontal plane
        const hint = new THREE.Vector3(0, 0, 1);
        aimBoneAlongDirection(upper, upperDir, hint);
        upper.updateWorldMatrix(false, true);

        // Forearm direction: elbow bends inward (toward body / upward when
        // arm is horizontal). Flipped sign so 90° elbow with 90° shoulder
        // gives forearm pointing up (natural bicep curl).
        const forearmAngleRad = (shoulderAngle - elbowAngle + 180) * DEG_TO_RAD;
        const lowerDir = new THREE.Vector3(
          Math.sin(forearmAngleRad) * outwardSign,
          -Math.cos(forearmAngleRad),
          0
        ).normalize();

        aimBoneAlongDirection(lower, lowerDir, hint);
        lower.updateWorldMatrix(false, true);

        // Hand bone inherits forearm rotation through the bone hierarchy.
        // Don't override it — the PoseAnimator handles hand shape poses.
      }
    }
  });

  return <primitive object={clonedScene} />;
}

/**
 * Sets animation targets for a hand's finger bones.
 * Applies each finger joint's curl/spread rotation as a DELTA on top of the
 * bone's rest-pose quaternion. This is critical because some bones (especially
 * the thumb) have large bind-pose rotations that would be destroyed by setting
 * an absolute quaternion.
 *
 * Rotation axes differ between thumb and other fingers because the thumb's
 * bind-pose orientation is rotated ~90° relative to the other fingers:
 *   - Non-thumb: curl on X axis, spread on Y axis
 *   - Thumb: curl on Z axis, spread on Y axis, twist on X axis
 */
function applyHandPoseTargets(
  boneMap: Map<string, THREE.Bone>,
  animator: PoseAnimator,
  side: 'left' | 'right',
  poseType: HandPoseType,
  restQuats: Map<string, THREE.Quaternion>
): void {
  const poseDef = HAND_POSES[poseType];
  const fingerBoneNames = FINGER_BONE_NAMES[side];
  const spreadSign = side === 'left' ? 1 : -1;

  for (const fingerName of FINGER_NAMES) {
    const boneNames = fingerBoneNames[fingerName];
    const fingerPose = poseDef[fingerName];
    const joints = [fingerPose.joint1, fingerPose.joint2, fingerPose.joint3];

    for (let i = 0; i < 3; i++) {
      const bone = boneMap.get(boneNames[i]);
      if (!bone) continue;

      const joint = joints[i];
      const deltaQuat = new THREE.Quaternion();

      let euler: THREE.Euler;
      if (fingerName === 'thumb') {
        // Thumb uses same axes as other fingers: curl on X, spread on Y,
        // with optional twist on Z for roll.
        // Thumb adduction doesn't mirror like other fingers — don't flip spread sign.
        euler = new THREE.Euler(joint.curl, joint.spread, joint.twist ?? 0);
      } else {
        // Non-thumb fingers: curl on X (flexion), spread on Y (abduction).
        euler = new THREE.Euler(joint.curl, joint.spread * spreadSign, 0);
      }
      deltaQuat.setFromEuler(euler);

      // Apply as delta on top of the rest-pose quaternion.
      // Critical for thumb bones which have large bind-pose rotations.
      const restQuat = restQuats.get(boneNames[i]);
      const targetQuat = restQuat
        ? restQuat.clone().multiply(deltaQuat)
        : deltaQuat;

      animator.setTarget(boneNames[i], bone, targetQuat, 0.25);
    }
  }
}

useGLTF.preload('/character-timmy-2.glb');
