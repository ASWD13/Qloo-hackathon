import { lazy } from "react";
import type { RoomState } from "@/lib/room/state";
import { colors } from "@/lib/assets/catalog";
import { bedsideAnchor, nightstandHeight } from "@/lib/room/anchors";
import { Box, Cylinder, Ball } from "./primitives";
const Seating = lazy(() => import("./Seating"));
const Storage = lazy(() => import("./Storage"));
const Lights = lazy(() => import("./Lights"));
export default function Furniture({ room }: { room: RoomState }) {
  return <group>
    {(["left", "right"] as const).map((side) => {
      const id = side === "left" ? room.nightstandLeft : room.nightstandRight;
      if (id === "none") return null;
      const anchor = bedsideAnchor(room, side), color = colors[id], height = nightstandHeight(id);
      return <group key={side} position={[anchor.x, 0, anchor.z]}>
        {id === "floating_shelf" ? <>
          <Box position={[0, height - 0.035, 0]} size={[0.65, 0.07, 0.65]} color={color} />
          <Box position={[0, height - 0.14, -0.3]} size={[0.5, 0.22, 0.04]} color={color} />
          <Box position={[0, height - 0.035, -0.56]} size={[0.65, 0.07, 0.5]} color={color} />
        </> : id === "brushed_steel" ? <>
          {[0.12, height - 0.03].map((y) => <Box key={y} position={[0, y, 0]} size={[0.65, 0.04, 0.65]} color={color} metalness={0.8} />)}
          {[-0.29, 0.29].flatMap((x) => [-0.29, 0.29].map((z) => <Cylinder key={`${x}:${z}`} position={[x, height / 2, z]} radius={0.018} height={height} color={color} metalness={0.8} />))}
        </> : id === "sculptural_stone" ? <>
          <Cylinder position={[0, 0.2, 0]} radius={0.23} top={0.15} height={0.4} color={color} />
          <group position={[0, 0.5, 0]} scale={[1, 0.7, 1]}><Ball position={[0, 0, 0]} radius={0.27} color={color} /></group>
          <Cylinder position={[0, 0.77, 0]} radius={0.32} height={0.06} color={color} />
        </> : id === "rounded_color" ? <>
          <Cylinder position={[0, 0.36, 0]} radius={0.24} top={0.29} height={0.72} color={color} />
          <Cylinder position={[0, 0.76, 0]} radius={0.325} height={0.08} color={color} />
        </> : id === "compact" ? <>
          <Box position={[0, height - 0.035, 0]} size={[0.48, 0.07, 0.56]} color={color} />
          {[-0.17, 0.17].map((x) => <Box key={x} position={[x, 0.29, 0]} size={[0.055, 0.58, 0.4]} color={color} />)}
        </> : id === "minimal_oak" ? <>
          <Box position={[0, height - 0.04, 0]} size={[0.65, 0.08, 0.65]} color={color} />
          {[-0.28, 0.28].map((x) => <Box key={x} position={[x, height / 2 - 0.02, 0]} size={[0.07, height - 0.08, 0.58]} color={color} />)}
          <Box position={[0, 0.22, 0]} size={[0.57, 0.055, 0.56]} color={color} />
        </> : <>
          <Box position={[0, height / 2, 0]} size={[0.65, height, 0.65]} color={color} round={0.025} />
          {id === "drawer" && [0.25, 0.56].map((y) => <group key={y}><Box position={[0, y, 0.33]} size={[0.58, 0.27, 0.025]} color={color} /><Box position={[0, y + 0.07, 0.35]} size={[0.23, 0.025, 0.025]} color="#62553d" /></group>)}
        </>}
      </group>;
    })}
      {room.chair !== "none" && <Seating room={room} />}
      {(room.storage !== "none" || room.secondary !== "none") && <Storage room={room} />}
      {(room.tableLamp !== "none" || room.floorLamp !== "none") && <Lights room={room} />}
  </group>;
}
