import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, SphereGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { colors } from "@/lib/assets/catalog";
import { useEffect, useMemo } from "react";
export type V3 = [number, number, number];
const box = new BoxGeometry(1, 1, 1);
const sphere = new SphereGeometry(1, 24, 16);
const rounded = new Map<string, RoundedBoxGeometry>();
const cylinders = new Map<number, CylinderGeometry>();
const materials = new Map<string, MeshStandardMaterial>();
const fixedColors = new Set([...Object.values(colors), "#eee0bb", "#aab5b9", "#73583b", "#515650", "#686c61", "#ded5ba", "#f3edde", "#473d30", "#eeeadd", "#62553d"]);
function useSurface(color: string, metalness: number) {
  const pooled = fixedColors.has(color);
  const material = useMemo(() => {
    if (!pooled) return new MeshStandardMaterial({ color, metalness, roughness: metalness ? 0.3 : 0.85 });
    const key = `${color}:${metalness}`;
    let shared = materials.get(key);
    if (!shared) { shared = new MeshStandardMaterial({ color, metalness, roughness: metalness ? 0.3 : 0.85 }); materials.set(key, shared); }
    return shared;
  }, [color, metalness, pooled]);
  useEffect(() => () => { if (!pooled) material.dispose(); }, [material, pooled]);
  return material;
}
export function Box({ position, size, color, round = 0.025, metalness = 0 }: { position: V3; size: V3; color: string; round?: number; metalness?: number }) {
  const radius = Math.min(round, size[0] / 2, size[1] / 2, size[2] / 2);
  let geometry = box;
  if (radius > 0.005) {
    const key = `${size.join(":")}:${radius}`;
    let cached = rounded.get(key);
    if (!cached) { cached = new RoundedBoxGeometry(...size, 2, radius); rounded.set(key, cached); }
    geometry = cached;
  }
  const material = useSurface(color, metalness);
  return <mesh position={position} scale={radius > 0.005 ? undefined : size} geometry={geometry} material={material} castShadow receiveShadow dispose={null} />;
}
export function Cylinder({ position, radius, height, color, top, metalness = 0 }: { position: V3; radius: number; height: number; color: string; top?: number; metalness?: number }) {
  const ratio = (top ?? radius) / radius;
  let geometry = cylinders.get(ratio);
  if (!geometry) { geometry = new CylinderGeometry(ratio, 1, 1, 24); cylinders.set(ratio, geometry); }
  const material = useSurface(color, metalness);
  return <mesh position={position} scale={[radius, height, radius]} geometry={geometry} material={material} castShadow receiveShadow dispose={null} />;
}
export function Ball({ position, radius, color, metalness = 0 }: { position: V3; radius: number; color: string; metalness?: number }) {
  const material = useSurface(color, metalness);
  return <mesh position={position} scale={radius} geometry={sphere} material={material} castShadow dispose={null} />;
}
