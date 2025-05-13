import React, { useRef, useEffect, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import { Text } from "@react-three/drei";

const ClothSimulation = () => {
  const [shirtMesh, setShirtMesh] = useState(null);
  const meshRef = useRef(null);

  const { nodes } = useLoader(GLTFLoader, "/model/shirt.glb"); // Load GLB

  useEffect(() => {
    if (nodes && nodes.T_Shirt_male) {
      // Assuming the mesh is called 'ShirtMesh' in the GLB
      console.log("Loaded shirt mesh:", nodes.T_Shirt_male); // Debug log
      setShirtMesh(nodes.T_Shirt_male);
    }
  }, [nodes]);

  useEffect(() => {
    if (!shirtMesh) return;

    class Particle {
      constructor(x, y, z, mass) {
        this.position = new THREE.Vector3(x, y, z);
        this.previous = new THREE.Vector3(x, y, z);
        this.original = new THREE.Vector3(x, y, z);
        this.a = new THREE.Vector3(0, 0, 0);
        this.mass = mass;
        this.invMass = 1 / mass;
      }

      addForce(force) {
        this.a.add(force.clone().multiplyScalar(this.invMass));
      }

      integrate(timesq) {
        const newPos = new THREE.Vector3()
          .subVectors(this.position, this.previous)
          .multiplyScalar(DRAG)
          .add(this.position)
          .add(this.a.clone().multiplyScalar(timesq));

        this.previous.copy(this.position);
        this.position.copy(newPos);
        this.a.set(0, 0, 0);
      }
    }

    const geometry = shirtMesh.geometry;
    const particles = [];
    const constraints = [];

    const positions = geometry.attributes.position.array;
    const vertexCount = geometry.attributes.position.count;

    // 1. Create a particle for each vertex
    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      particles.push(new Particle(x, y, z, 0.1));
    }

    // 2. Create constraints from geometry.index (triangle edges)
    if (geometry.index) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];

        const p1 = particles[v1];
        const p2 = particles[v2];
        const p3 = particles[v3];

        constraints.push([p1, p2, p1.position.distanceTo(p2.position)]);
        constraints.push([p2, p3, p2.position.distanceTo(p3.position)]);
        constraints.push([p3, p1, p3.position.distanceTo(p1.position)]);
      }
    }

    const TIMESTEP_SQ = 18 / 1000;
    const GRAVITY = new THREE.Vector3(0, -0.98, 0).multiplyScalar(0.1);
    const PULL = 0.1;
    const DRAG = 0.97;

    const satisfyConstraints = (p1, p2, restDistance) => {
      const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
      const currentDist = diff.length();
      if (currentDist === 0) return;
      const correction = diff.multiplyScalar(1 - restDistance / currentDist);
      const correctionHalf = correction.multiplyScalar(0.5);
      p1.position.add(correctionHalf);
      p2.position.sub(correctionHalf);
    };

    const simulate = () => {
      for (const p of particles) {
        const restoringForce = new THREE.Vector3()
          .copy(p.original)
          .sub(p.position)
          .multiplyScalar(PULL);
        p.addForce(restoringForce);
        p.addForce(GRAVITY);
        p.integrate(TIMESTEP_SQ);
      }

      for (const [p1, p2, restDistance] of constraints) {
        satisfyConstraints(p1, p2, restDistance);
      }

      // Update geometry vertex positions
      for (let i = 0; i < vertexCount; i++) {
        const p = particles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    };

    const interval = setInterval(simulate, 16);
    return () => clearInterval(interval);
  }, [shirtMesh]);

  return (
    <>
      <Text>Text asdasd</Text>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {shirtMesh && (
          <primitive object={shirtMesh} position={[0, 0, 0]} scale={1} />
        )}
        <meshStandardMaterial color={"white"} />
      </mesh>
    </>
  );
};

export default ClothSimulation;
