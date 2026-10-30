import type { RoomState } from "@/lib/room/state";
import { anchorFor } from "@/lib/room/anchors";
import { colors } from "@/lib/assets/catalog";
import { Box, Cylinder, Ball } from "./primitives";
export default function Seating({ room }: { room: RoomState }) {
  const id = room.chair, anchor = anchorFor(room, "chair"), color = colors[id];
  if (id === "none") return null;
  return <group position={[anchor.x, 0, anchor.z]} rotation={[0, anchor.rotation, 0]}>
    {id === "beanbag" ? <>
      <group position={[0, 0.3, 0]} scale={[1, 0.65, 1]}><Ball position={[0, 0, 0]} radius={0.47} color={color} /></group>
      <group position={[0, 0.5, -0.19]} scale={[1, 1.1, 0.65]} rotation={[-0.22, 0, 0]}><Ball position={[0, 0, 0]} radius={0.34} color={color} /></group>
      <Box position={[0, 0.13, 0.35]} size={[0.15, 0.035, 0.08]} color="#eee0bb" />
    </> : id === "ottoman" ? <>
      <Cylinder position={[0, 0.24, 0]} radius={0.4} height={0.43} color={color} />
      <Cylinder position={[0, 0.45, 0]} radius={0.42} height={0.09} color={color} />
      <Cylinder position={[0, 0.035, 0]} radius={0.31} height={0.07} color="#624331" />
    </> : id === "bench" ? <>
      <Box position={[0, 0.49, 0]} size={[1.24, 0.12, 0.5]} color={color} round={0.05} />
      {[-0.48, 0.48].map((x) => <Box key={x} position={[x, 0.24, 0]} size={[0.09, 0.48, 0.4]} color={colors[room.bedFrame]} />)}
      {[-0.42, -0.14, 0.14, 0.42].map((x) => <Box key={x} position={[x, 0.556, 0]} size={[0.012, 0.008, 0.44]} color="#624331" round={0.002} />)}
    </> : id === "colorful_sculptural" ? <>
      <Cylinder position={[0, 0.25, 0]} radius={0.18} height={0.5} color={color} />
      <group scale={[1, 0.35, 1]}><Ball position={[0, 1.45, 0]} radius={0.43} color={color} /></group>
      <group position={[0, 0.9, -0.25]} scale={[1, 1, 0.4]}><Ball position={[0, 0, 0]} radius={0.42} color={color} /></group>
    </> : <>
      <Box position={[0, 0.48, 0]} size={[0.85, id === "upholstered_low" ? 0.3 : 0.13, 0.85]} color={color} round={id === "upholstered_low" ? 0.13 : 0.03} />
      <group rotation={[-0.15, 0, 0]}><Box position={[0, 0.9, -0.31]} size={[0.85, 0.72, id === "upholstered_low" ? 0.25 : 0.1]} color={color} round={id === "upholstered_low" ? 0.12 : 0.02} /></group>
      {[-0.34, 0.34].flatMap((x) => [-0.3, 0.3].map((z) => <Cylinder key={`${x}:${z}`} position={[x, 0.22, z]} radius={id === "metal_modern" ? 0.025 : 0.045} height={0.44} color={id === "metal_modern" ? "#aab5b9" : "#73583b"} metalness={id === "metal_modern" ? 0.8 : 0} />))}
      {id === "upholstered_low" && [-0.43, 0.43].map((x) => <Box key={x} position={[x, 0.64, 0]} size={[0.14, 0.3, 0.8]} color={color} round={0.06} />)}
      {id === "wood_lounge" && [-0.42, 0.42].map((x) => <Box key={x} position={[x, 0.68, 0]} size={[0.075, 0.07, 0.8]} color={color} />)}
      {id === "metal_modern" && [-0.43, 0.43].map((x) => <Box key={x} position={[x, 0.24, 0]} size={[0.035, 0.035, 0.85]} color="#aab5b9" metalness={0.8} />)}
    </>}
  </group>;
}
