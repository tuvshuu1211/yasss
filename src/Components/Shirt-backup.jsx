import { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

export default function ElasticDragShirt() {
  const { scene } = useGLTF('/model/shirt.glb');
  const objectRef = useRef(null);
  const drag = useRef({ active: false, lastX: 0 });
  const rotationY = useRef(0);
  const velocity = useRef(0);
  const lastTime = useRef(performance.now());

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRotation: { value: 0 },
        uScale: { value: 0 }, // New: Scale uniform
        uHeight: { value: 0.5 }, // Adjust if your model is taller/shorter
      },
      vertexShader: `
       varying vec2 vUv;
varying float vGradient;

uniform float uRotation;
uniform float uScale;
uniform float uHeight;

void main() {
  vec3 pos = position;

  float gradient = pow(1.2 - clamp((pos.y + uHeight / 1.2) / uHeight, 0.0, 1.0), 1.0);
  vGradient = gradient;

  // Twist
  float angle = uRotation * gradient;
  float s = sin(angle);
  float c = cos(angle);
  float x = pos.x * c - pos.z * s;
  float z = pos.x * s + pos.z * c;
  pos.x = x;
  pos.z = z;

  // Scale
  float scaleFactor = 1.0 + uScale * gradient;
  pos.x *= scaleFactor;
  pos.z *= scaleFactor;

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
      `,
      fragmentShader: `
       varying vec2 vUv;
varying float vGradient;

void main() {
  // Visualize gradient: from blue (top) to red (bottom)
  vec3 color = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vGradient);
  gl_FragColor = vec4(color, 1.0);
}
      `,
    });
  }, []);

  // Apply custom shader to all meshes
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = shaderMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, shaderMaterial]);

  // Animate back to neutral state
  useFrame(() => {
    shaderMaterial.uniforms.uRotation.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uRotation.value,
      0,
      0.5
    );
    shaderMaterial.uniforms.uScale.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uScale.value,
      0,
      0.2
    );
  });

  // Drag interactions
  const handlePointerDown = (e) => {
    drag.current.active = true;
    drag.current.lastX = e.clientX;
    lastTime.current = performance.now();
    e.target.setPointerCapture(e.pointerId);

    const twistStrength = THREE.MathUtils.clamp(velocity.current * 0.006, -5, 5);
    const scaleStrength = THREE.MathUtils.clamp(Math.abs(velocity.current * 0.005), 0, 0.5);
    console.log(twistStrength, scaleStrength)
    gsap.fromTo(
      shaderMaterial.uniforms.uRotation,
      { value: twistStrength },
      {
        value: 0,
        duration: 1.6,
        ease: 'elastic.out(1, 0.7)',
        overwrite: true,
      }
    );

    gsap.fromTo(
      shaderMaterial.uniforms.uScale,
      { value: scaleStrength },
      {
        value: 0,
        duration: 2,
        ease: 'elastic.out(1, 0.9)',
        overwrite: true,
      }
    );
  };

  const handlePointerMove = (e) => {
    if (!drag.current.active || !objectRef.current) return;

    const now = performance.now();
    const dt = (now - lastTime.current) / 1000;
    lastTime.current = now;

    const delta = e.clientX - drag.current.lastX;
    drag.current.lastX = e.clientX;

    velocity.current = delta / dt;

    rotationY.current += delta * 0.005;
    gsap.to(objectRef.current.rotation, {
      y: rotationY.current,
      duration: 0.5,
      ease: 'power3.out',
    });

    // Optional: Apply real-time twist and scale if dragging
    // shaderMaterial.uniforms.uRotation.value += THREE.MathUtils.clamp(velocity.current * 0.006, -1.25, 1.25);
    // shaderMaterial.uniforms.uScale.value += THREE.MathUtils.clamp(Math.abs(velocity.current * 0.005), 0, 0.5);
  };

  const handlePointerUp = (e) => {
    drag.current.active = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  const handlePointerLeave = () => {
    drag.current.active = false;
  };

  return (
    <group
      position={[0, -1, 0]}
      ref={objectRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <primitive object={scene} />
    </group>
  );
}