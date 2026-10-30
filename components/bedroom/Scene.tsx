"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Suspense, lazy, useEffect, useMemo, useRef, type ComponentRef } from "react";
import { PerspectiveCamera, PCFShadowMap } from "three";
import { Box, Cylinder } from "./assets/primitives";
const Furniture = lazy(() => import("./assets/Furniture"));
const Decor = lazy(() => import("./assets/Decor"));
const Artwork = lazy(() => import("./assets/Artwork"));
const Bed = lazy(() => import("./assets/Bed"));
const Rug = lazy(() => import("./assets/Rug"));
import type { RoomState } from "@/lib/room/state";
import { colors } from "@/lib/assets/catalog";
function LoadingSignal({ onLoading }: { onLoading?: () => void }) {
  useEffect(() => onLoading?.(), [onLoading]);
  return null;
}
function ReadySignal({
  onReady,
  artwork,
}: {
  onReady?: () => void;
  artwork: string;
}) {
  useEffect(() => onReady?.(), [onReady, artwork]);
  return null;
}
function ViewControls({ resetKey }: { resetKey: number }) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = Math.min(55, Math.max(36, 46 / (size.width / size.height)));
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    const controls = ref.current;
    if (controls) {
      controls.target.set(0, 1, 0);
      controls.update();
      controls.saveState();
    }
  }, []);
  useEffect(() => {
    ref.current?.reset();
    invalidate();
  }, [resetKey, invalidate]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      target={[0, 1, 0]}
      minAzimuthAngle={0.25}
      maxAzimuthAngle={1.2}
      minPolarAngle={0.75}
      maxPolarAngle={1.3}
      minDistance={8}
      maxDistance={14}
      enablePan={false}
      enableDamping={false}
    />
  );
}

export function Shell({ room }: { room: RoomState }) {
  return (
    <group>
      <Box
        position={[0, -0.12, 0]}
        size={[6.4, 0.24, 5.6]}
        color={colors[room.floor]}
      />
      {room.floor !== "pale_concrete" &&
        Array.from({ length: 16 }, (_, i) => (
          <Box
            key={i}
            position={[-3.05 + i * 0.4, 0.008, 0]}
            size={[0.012, 0.009, 5.5]}
            color={room.floor === "walnut_planks" ? "#523e31" : "#ad956f"}
            round={0.002}
          />
        ))}
      <Box
        position={[0, 1.65, -2.8]}
        size={[6.4, 3.3, 0.14]}
        color={room.wallColor}
      />
      <Box
        position={[0, 0.96, -2.715]}
        size={[3.05, 1.7, 0.022]}
        color={room.accentColor}
        round={0.004}
      />
      <Box
        position={[-3.2, 1.65, -1.75]}
        size={[0.14, 3.3, 2.1]}
        color={room.wallColor}
      />
      <Box
        position={[-3.2, 0.5, 0.7]}
        size={[0.14, 1, 2.8]}
        color={room.wallColor}
      />
      <Box
        position={[-3.2, 3.05, 0.7]}
        size={[0.14, 0.5, 2.8]}
        color={room.wallColor}
      />
      <Box
        position={[-3.2, 1.85, 2.05]}
        size={[0.14, 2.3, 0.14]}
        color={room.wallColor}
      />
      <Box
        position={[-3.19, 1.9, 0.65]}
        size={[0.06, 0.07, 2.7]}
        color="#eeeadd"
      />
      <Box
        position={[-3.19, 1.95, 0.65]}
        size={[0.06, 1.95, 0.06]}
        color="#eeeadd"
      />
      <Box
        position={[0, 0.1, -2.69]}
        size={[6.25, 0.12, 0.06]}
        color="#f0eadc"
      />
      <Box
        position={[2.55, 1.13, -2.69]}
        size={[0.78, 2.26, 0.06]}
        color="#d4cdbc"
      />
      <Cylinder
        position={[2.26, 1.1, -2.62]}
        radius={0.025}
        height={0.04}
        color="#62553d"
      />
      <Bed room={room} />
      {room.rug !== "none" && <Rug room={room} />}
      <Furniture room={room} />
      {Object.values(room.decor).some(Boolean) && <Decor room={room} />}
      {room.artwork !== "none" && <Artwork room={room} />}
      <Box
        position={[-2.15, 2.3, -2.58]}
        size={[1.05, 0.06, 0.35]}
        color={colors[room.bedFrame]}
      />
    </group>
  );
}
export default function Scene({
  room,
  resetKey = 0,
  onReady,
  onLoading,
}: {
  room: RoomState;
  resetKey?: number;
  onReady?: () => void;
  onLoading?: () => void;
}) {
  const warm = useMemo(() => {
    // Continuous blackbody approximation across the validated 2200–6500 K range.
    // Bucketed tints made common 3200→2800 K refinements visually identical.
    const temperature = room.lightingTemperature / 100;
    const green = Math.round(Math.max(0, Math.min(255, 99.4708025861 * Math.log(temperature) - 161.1195681661)));
    const blue = Math.round(Math.max(0, Math.min(255, 138.5177312231 * Math.log(temperature - 10) - 305.0447927307)));
    return "#" + ((255 << 16) | (green << 8) | blue).toString(16).padStart(6, "0");
  }, [room.lightingTemperature]);
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: [7.7, 6.4, 8.4], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      frameloop="demand"
      aria-label="Interactive fixed bedroom"
    >
      <color attach="background" args={["#e4e4d8"]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#fff4de", "#9a9f87", 1.2]} />
      <directionalLight
        position={[-3, 6, 4]}
        intensity={2.3}
        color={warm}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight
        position={[0, 2, -1]}
        color={warm}
        intensity={room.lightingIntensity * 8}
        distance={8}
      />
      <Suspense fallback={<LoadingSignal onLoading={onLoading} />}>
        <Shell room={room} />
        <ReadySignal onReady={onReady} artwork={room.artwork} />
        <ContactShadows
          key={JSON.stringify(room)}
          position={[0, -0.25, 0]}
          opacity={0.3}
          scale={12}
          blur={2.5}
          far={5}
          frames={1}
        />
      </Suspense>
      <ViewControls resetKey={resetKey} />
    </Canvas>
  );
}
