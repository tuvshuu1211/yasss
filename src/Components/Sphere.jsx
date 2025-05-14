import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const DRAG = 0.97;
const PULL = 25;
const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;      // whether mouse was clicked this frame

function Particle(x, y, z, mass) {
  this.position = new THREE.Vector3(x, y, z);
  this.previous = new THREE.Vector3(x, y, z);
  this.original = new THREE.Vector3(x, y, z);
  this.acceleration = new THREE.Vector3();
  this.invMass = 1 / mass;
  this.adj = [];
  this.distance = 0;
  this.tmp = new THREE.Vector3();
  this.tmp2 = new THREE.Vector3();
}

Particle.prototype.addForce = function (force) {
  this.acceleration.add(
    this.tmp2.copy(force).multiplyScalar(this.invMass)
  );
};

Particle.prototype.integrate = function (timesq) {
  const newPos = this.tmp.subVectors(this.position, this.previous);
  newPos.multiplyScalar(DRAG).add(this.position);
  newPos.add(this.acceleration.multiplyScalar(timesq));
  this.tmp.copy(this.previous);
  this.previous.copy(this.position);
  this.position.copy(newPos);
  this.acceleration.set(0, 0, 0);
};

function SatisfyConstraints(p1, p2, restDistance) {
  const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return;
  const correction = diff.multiplyScalar(1 - restDistance / currentDist);
  const correctionHalf = correction.multiplyScalar(0.5);
  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}

export default function DeformableSphere() {
  const meshRef = useRef();
  const { camera, mouse, size, scene } = useThree();

  const [particles, setParticles] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [draggedParticle, setDraggedParticle] = useState(null);

  const { nodes } = useLoader(GLTFLoader, "/model/shirt.glb"); 

  const mouse3d = useMemo(() => new THREE.Vector3(), []);
const tmpmouse = useMemo(() => new THREE.Vector3(), []);
const newPlane = useMemo(() => new THREE.Plane(), []);
const [psel, setPsel] = useState(null); // selected particle index
  const clickRef = useRef(false);   
  const { gl } = useThree(); 

  useEffect(() => {
    if (nodes && nodes.T_Shirt_male) {
      // Assuming the mesh is called 'ShirtMesh' in the GLB
      console.log("Loaded shirt mesh:", nodes.T_Shirt_male); // Debug log
    }
  }, [nodes]);

  const geometry = useMemo(() => {
    if(!nodes) return null
    return nodes.T_Shirt_male.geometry
  }, [nodes]);

  useEffect(() => {
    if(!geometry) return
    const verts = geometry.attributes.position.array;
    const _particles = [];
    const _constraints = [];

    for (let i = 0; i < verts.length; i += 3) {
      const x = verts[i], y = verts[i + 1], z = verts[i + 2];
      const p = new Particle(x, y, z, 0.1);
      _particles.push(p);
    }

    const index = geometry.index.array;

    for (let i = 0; i < index.length; i += 3) {
      const a = index[i];
      const b = index[i + 1];
      const c = index[i + 2];

      if (!_particles[a].adj.includes(b)) _particles[a].adj.push(b);
      if (!_particles[a].adj.includes(c)) _particles[a].adj.push(c);
      if (!_particles[b].adj.includes(a)) _particles[b].adj.push(a);
      if (!_particles[c].adj.includes(a)) _particles[c].adj.push(a);
    }

    for (let i = 0; i < _particles.length; i++) {
      for (let j = 0; j < _particles[i].adj.length; j++) {
        const neighbor = _particles[i].adj[j];
        _constraints.push([
          _particles[i],
          _particles[neighbor],
          _particles[i].original.distanceTo(_particles[neighbor].original)
        ]);
      }
    }

    setParticles(_particles);
    setConstraints(_constraints);
  }, [geometry]);

  // Handle mouse interaction
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const intersectionPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const domElement = gl.domElement;
    
    const onPointerDown = (event) => {
  clickRef.current = true; // mark click active this frame
  if (!meshRef.current || !particles.length) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(meshRef.current);
  if (intersects.length > 0) {
    const point = intersects[0].point;

    let closest = null;
    let minDist = Infinity;
    for (let i = 0; i < particles.length; i++) {
      const dist = particles[i].position.distanceTo(point);
      if (dist < minDist) {
        closest = i;
        minDist = dist;
      }
    }

    if (closest !== null) {
      setPsel(closest);
      setDraggedParticle(particles[closest]); // optional if you want to drag after select
    }
  }
};
    

    const onPointerUp = () => {
      setPsel(null);
      setDraggedParticle(null);
      clickRef.current = false;
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointerup', onPointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointerup', onPointerUp);
    };
  }, [mouse, camera, particles]);

  useFrame(() => {
  if (!particles.length || !meshRef.current) return;

  // --- Begin updateMouse ---
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(meshRef.current);
  mouse3d.set(0, 0, 0);

  if (intersects.length > 0) {
    mouse3d.copy(intersects[0].point);
  }

  // Handle particle selection on click
  if (psel === null && clickRef.current && !mouse3d.equals(new THREE.Vector3(0, 0, 0))) {
    let closestIdx = -1;
    let dist = Infinity;

    for (let i = 0; i < particles.length; i++) {
      const tmpDist = mouse3d.distanceTo(particles[i].position);
      if (tmpDist < dist) {
        dist = tmpDist;
        closestIdx = i;
      }
    }

    if (closestIdx !== -1) {
      setPsel(closestIdx);
      setDraggedParticle(particles[closestIdx]);

      for (let i = 0; i < particles.length; i++) {
        particles[i].distance = particles[closestIdx].original.distanceTo(particles[i].original);
      }
    }
  }

  newPlane.setFromNormalAndCoplanarPoint(camera.position.clone().normalize(), new THREE.Vector3(0, 0, 0));
  raycaster.ray.intersectPlane(newPlane, tmpmouse);
  if (tmpmouse) {
    mouse3d.copy(tmpmouse);
  }

  clickRef.current = false; // reset click flag
  // --- End updateMouse ---

  // Apply simulation logic
  if (draggedParticle) {
    draggedParticle.position.copy(mouse3d);
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p !== draggedParticle) {
      const force = new THREE.Vector3().copy(p.original).sub(p.position).multiplyScalar(PULL);
      p.addForce(force);
      p.integrate(TIMESTEP_SQ);
    }
  }

  for (let j = 0; j < 5; j++) {
    const reverse = j % 2 === 1;
    const iter = reverse ? [...constraints].reverse() : constraints;
    for (let i = 0; i < iter.length; i++) {
      const [p1, p2, d] = iter[i];
      SatisfyConstraints(p1, p2, d);
    }
  }

  const positionAttr = meshRef.current.geometry.attributes.position;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i].position;
    positionAttr.setXYZ(i, p.x, p.y, p.z);
  }

  positionAttr.needsUpdate = true;
  meshRef.current.geometry.computeVertexNormals();
});

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={0xaa2949}
        roughness={0.5}
        metalness={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}