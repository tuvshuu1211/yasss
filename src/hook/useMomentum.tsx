import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF, OrbitControls } from "@react-three/drei";

export function useDragMomentum(rotation) {
  const { gl } = useThree();
  const [isDragging, setDragging] = useState(false);
  const startX = useRef(null);

  React.useEffect(() => {
    const onPointerDown = (e) => {
      setDragging(true);
      startX.current = e.clientX;
    };

    const onPointerMove = (e) => {
      if (!isDragging || startX.current === null) return;
      const delta = e.clientX - startX.current;
      rotation.current.momentum += delta * 0.002; // drag sensitivity
      startX.current = e.clientX;
    };

    const onPointerUp = () => {
      setDragging(false);
      startX.current = null;
    };

    gl.domElement.addEventListener("pointerdown", onPointerDown);
    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerup", onPointerUp);

    return () => {
      gl.domElement.removeEventListener("pointerdown", onPointerDown);
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl]);
}
