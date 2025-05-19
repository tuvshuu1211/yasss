import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Environment } from "@react-three/drei";
import { Center } from "@react-three/drei";
import Shirt from "@/Components/Shirt";

export default function CanvasContainer() {
  return (
    <div className="h-screen ">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Center>
          {/* <DeformableSphere /> */}
          <Shirt url={"/model/shirt.glb"} />
        </Center>
        <OrbitControls enableZoom={true} enableRotate={false} />
        <Environment
          preset="warehouse"
          backgroundBlurriness={2}
          environmentIntensity={0.3}
          background
        />
        <Stats />
      </Canvas>
    </div>
  );
}
