import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";

// Particle class remains the same as it's pure logic
class Particle {
  constructor(x, y, z, mass) {
    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();
    this.a = new THREE.Vector3(0, 0, 0);
    this.mass = mass;
    this.invMass = 1 / mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.distance = 0;
    this.adj = [];

    this.position.set(x, y, z);
    this.previous.set(x, y, z);
    this.original.set(x, y, z);
  }

  addForce(force) {
    this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
  }

  integrate(timesq) {
    const newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DRAG).add(this.position);
    newPos.add(this.a.multiplyScalar(timesq));

    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;

    this.a.set(0, 0, 0);
  }
}

// Constants
const DRAG = 0.97;
const PULL = 7.5;
const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;
const GRAVITY = 981 * 1.4;

// Simulation parameters
let width = 100,
  height = 100,
  dim = 200;
let particles = [];
let constraints = [];
let psel = undefined;
let click = false;
const mouse = new THREE.Vector2(0.5, 0.5);
const mouse3d = new THREE.Vector3(0, 0, 0);
const raycaster = new THREE.Raycaster();

function satisfyConstraints(p1, p2, distance) {
  const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return; // prevents division by 0
  const correction = diff.multiplyScalar(1 - distance / currentDist);
  const correctionHalf = correction.multiplyScalar(0.5);
  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}

const ClothSimulation = () => {
  const meshRef = useRef();
  const { camera, gl } = useThree();
  const [geometry, setGeometry] = useState(null);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const mouse3d = useRef(new THREE.Vector3(0, 0, 0));
  const raycaster = useRef(new THREE.Raycaster());
  const click = useRef(false);
  const psel = useRef(null);

  // Initialize particles and constraints
  useEffect(() => {
    const initSimulation = () => {
      particles = [];
      constraints = [];

      const sphereGeometry = new THREE.SphereGeometry(100, 50, 50);
      sphereGeometry.toNonIndexed();
      const positionAttribute = sphereGeometry.getAttribute("position");

      // Create particles
      for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = positionAttribute.getZ(i);
        particles.push(new Particle(x, y, z, 0.1));
      }

      // Create adjacency list (simplified)
      for (let i = 0; i < particles.length; i++) {
        for (let j = 1; j <= 3; j++) {
          if (i + j < particles.length) {
            if (!particles[i].adj.includes(i + j)) {
              particles[i].adj.push(i + j);
            }
          }
        }
      }

      // Create constraints
      for (let i = 0; i < particles.length; i++) {
        for (let j = 0; j < particles[i].adj.length; j++) {
          const neighborIndex = particles[i].adj[j];
          constraints.push([
            particles[i],
            particles[neighborIndex],
            particles[i].original.distanceTo(particles[neighborIndex].original),
          ]);
        }
      }

      const renderGeometry = new THREE.BufferGeometry();
      renderGeometry.setAttribute("position", positionAttribute.clone());
      setGeometry(renderGeometry);
    };

    initSimulation();
  }, []);

  // Mouse interaction handlers
  useEffect(() => {
    const handleMouseMove = (event) => {
      // Update mouse position in normalized device coordinates
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);

      // Find intersection with cloth
      const intersects = raycaster.current.intersectObject(meshRef.current);

      if (intersects.length > 0) {
        mouse3d.current.copy(intersects[0].point);

        // If clicking, select nearest particle
        if (click.current && psel.current === null) {
          let minDist = Infinity;
          let selectedIndex = null;

          for (let i = 0; i < particles.length; i++) {
            const dist = mouse3d.current.distanceTo(particles[i].position);
            if (dist < minDist) {
              minDist = dist;
              selectedIndex = i;
            }
          }

          if (selectedIndex !== null) {
            psel.current = selectedIndex;
            // Calculate distances from selected particle
            for (let i = 0; i < particles.length; i++) {
              particles[i].distance = particles[
                psel.current
              ].original.distanceTo(particles[i].original);
            }
          }
        }
      }
    };

    const handleMouseDown = (event) => {
      if (event.button === 0) {
        // Left click
        click.current = true;
      }
    };

    const handleMouseUp = () => {
      click.current = false;
      psel.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [camera]);

  // Simulation loop
  useFrame(() => {
    if (!meshRef.current || !geometry) return;

    // Apply forces and integrate
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const force = new THREE.Vector3().copy(particle.original);
      particle.addForce(force.sub(particle.position).multiplyScalar(PULL));
      particle.integrate(TIMESTEP_SQ);
    }

    // Satisfy constraints
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < constraints.length; i++) {
        const [p1, p2, distance] = constraints[i];
        satisfyConstraints(p1, p2, distance);
      }

      // Apply mouse interaction if dragging
      if (click.current && psel.current !== null) {
        const offset = new THREE.Vector3().subVectors(
          mouse3d.current,
          particles[psel.current].position
        );

        for (let i = 0; i < particles.length; i++) {
          if (particles[i].distance < 10) {
            const influence = 1.0 - 0.1 * (particles[i].distance / 10);
            particles[i].position.add(offset.clone().multiplyScalar(influence));
          }
        }
      }
    }

    // Update geometry
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < particles.length; i++) {
      positions[i * 3] = particles[i].position.x;
      positions[i * 3 + 1] = particles[i].position.y;
      positions[i * 3 + 2] = particles[i].position.z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial
        color={0xaa2949}
        specular={0x030303}
        side={THREE.DoubleSide}
        alphaTest={0.7}
      />
    </mesh>
  );
};

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.999} />
      <directionalLight color={0xba8b8b} intensity={1.0} position={[1, 1, 1]} />
      <directionalLight
        color={0x8bbab4}
        intensity={1.6}
        position={[1, 1, -1]}
      />
      <pointLight
        color={0xffffff}
        intensity={1.0}
        distance={700}
        position={[0, 350, 0]}
      />
      <ClothSimulation />
      {/* <OrbitControls
        enablePan={false}
        maxDistance={400}
        minDistance={150}
        minPolarAngle={0.8}
        maxPolarAngle={(Math.PI * 2) / 5}
        target={[0, 0, 0]}
      /> */}
    </>
  );
};

const Simulation = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        camera={{
          position: [0, 300, -150],
          fov: 60,
          near: 1,
          far: 10000,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x0f1519));
          gl.setPixelRatio(window.devicePixelRatio);
        }}
      >
        <Scene />
        <Stats />
      </Canvas>
    </div>
  );
};

export default Simulation;
