import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "motion/react";

export interface Hotspot {
  id: string;
  label: string;
  to: string;
  position: [number, number, number];
}

const GOLD = "#D4AF37";
const GOLD_SOFT = "#F5D76E";

/* ---------------- building blocks ---------------- */

function WindowGrid({
  rows,
  cols,
  width,
  height,
  z,
  seed,
}: {
  rows: number;
  cols: number;
  width: number;
  height: number;
  z: number;
  seed: number;
}) {
  const group = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const cells = useMemo(() => {
    const out: { x: number; y: number; phase: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: (c - (cols - 1) / 2) * (width / cols),
          y: (r - (rows - 1) / 2) * (height / rows),
          phase: ((r * 7 + c * 13 + seed * 5) % 20) / 3,
        });
      }
    }
    return out;
  }, [rows, cols, width, height, seed]);

  useFrame(({ clock }) => {
    if (!group.current || reduced) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const wave = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.7 + cells[i].phase));
      mat.emissiveIntensity = wave * 2.2;
      mat.opacity = 0.35 + wave * 0.5;
    });
  });

  return (
    <group ref={group} position={[0, 0, z]}>
      {cells.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, 0]}>
          <planeGeometry args={[(width / cols) * 0.45, (height / rows) * 0.3]} />
          <meshStandardMaterial
            color={GOLD_SOFT}
            emissive={GOLD_SOFT}
            emissiveIntensity={1.4}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Tower({
  position,
  width,
  height,
  depth = width,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  depth?: number;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#121212" metalness={0.92} roughness={0.32} />
      </mesh>
      <mesh>
        <boxGeometry args={[width * 1.005, height * 1.005, depth * 1.005]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.14} />
      </mesh>
      {/* gold banding */}
      <mesh position={[0, height * 0.36, 0]}>
        <boxGeometry args={[width * 1.06, height * 0.035, depth * 1.06]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.7} metalness={1} roughness={0.2} />
      </mesh>
      <WindowGrid rows={Math.max(3, Math.round(height * 1.6))} cols={3} width={width * 0.8} height={height * 0.82} z={depth / 2 + 0.01} seed={width * 10} />
      <WindowGrid rows={Math.max(3, Math.round(height * 1.6))} cols={3} width={width * 0.8} height={height * 0.82} z={-depth / 2 - 0.01} seed={height * 7} />
    </group>
  );
}

