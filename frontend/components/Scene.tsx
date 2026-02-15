'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import { Character } from './Character';

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 80, 300], fov: 30, near: 0.1, far: 2000 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={1} castShadow />
      <directionalLight position={[-50, 80, -50]} intensity={0.3} />
      <Suspense fallback={null}>
        <Character />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 80, 0]}
        minDistance={100}
        maxDistance={1500}
      />
      <gridHelper args={[200, 20, '#444444', '#222222']} />
    </Canvas>
  );
}
