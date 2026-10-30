import type { RoomState } from "@/lib/room/state";
import { colors } from "@/lib/assets/catalog";
import { anchorFor } from "@/lib/room/anchors";
import { curatedTextureFor } from "@/lib/assets/textures";
import { Box, Cylinder } from "./primitives";
import { useSafeTexture } from "./texture";
export default function Bed({ room }: { room: RoomState }) {
  const anchor = anchorFor(room, "bed"), frame = colors[room.bedFrame];
  const upholstered = room.bedType === "upholstered";
  const metal = room.bedType === "metal_frame";
  const top = room.bedType === "platform_low" ? 0.54 : room.bedType === "floating_platform" ? 0.67 : 0.77;
  const map = useSafeTexture(room.textures.bedding, curatedTextureFor("bedding", room.bedding));
  return <group position={[anchor.x, 0, anchor.z]}>
    {room.bedType === "platform_low" && <>
      <Box position={[0, 0.2, 0]} size={[2.38, 0.26, 3.05]} color={frame} round={0.025} />
      <Box position={[0, 0.67, -1.56]} size={[2.38, 0.95, 0.15]} color={frame} />
    </>}
    {upholstered && <>
      <Box position={[0, 0.31, 0]} size={[2.38, 0.5, 3.05]} color={frame} round={0.12} />
      <Box position={[0, 1.02, -1.55]} size={[2.38, 1.45, 0.2]} color={frame} round={0.1} />
      {[-0.86, -0.43, 0, 0.43, 0.86].map((x) => <Box key={x} position={[x, 1.13, -1.43]} size={[0.39, 1.06, 0.075]} color={frame} round={0.075} />)}
    </>}
    {room.bedType === "wood_frame" && <>
      {[-1.08, 1.08].flatMap((x) => [-1.35, 1.35].map((z) => <Box key={`${x}:${z}`} position={[x, 0.25, z]} size={[0.12, 0.5, 0.12]} color={frame} />))}
      {[-1.1, 1.1].map((x) => <Box key={x} position={[x, 0.45, 0]} size={[0.14, 0.25, 2.95]} color={frame} />)}
      <Box position={[0, 0.45, 1.43]} size={[2.3, 0.25, 0.13]} color={frame} />
      {[-1.08, 1.08].map((x) => <Box key={x} position={[x, 0.9, -1.51]} size={[0.12, 1.35, 0.12]} color={frame} />)}
      {[0.85, 1.1, 1.35].map((y) => <Box key={y} position={[0, y, -1.51]} size={[2.2, 0.15, 0.08]} color={frame} />)}
    </>}
    {metal && <>
      {[-1.1, 1.1].flatMap((x) => [-1.42, 1.42].map((z) => <Cylinder key={`${x}:${z}`} position={[x, z < 0 ? 0.75 : 0.33, z]} radius={0.035} height={z < 0 ? 1.5 : 0.66} color={frame} metalness={0.8} />))}
      {[-1.1, 1.1].map((x) => <Box key={x} position={[x, 0.47, 0]} size={[0.055, 0.12, 2.88]} color={frame} round={0.01} metalness={0.8} />)}
      {[0.5, 1.43].map((y) => <Box key={y} position={[0, y, -1.42]} size={[2.2, 0.055, 0.055]} color={frame} metalness={0.8} />)}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((x) => <Cylinder key={x} position={[x, 0.97, -1.42]} radius={0.018} height={0.91} color={frame} metalness={0.8} />)}
    </>}
    {room.bedType === "floating_platform" && <>
      <Box position={[0, 0.22, -0.1]} size={[1.25, 0.4, 1.9]} color="#292c29" />
      <Box position={[0, 0.41, 0]} size={[2.38, 0.14, 3.05]} color={frame} round={0.035} />
      <Box position={[0, 0.99, -1.55]} size={[2.38, 0.72, 0.1]} color={frame} />
      <Box position={[0, 0.46, 1.51]} size={[2.2, 0.025, 0.015]} color="#eee0bb" round={0.002} />
    </>}
    <Box position={[0, top - 0.13, 0]} size={[2.12, 0.25, 2.75]} color="#f3edde" round={0.09} />
    <Box position={[0, top + 0.05, 0.3]} size={[2.17, 0.16, 2.1]} color={colors[room.bedding]} round={0.07} />
    {map && <mesh position={[0, top + 0.134, 0.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.05, 1.98]} /><meshStandardMaterial map={map} roughness={1} /></mesh>}
    {[-0.54, 0.54].map((x) => <Box key={x} position={[x, top + 0.1, -0.97]} size={[0.87, 0.23, 0.55]} color={colors[room.bedding]} round={0.1} />)}
    {[-0.65, 0.65].map((x) => <Box key={x} position={[x, top + 0.21, -0.52]} size={[0.42, 0.21, 0.4]} color={room.accentColor} round={0.08} />)}
    <Box position={[0, top + 0.15, 1.08]} size={[2.2, 0.065, 0.48]} color={room.accentColor} round={0.03} />
  </group>;
}
