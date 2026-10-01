"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Text } from "@react-three/drei";
import type { Group } from "three";

const subjects = [
  { label: "Math", color: "#6b8f71", position: [-2.2, 0.6, 0] as const },
  { label: "Physics", color: "#e8a33d", position: [-0.7, -0.4, 1] as const },
  { label: "English", color: "#e4572e", position: [0.8, 0.8, -0.5] as const },
  { label: "Chemistry", color: "#14213d", position: [2.1, -0.6, 0.5] as const },
];

function Scene() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow orbiting drift, driven by elapsed time
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.35;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {subjects.map((s, i) => (
        <Float
          key={s.label}
          speed={2.5 + i * 0.4}
          rotationIntensity={1.6}
          floatIntensity={2.4}
        >
          <group position={s.position}>
            <RoundedBox args={[1.3, 1.6, 0.15]} radius={0.1} smoothness={4}>
              <meshStandardMaterial color={s.color} />
            </RoundedBox>
            <Text
              position={[0, -0.5, 0.09]}
              fontSize={0.18}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {s.label}
            </Text>
          </group>
        </Float>
      ))}
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="h-80 w-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 3, 3]} intensity={1} />
        <Scene />
      </Canvas>
    </div>
  );
}