function Antenna({ position, height }: { position: [number, number, number]; height: number }) {
  const tip = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();
  useFrame(({ clock }) => {
    if (!tip.current || reduced) return;
    const mat = tip.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.35 + 0.65 * Math.abs(Math.sin(clock.elapsedTime * 2.2));
  });
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.035, height, 6]} />
        <meshStandardMaterial color="#2A2A2A" metalness={1} roughness={0.35} />
      </mesh>
      <mesh ref={tip} position={[0, height, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#FF6B4A" transparent opacity={0.9} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Beacon() {
  const pivot = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  useFrame((_, delta) => {
    if (pivot.current && !reduced) pivot.current.rotation.y += delta * 1.1;
  });
  return (
    <group position={[0, 3.62, 0]}>
      <mesh>
        <sphereGeometry args={[0.16, 18, 18]} />
        <meshBasicMaterial color={GOLD_SOFT} toneMapped={false} />
      </mesh>
      <pointLight color={GOLD_SOFT} intensity={12} distance={9} />
      <group ref={pivot}>
        {/* rotating light sweep — a long, soft cone reads as a volumetric beam */}
        <mesh rotation={[0, 0, Math.PI / 2.35]} position={[1.7, 0.25, 0]}>
          <coneGeometry args={[0.5, 4.2, 24, 1, true]} />
          <meshBasicMaterial
            color={GOLD_SOFT}
            transparent
            opacity={0.09}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function Hangar() {
  return (
    <group position={[3.15, -0.45, 0.9]} rotation={[0, -0.35, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 2.6, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#141414" metalness={0.9} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.31, -0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.25, 0.85]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD_SOFT} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[2.62, 0.05, 0.12]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.6} metalness={1} />
      </mesh>
    </group>
  );
}

function CommandCenter() {
  return (
    <group position={[-3.05, -0.35, 1.0]}>
      <mesh>
        <cylinderGeometry args={[1.05, 1.25, 1.0, 8]} />
        <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.92, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#0E0E0E"
          metalness={0.7}
          roughness={0.15}
          emissive={GOLD}
          emissiveIntensity={0.28}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.94, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.22} />
      </mesh>
      <WindowGrid rows={1} cols={6} width={1.9} height={0.4} z={1.06} seed={3} />
    </group>
  );
}

function GroundPlatform() {
  const rings = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  useFrame((_, delta) => {
    if (rings.current && !reduced) rings.current.rotation.z += delta * 0.06;
  });
  return (
    <group position={[0, -1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[9, 72]} />
        <meshStandardMaterial color="#070707" metalness={0.85} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[5.4, 64]} />
        <meshStandardMaterial color="#0C0C0C" metalness={0.95} roughness={0.22} />
      </mesh>
      <group ref={rings} position={[0, 0, 0.012]}>
        {[2.6, 3.5, 4.4, 5.2].map((r, i) => (
          <mesh key={r}>
            <ringGeometry args={[r, r + (i % 2 ? 0.018 : 0.045), 96]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.13 + i * 0.05} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Animated ground fog: stacked additive planes drifting at different speeds. */
function GroundFog() {
  const group = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const layers = useMemo(() => [0, 1, 2, 3].map((i) => ({ y: -0.95 + i * 0.16, s: 0.05 + i * 0.03, r: i * 0.8 })), []);
  useFrame(({ clock }) => {
    if (!group.current || reduced) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      child.rotation.z = layers[i].r + t * layers[i].s;
      child.position.y = layers[i].y + Math.sin(t * 0.3 + i) * 0.04;
    });
  });
  return (
    <group ref={group}>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.y, 0]} rotation={[-Math.PI / 2, 0, l.r]}>
          <circleGeometry args={[8 - i * 0.7, 48]} />
          <meshBasicMaterial
            color={i % 2 ? GOLD : "#6B5713"}
            transparent
            opacity={0.055}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Slow drifting cloud bands high in the sky. */
function Clouds() {
  const group = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const bands = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: -10 + i * 3.4,
        y: 5.5 + (i % 3) * 1.4,
        z: -9 - (i % 4) * 2.2,
        w: 7 + (i % 3) * 3,
        h: 1.6 + (i % 2) * 0.8,
        speed: 0.06 + (i % 4) * 0.02,
        opacity: 0.045 + (i % 3) * 0.018,
      })),
    [],
  );
  useFrame((_, delta) => {
    if (!group.current || reduced) return;
    group.current.children.forEach((child, i) => {
      child.position.x += delta * bands[i].speed;
      if (child.position.x > 16) child.position.x = -16;
    });
  });
  return (
    <group ref={group}>
      {bands.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial
            color={i % 2 ? GOLD : "#3A3226"}
            transparent
            opacity={b.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Floating gold motes inside the scene. */
function Motes() {
  const points = useRef<THREE.Points>(null);
  const reduced = useReducedMotion();
  const geometry = useMemo(() => {
    const count = 260;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 7;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = -1 + Math.random() * 7;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (!points.current || reduced) return;
    points.current.rotation.y += delta * 0.03;
    const attr = points.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 1; i < attr.array.length; i += 3) {
      (attr.array as Float32Array)[i] += delta * 0.18;
      if ((attr.array as Float32Array)[i] > 6.5) (attr.array as Float32Array)[i] = -1;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.045}
        color={GOLD_SOFT}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* ---------------- holographic hotspots ---------------- */

function HoloLink({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const object = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from),
      new THREE.Vector3(...to),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(GOLD),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geom, mat);
  }, [from, to]);
  return <primitive object={object} />;
}

function HotspotNode({ spot }: { spot: Hotspot }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const ring = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const pulse = reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 1.8) * 0.07;
    const scale = pulse * (hovered ? 1.35 : 1);
    ring.current.scale.setScalar(scale);
    if (!reduced) ring.current.rotation.z += 0.004;
  });

  return (
    <group position={spot.position}>
      <group ref={ring}>
        <mesh>
          <ringGeometry args={[0.2, 0.235, 48]} />
          <meshBasicMaterial color={GOLD_SOFT} transparent opacity={hovered ? 0.95 : 0.6} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.3, 0.315, 48]} />
          <meshBasicMaterial color={GOLD} transparent opacity={hovered ? 0.7 : 0.3} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.2, 32]} />
          <meshBasicMaterial color={GOLD} transparent opacity={hovered ? 0.3 : 0.12} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <pointLight color={GOLD_SOFT} intensity={hovered ? 4 : 1.6} distance={2.6} />
      <Html center distanceFactor={9} zIndexRange={[20, 0]}>
        <button
          type="button"
          onClick={() => navigate(spot.to)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          data-testid={`hq-hotspot-${spot.id}`}
          className="holo-node"
        >
          {spot.label}
        </button>
      </Html>
    </group>
  );
}

