import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import DeformableSphere from "@/Components/Sphere";
import { Center } from "@react-three/drei";

export default function CanvasContainer() {
  return (
    <div className="h-screen">
      <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[1, 1, 1]} intensity={1} />
        <directionalLight position={[1, 1, -1]} intensity={1.6} />
        <pointLight position={[0, 350, 0]} intensity={1} />
        <Center>
          {/* <ClothSimulation /> */}
          <DeformableSphere />
        </Center>
        <OrbitControls />
        <Stats />
      </Canvas>
    </div>
  );
}
