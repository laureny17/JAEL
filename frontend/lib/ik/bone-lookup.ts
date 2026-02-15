import * as THREE from 'three';

export function buildBoneMap(scene: THREE.Object3D): Map<string, THREE.Bone> {
  const map = new Map<string, THREE.Bone>();
  const originalNames: string[] = [];

  scene.traverse((obj) => {
    const bone = obj as THREE.Bone;
    if (!bone.isBone) return;
    if (obj.name.includes('$AssimpFbx$')) return;

    originalNames.push(obj.name);

    // Store by original name
    map.set(obj.name, bone);

    if (obj.name.startsWith('mixamorig6')) {
      // Also store without prefix for canonical lookup
      map.set(obj.name.replace('mixamorig6', ''), bone);
    } else {
      // Some bones (e.g. Thumb2/3/4) lack the prefix in this model.
      // Also store with prefix so FINGER_BONE_NAMES lookups work.
      map.set('mixamorig6' + obj.name, bone);
    }
  });

  // Debug: log first 15 bone names to verify naming convention
  console.log(`[JAEL] Bone names (first 15): ${originalNames.slice(0, 15).join(', ')}`);

  return map;
}