/* ---------------- camera ---------------- */

const CAM_TARGET = new THREE.Vector3(0, 2.1, 10.4);

function CameraRig() {
  const { camera } = useThree();
  const reduced = useReducedMotion();
  const flyIn = useRef(0);

  useFrame(({ clock }, delta) => {
    // Fly-in: ease from a distant high shot to the resting frame.
    if (flyIn.current < 1) {
      flyIn.current = Math.min(1, flyIn.current + delta / (reduced ? 0.001 : 2.4));
      const e = 1 - Math.pow(1 - flyIn.current, 3);
      camera.position.set(
        THREE.MathUtils.lerp(0, CAM_TARGET.x, e),
        THREE.MathUtils.lerp(9.5, CAM_TARGET.y, e),
        THREE.MathUtils.lerp(26, CAM_TARGET.z, e),
      );
    } else if (!reduced) {
      // Camera breathing — a slow vertical sway once settled.
      camera.position.y += Math.sin(clock.elapsedTime * 0.45) * delta * 0.16;
    }
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

/* ---------------- scene ---------------- */

export function HQScene({ hotspots }: { hotspots: Hotspot[] }) {
  const reduced = useReducedMotion();

  const links = useMemo(() => {
    const out: { from: [number, number, number]; to: [number, number, number] }[] = [];
    for (let i = 0; i < hotspots.length; i++) {
      out.push({ from: hotspots[i].position, to: hotspots[(i + 1) % hotspots.length].position });
      out.push({ from: hotspots[i].position, to: [0, 1.4, 0] });
    }
    return out;
  }, [hotspots]);

  return (
    <div className="h-[460px] w-full sm:h-[620px]" data-testid="hq-3d-scene">
      <Canvas camera={{ position: [0, 9.5, 26], fov: 44 }} dpr={[1, 1.7]}>
        <color attach="background" args={["#050505"]} />
        <fog attach="fog" args={["#050505", 11, 30]} />

        <ambientLight intensity={0.22} />
        <hemisphereLight args={["#3A2F12", "#050505", 0.5]} />
        <spotLight position={[7, 12, 7]} angle={0.55} penumbra={1} intensity={220} color={GOLD_SOFT} castShadow />
        <spotLight position={[-8, 7, -5]} angle={0.7} penumbra={1} intensity={90} color={GOLD} />
        <pointLight position={[0, 1.5, 6]} intensity={25} color={GOLD} distance={16} />

        <Suspense fallback={null}>
          <GroundPlatform />
          <GroundFog />

          {/* Modular headquarters */}
          <group>
            <Tower position={[0, 0.7, 0]} width={1.5} height={3.4} />
            <Tower position={[-1.45, 0.05, -0.35]} width={0.95} height={2.1} />
            <Tower position={[1.5, -0.1, -0.5]} width={1.05} height={1.8} />
            <Tower position={[-0.6, -0.42, 1.35]} width={0.8} height={1.15} depth={0.8} />
            {/* crown */}
            <mesh position={[0, 2.62, 0]}>
              <cylinderGeometry args={[1.22, 0.86, 0.46, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.55} metalness={1} roughness={0.22} />
            </mesh>
            <mesh position={[0, 3.16, 0]}>
              <coneGeometry args={[0.62, 0.9, 8]} />
              <meshStandardMaterial color="#1A1A1A" emissive={GOLD_SOFT} emissiveIntensity={0.35} metalness={1} roughness={0.25} />
            </mesh>
            <Beacon />
            <Antenna position={[-1.45, 1.1, -0.35]} height={1.5} />
            <Antenna position={[1.5, 0.8, -0.5]} height={1.15} />
            <CommandCenter />
            <Hangar />
          </group>

          {links.map((l, i) => (
            <HoloLink key={i} from={l.from} to={l.to} />
          ))}
          {hotspots.map((s) => (
            <HotspotNode key={s.id} spot={s} />
          ))}

          <Motes />
          <Clouds />
          <Stars radius={60} depth={40} count={1600} factor={4} fade speed={reduced ? 0 : 0.8} />
        </Suspense>

        <CameraRig />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          target={[0, 1.1, 0]}
        />
      </Canvas>
    </div>
  );
}
