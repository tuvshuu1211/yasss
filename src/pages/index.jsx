import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Environment } from "@react-three/drei";
import { Center } from "@react-three/drei";
import Shirt from "@/Components/Shirt";
import { EffectComposer, N8AO } from "@react-three/postprocessing";

export default function CanvasContainer() {
  return (
    <div className="h-screen ">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5 * Math.PI} />
        <Center>
          {/* <DeformableSphere /> */}
          <Shirt url={"/model/shirt.glb"} />
        </Center>
        <OrbitControls enableZoom={true} enableRotate={false} />
        <directionalLight position={[0, 5, -4]} intensity={10} />
        {/* <directionalLight
          position={[0, -15, -0]}
          intensity={10}
          color="white"
        /> */}
        <Environment files="hdr/adamsbridge.hdr" environmentIntensity={1.5} />
        {/* <Environment
          preset="warehouse"
          backgroundBlurriness={2}
          environmentIntensity={0.5}
          background
        /> */}
        <Stats />
      </Canvas>
    </div>
  );
}
