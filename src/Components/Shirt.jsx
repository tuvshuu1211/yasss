"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import {
  showClothAnim,
  hideClothAnim,
  revealClothAnim,
} from "@/helper/clothShowHideAnim";

const modelPaths = [
  {
    title: "T Shirt",
    url: "/model/t_shirt.glb",
  },
  {
    title: "Hoodie",
    url: "/model/hoodie.glb",
  },
  {
    title: "Polo",
    url: "/model/polo.glb",
  },
];

export default function Shirt() {
  const { scene } = useGLTF("/model/t_shirt.glb");
  const bodyRef = useRef(null);
  const objectRef = useRef(null);
  const rotationY = useRef(0);
  const startTL = useRef(null);
  const needsUpdate = useRef(false);
  const models = useMemo(() => modelPaths.map((path) => useGLTF(path.url)), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [normalMap, roughnessMap] = useLoader(THREE.TextureLoader, [
    "/textures/fabric_NormalGL.jpg",
    "/textures/fabric_Roughness.jpg",
  ]);

  // Velocity tracking
  const dragData = useRef({
    lastPos: [0, 0],
    lastTime: performance.now(),
    velocity: [0, 0],
    dragging: false,
  });

  const uniformsRef = useRef({
    uRotation: { value: 0 },
    uScale: { value: 0 },
    uHeight: { value: 0 },
  });

  const rotationPhysics = useRef({
    value: 0,
    momentum: 0,
    elasticity: 50,
    ease: 0.825,
  });

  useGSAP(
    () => {
      startTL.current = revealClothAnim(
        objectRef.current,
        rotationPhysics.current,
        uniformsRef.current.uScale
      );
    },
    {
      scope: objectRef,
    }
  );

  useEffect(() => {
    if (startTL.current) {
      startTL.current.seek(0).play();
    }
  }, [startTL]);

  useEffect(() => {
    if (window.document) {
      bodyRef.current = window.document.body;
    }
  }, []);

  const injectTwistShader = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRotation = uniformsRef.current.uRotation;
      shader.uniforms.uScale = uniformsRef.current.uScale;
      shader.uniforms.uHeight = uniformsRef.current.uHeight;

      shader.vertexShader =
        `
        uniform float uRotation;
        uniform float uScale;
        uniform float uHeight;
        varying float vGradient;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          vec3 transformed = position;
          float gradient = pow(1.2 - clamp((transformed.y + uHeight / 1.2) / uHeight, 0.0, 1.0), 1.0);
          vGradient = gradient;

          float angle = uRotation * gradient;
          float s = sin(angle);
          float c = cos(angle);
          float x = transformed.x * c - transformed.z * s;
          float z = transformed.x * s + transformed.z * c;
          transformed.x = x;
          transformed.z = z;

          float scaleFactor = 1.0 + uScale * gradient;
          transformed.x *= scaleFactor;
          transformed.z *= scaleFactor;
        `
      );
    };
    material.needsUpdate = true;
  };

  useEffect(() => {
    [roughnessMap, normalMap].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2); // Customize tiling
    });
  }, [roughnessMap, normalMap]);

  useEffect(() => {
    let minY = Infinity;
    let maxY = -Infinity;

    models[activeIndex].scene.traverse((child) => {
      if (child.material) {
        const clonedMaterial = child.material.clone();
        injectTwistShader(clonedMaterial);
        console.log(child);
        child.material = clonedMaterial;
        child.material.normalMap = normalMap;
        child.material.roughnessMap = roughnessMap;
        child.material.color = new THREE.Color(0xffffff);
        child.material.side = THREE.DoubleSide;
        child.castShadow = true;
        child.receiveShadow = true;

        // Calculate bounding box
        child.geometry.computeBoundingBox();
        const box = child.geometry.boundingBox;
        minY = Math.min(minY, box.min.y);
        maxY = Math.max(maxY, box.max.y);
      }
    });

    // Set uHeight based on model height
    const height = maxY - minY;
    uniformsRef.current.uHeight.value = height;
  }, [models, activeIndex, normalMap, roughnessMap]);

  useFrame((_, delta) => {
    if (!needsUpdate.current) return;
    const rotation = rotationPhysics.current;
    // Elastic physics for twist rotation
    rotation.momentum -= rotation.value / rotation.elasticity;
    rotation.momentum *= rotation.ease;
    rotation.value += rotation.momentum;
    // rotation.value = THREE.MathUtils.clamp(rotation.value, -5, 5);

    uniformsRef.current.uRotation.value = rotation.value;

    // Gradually reduce uScale (bounciness)
    uniformsRef.current.uScale.value = THREE.MathUtils.lerp(
      uniformsRef.current.uScale.value,
      0,
      0.08
    );

    // Stop when motion is nearly settled
    const motionSettled =
      Math.abs(rotation.momentum) < 0.0001 &&
      Math.abs(rotation.value) < 0.0001 &&
      uniformsRef.current.uScale.value < 0.001;

    if (motionSettled) {
      rotation.value = 0;
      rotation.momentum = 0;
      uniformsRef.current.uRotation.value = 0;
      uniformsRef.current.uScale.value = 0;
      needsUpdate.current = false;
    }
  });

  const handlePointerDown = (e) => {
    needsUpdate.current = true;
    dragData.current.dragging = true;
    dragData.current.lastPos = [e.clientX, e.clientY];
    dragData.current.lastTime = performance.now();
    e.target.setPointerCapture(e.pointerId);
    if (bodyRef.current) {
      bodyRef.current.classList.add("cursor-grabbing");
    }
  };

  const handleChangeModel = (i) => {
    if (activeIndex === i) return;

    hideClothAnim(objectRef.current, uniformsRef.current)
      .seek(0)
      .play()
      .then(() => {
        setActiveIndex(i);
        uniformsRef.current.uRotation.value = -5;
        uniformsRef.current.uScale.value = 0.75;
        objectRef.current.scale.set(0, 0, 0);
        showClothAnim(objectRef.current, uniformsRef.current).seek(0).play();
      });
  };

  const handlePointerMove = (e) => {
    if (!dragData.current.dragging || !objectRef.current) return;

    const now = performance.now();
    const dt = (now - dragData.current.lastTime) / 1000;
    if (dt === 0) return;

    const [lastX, lastY] = dragData.current.lastPos;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    const vx = dx / dt;
    const vy = dy / dt;

    dragData.current.velocity = [vx, vy];
    dragData.current.lastPos = [e.clientX, e.clientY];
    dragData.current.lastTime = now;

    // Rotate shirt around Y
    rotationY.current += dx * 0.005;
    gsap.to(objectRef.current.rotation, {
      y: rotationY.current,
      duration: 0.5,
      ease: "power3.out",
    });
    // Inject velocity into momentum for elastic twist
    const speed = vx;
    const twistSpeed = speed * 0.00002;
    rotationPhysics.current.momentum += THREE.MathUtils.clamp(
      twistSpeed * 0.00045,
      twistSpeed,
      twistSpeed
    );
    needsUpdate.current = true;
    // Scale bounce based on velocity
    // uniformsRef.current.uScale.value = THREE.MathUtils.clamp(
    //   Math.abs(twistSpeed * 200),
    //   twistSpeed * 3,
    //   twistSpeed * 3
    // );
    gsap.fromTo(
      uniformsRef.current.uScale,
      {
        value: Math.abs(twistSpeed * 1.5),
      },
      {
        duration: 1,
        value: 0,
        ease: "elastic.out(1,0.7)",
      }
    );
  };

  const handlePointerUp = (e) => {
    dragData.current.dragging = false;
    e.target.releasePointerCapture(e.pointerId);
    if (bodyRef.current) {
      bodyRef.current.classList.remove("cursor-grabbing");
    }
  };
  const handlePointerEnter = (e) => {
    if (bodyRef.current) {
      bodyRef.current.classList.add("cursor-grab");
    }
  };
  const handlePointerLeave = (e) => {
    if (bodyRef.current) {
      bodyRef.current.classList.remove("cursor-grab");
    }
  };

  return (
    <>
      {/* Invisible plane for interaction */}
      <mesh
        position={[0, -1, -1]}
        scale={[4, 5, 1]}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Shirt model */}
      {/* <group scale={0.5} position={[0, -1.25, 0]} ref={objectRef}>
        <primitive object={scene} />
      </group> */}
      <group position={[0, -2, 0]} ref={objectRef}>
        {models.map((model, index) => (
          <primitive
            key={index}
            object={model.scene}
            visible={index === activeIndex}
          />
        ))}
      </group>
      <Html position={[-2, 0, 0]}>
        <div className="flex flex-col gap-2">
          {models.map((item, i) => (
            <button
              className={`text-black px-4 py-2 cursor-pointer hover:bg-neutral-100 rounded bg-white whitespace-nowrap ${
                activeIndex === i ? "outline-2 outline-black" : ""
              }`}
              key={i}
              onClick={() => handleChangeModel(i)}
            >
              {modelPaths[i].title}
            </button>
          ))}
        </div>
      </Html>
    </>
  );
}

useGLTF.preload("/model/t_shirt.glb");
useGLTF.preload("/model/hoodie.glb");
useGLTF.preload("/model/polo.glb");
