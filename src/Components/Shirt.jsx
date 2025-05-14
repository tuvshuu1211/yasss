import { useGLTF } from '@react-three/drei';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';

export default function Shirt() {
  const { scene } = useGLTF('/model/shirt.glb');
  const shaderRef = useRef();
  const drag = useRef({ active: false, lastX: 0 });

  const rotation = useRef({
    value: 0,
    target: 0,
    gsapTween: null,
  });

  // Shader material: rotates more at the bottom
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRotation: { value: 0 },
        uHeight: { value: 2.0 },
      },
      vertexShader: `
        uniform float uRotation;
        uniform float uHeight;

        void main() {
          vec3 pos = position;
          float gradient = 1.0 - clamp((pos.y + uHeight / 2.0) / uHeight, 0.0, 1.0);
          float angle = uRotation * gradient;

          float s = sin(angle);
          float c = cos(angle);
          float x = pos.x * c - pos.z * s;
          float z = pos.x * s + pos.z * c;
          pos.x = x;
          pos.z = z;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        void main() {
          gl_FragColor = vec4(1.0);
        }
      `,
    });
  }, []);

  // Apply shader to shirt
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = shaderMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, shaderMaterial]);

  // Animate the rotation value every frame
//   useFrame(() => {
//     shaderMaterial.uniforms.uRotation.value = rotation.current.value;
//   });

  // Handle pointer interaction
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const updateRotation = (deltaX) => {
    // Clamp the target
    rotation.current.target = clamp(
      rotation.current.target + deltaX * 0.2,
      -2,
      2
    );
        console.log(shaderMaterial)
    // Kill existing animation if active
    if (rotation.current.gsapTween) rotation.current.gsapTween.kill();

    // Animate back to 0 with elastic ease
    // rotation.current.gsapTween = gsap.to(rotation.current, {
    //   value: rotation.current.target,
    //   duration: 0.6,
    //   ease: 'elastic.out(1, 0.4)',
    //   overwrite: true,
    // });
    rotation.current.gsapTween = gsap.fromTo(shaderMaterial.uniforms.uRotation, {
      value: rotation.current.target,
      duration: 2,
    }, {
        value: 0,
        ease: 'elastic.out(1, 0.4)',
        overwrite: true,
        
    });
  };

  return (
    <group
      position={[0, -1, 0]}
      onPointerDown={(e) => {
        drag.current.active = true;
        drag.current.lastX = e.clientX;
        e.target.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current.active) return;
        const delta = e.clientX - drag.current.lastX;
        updateRotation(delta);
        drag.current.lastX = e.clientX;
      }}
      onPointerUp={(e) => {
        drag.current.active = false;
        rotation.current.target = 0;
        updateRotation(0); // snap back to center
        e.target.releasePointerCapture(e.pointerId);
      }}
      onPointerLeave={() => {
        drag.current.active = false;
        rotation.current.target = 0;
        updateRotation(0);
      }}
    >
      <primitive object={scene} />
    </group>
  );
}