import type { RoomState } from "@/lib/room/state";
import { anchorFor } from "@/lib/room/anchors";
import { colors } from "@/lib/assets/catalog";
import { Box, Cylinder } from "./primitives";
export default function Storage({ room }: { room: RoomState }) {
  const storage = anchorFor(room, "storage"), desk = anchorFor(room, "desk"), color = colors[room.bedFrame];
  return <>
    {room.storage !== "none" && <group position={[storage.x, 0, storage.z]} rotation={[0, storage.rotation, 0]}>
      {room.storage === "open_shelf" && <>
        {[-0.42, 0.42].map((x) => <Box key={x} position={[x, 0.91, 0]} size={[0.055, 1.82, 0.5]} color={color} />)}
        {[0.12, 0.55, 0.98, 1.41, 1.82].map((y) => <Box key={y} position={[0, y, 0]} size={[0.9, 0.055, 0.5]} color={color} />)}
        {[0.2, 0.63, 1.06].map((y, i) => <Box key={y} position={[i % 2 ? 0.2 : -0.18, y, 0]} size={[0.3, 0.11, 0.32]} color={i % 2 ? "#89957b" : "#bb644b"} />)}
      </>}
      {room.storage === "dresser" && <>
        <Box position={[0, 0.63, 0]} size={[0.9, 1.2, 0.55]} color={color} />
        {[0.25, 0.6, 0.95].map((y) => <group key={y}><Box position={[0, y, 0.282]} size={[0.81, 0.31, 0.018]} color={color} /><Box position={[0, y + 0.06, 0.3]} size={[0.25, 0.025, 0.03]} color="#aab5b9" metalness={0.7} /></group>)}
      </>}
      {room.storage === "low_cabinet" && <>
        <Box position={[0, 0.39, 0]} size={[0.9, 0.64, 0.55]} color={color} />
        {[-0.22, 0.22].map((x) => <group key={x}><Box position={[x, 0.39, 0.287]} size={[0.41, 0.57, 0.025]} color={color} /><Cylinder position={[x * 0.25, 0.4, 0.32]} radius={0.023} height={0.05} color="#62553d" /></group>)}
        {[-0.34, 0.34].map((x) => <Box key={x} position={[x, 0.05, 0]} size={[0.08, 0.1, 0.4]} color={color} />)}
      </>}
      {room.storage === "wall_shelf" && <>
        {[1.15, 1.65, 2.15].map((y) => <group key={y}><Box position={[0, y, 0]} size={[0.9, 0.06, 0.42]} color={color} /><Box position={[0, y - 0.08, -0.3]} size={[0.55, 0.12, 0.24]} color="#515650" /></group>)}
      </>}
      {room.storage === "clothing_rail" && <>
        {[-0.45, 0.45].map((x) => <group key={x}><Cylinder position={[x, 0.9, 0]} radius={0.025} height={1.8} color="#aab5b9" metalness={0.8} /><Box position={[x, 0.025, 0]} size={[0.07, 0.05, 0.55]} color="#aab5b9" metalness={0.8} /></group>)}
        <Box position={[0, 1.8, 0]} size={[0.95, 0.05, 0.05]} color="#aab5b9" metalness={0.8} />
        {[-0.28, 0, 0.28].map((x, i) => <Box key={x} position={[x, 1.23, 0]} size={[0.19, 0.85, 0.38]} color={["#e8e0cb", "#89957b", "#424b4c"][i]} round={0.035} />)}
      </>}
    </group>}
    {room.secondary !== "none" && <group position={[desk.x, 0, desk.z]} rotation={[0, desk.rotation, 0]}>
      {room.secondary === "side_table" ? <>
        <Cylinder position={[0, 0.64, 0]} radius={0.27} height={0.065} color={color} />
        <Cylinder position={[0, 0.32, 0]} radius={0.04} height={0.64} color="#aab5b9" metalness={0.7} />
        <Cylinder position={[0, 0.035, 0]} radius={0.2} height={0.07} color="#aab5b9" metalness={0.7} />
      </> : <>
        <Box position={[0, room.secondary === "bench" ? 0.45 : 0.86, 0]} size={[1.45, 0.09, room.secondary === "bench" ? 0.45 : 0.65]} color={color} round={0.025} />
        {[-0.6, 0.6].flatMap((x) => [-0.2, 0.2].map((z) => <Box key={`${x}:${z}`} position={[x, room.secondary === "bench" ? 0.22 : 0.42, z]} size={[0.065, room.secondary === "bench" ? 0.44 : 0.84, 0.065]} color={color} />))}
        {room.secondary === "desk" && <>
          <Box position={[0.37, 0.65, 0]} size={[0.5, 0.28, 0.55]} color={color} />
          <Box position={[-0.25, 0.92, 0]} size={[0.4, 0.035, 0.28]} color="#89957b" />
          <Box position={[0.37, 0.66, 0.29]} size={[0.2, 0.025, 0.025]} color="#62553d" />
        </>}
        {room.secondary === "console" && <Box position={[0, 0.3, 0]} size={[1.3, 0.06, 0.5]} color={color} />}
        {room.secondary === "bench" && <Box position={[0, 0.53, 0]} size={[1.35, 0.12, 0.43]} color={room.accentColor} round={0.055} />}
      </>}
    </group>}
  </>;
}
