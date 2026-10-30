import type { RoomState } from "@/lib/room/state";
import { anchorFor, bedsideAnchor, isWallLamp, nightstandHeight } from "@/lib/room/anchors";
import { Box, Cylinder, Ball } from "./primitives";
function TableLight({ id }: { id: RoomState["tableLamp"] }) {
  const chrome = id === "chrome_mushroom" || id === "industrial_metal" || id === "directional";
  const color = chrome ? "#aab5b9" : id === "playful_color" ? "#c65b3d" : id === "ceramic_dome" ? "#89957b" : "#eee0bb";
  if (id === "none") return null;
  if (id === "wall_sconce") return <>
    <Box position={[0, 1.4, -0.79]} size={[0.15, 0.4, 0.07]} color="#62553d" metalness={0.65} />
    <Box position={[0, 1.38, -0.65]} size={[0.06, 0.06, 0.26]} color="#62553d" metalness={0.65} />
    <Ball position={[0, 1.4, -0.52]} radius={0.16} color="#eee0bb" />
  </>;
  if (id === "pendant") return <>
    <Cylinder position={[0, 3.25, 0]} radius={0.08} height={0.05} color="#515650" />
    <Cylinder position={[0, 2.45, 0]} radius={0.013} height={1.6} color="#515650" />
    <Cylinder position={[0, 1.55, 0]} radius={0.23} top={0.06} height={0.28} color={color} />
    <Ball position={[0, 1.43, 0]} radius={0.08} color="#eee0bb" />
  </>;
  return <>
    <Cylinder position={[0, 0.025, 0]} radius={0.14} height={0.05} color={color} metalness={chrome ? 0.8 : 0} />
    {id === "paper_lantern" ? <>
      <group position={[0, 0.3, 0]} scale={[1, 1.3, 1]}><Ball position={[0, 0, 0]} radius={0.21} color={color} /></group>
      {[0.12, 0.21, 0.3, 0.39, 0.48].map((y) => <Cylinder key={y} position={[0, y, 0]} radius={0.21 * Math.sqrt(Math.max(0.1, 1 - ((y - 0.3) / 0.28) ** 2))} height={0.009} color="#ded5ba" />)}
    </> : id === "globe" ? <>
      <Cylinder position={[0, 0.1, 0]} radius={0.05} height={0.2} color="#62553d" />
      <Ball position={[0, 0.3, 0]} radius={0.2} color={color} />
    </> : id === "chrome_mushroom" ? <>
      <Cylinder position={[0, 0.22, 0]} radius={0.045} height={0.4} color={color} metalness={0.8} />
      <group position={[0, 0.4, 0]} scale={[1, 0.45, 1]}><Ball position={[0, 0, 0]} radius={0.27} color={color} metalness={0.8} /></group>
    </> : id === "directional" || id === "industrial_metal" ? <>
      <group rotation={[0, 0, -0.25]}><Cylinder position={[0, 0.2, 0]} radius={0.025} height={0.4} color={color} metalness={0.8} /></group>
      <group position={[0.12, 0.42, 0]} rotation={[0, 0, -0.7]}><Cylinder position={[0, 0, 0]} radius={0.15} top={0.07} height={0.19} color={color} metalness={0.8} /></group>
    </> : id === "bedside" ? <>
      <Ball position={[0, 0.14, 0]} radius={0.11} color="#b99c65" />
      <Cylinder position={[0, 0.35, 0]} radius={0.23} top={0.14} height={0.25} color="#eee0bb" />
    </> : <>
      <Cylinder position={[0, 0.16, 0]} radius={id === "ceramic_dome" ? 0.1 : 0.035} top={0.06} height={0.3} color={color} />
      <Cylinder position={[0, 0.37, 0]} radius={0.25} top={id === "ceramic_dome" ? 0.05 : 0.18} height={0.18} color={color} />
    </>}
  </>;
}
export default function Lights({ room }: { room: RoomState }) {
  const anchor = anchorFor(room, "floorLamp");
  return <>
    {(["left", "right"] as const).map((side) => {
      const id = side === "left" ? room.nightstandLeft : room.nightstandRight;
      if (room.tableLamp === "none" || (id === "none" && !isWallLamp(room.tableLamp))) return null;
      const attached = bedsideAnchor(room, side);
      return <group key={side} position={[attached.x - (side === "right" ? (id === "compact" ? 0.06 : 0.12) : 0), isWallLamp(room.tableLamp) ? 0 : nightstandHeight(id), attached.z - 0.08]}><TableLight id={room.tableLamp} /></group>;
    })}
    {room.floorLamp !== "none" && <group position={[anchor.x, 0, anchor.z]} rotation={[0, anchor.rotation, 0]}>
      <Cylinder position={[0, 0.04, 0]} radius={0.28} height={0.08} color="#515650" />
      <Cylinder position={[0, 0.9, 0]} radius={0.025} height={1.8} color="#686c61" metalness={0.5} />
      {room.floorLamp === "sculptural_paper" ? <>
        <Cylinder position={[0, 1.35, 0]} radius={0.26} top={0.18} height={1.05} color="#eee0bb" />
        {[0.9, 1.1, 1.3, 1.5, 1.7, 1.85].map((y) => <Cylinder key={y} position={[0, y, 0]} radius={0.26 - (y - 0.825) * 0.075} height={0.012} color="#ded5ba" />)}
      </> : room.floorLamp === "soft_globe" ? <Ball position={[0, 1.85, 0]} radius={0.28} color="#eee0bb" /> : room.floorLamp === "arc" ? <>
        <mesh position={[0.4, 1.8, 0]} castShadow><torusGeometry args={[0.4, 0.025, 8, 24, Math.PI]} /><meshStandardMaterial color="#686c61" metalness={0.5} roughness={0.4} /></mesh>
        <Cylinder position={[0.8, 1.7, 0]} radius={0.22} top={0.1} height={0.2} color="#ded5ba" />
      </> : <>
        <Box position={[0.07, 1.83, 0]} size={[0.2, 0.04, 0.06]} color="#515650" />
        <group position={[0.13, 1.77, 0]} rotation={[0, 0, -0.4]}><Cylinder position={[0, 0, 0]} radius={0.14} top={0.06} height={0.19} color="#ded5ba" /></group>
      </>}
    </group>}
  </>;
}
