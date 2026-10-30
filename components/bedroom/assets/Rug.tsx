import type { RoomState } from "@/lib/room/state";
import { anchorFor } from "@/lib/room/anchors";
import { colors } from "@/lib/assets/catalog";
import { curatedTextureFor } from "@/lib/assets/textures";
import { Box } from "./primitives";
import { useSafeTexture } from "./texture";
export default function Rug({ room }: { room: RoomState }) {
  const bed = anchorFor(room, "bed"), runner = room.rug === "runner" || room.rugSize === "runner";
  const width = runner ? 2.7 : room.rugSize === "medium" ? 2.8 : 3.6;
  const depth = runner ? 0.85 : room.rugSize === "medium" ? 2.6 : 3.6;
  const z = runner ? bed.z + 2.25 : bed.z + 0.95;
  const map = useSafeTexture(room.textures.rug, curatedTextureFor("rug", room.rug));
  if (room.rug === "none") return null;
  return <group position={[bed.x, 0, z]}>
    <Box position={[0, 0.035, 0]} size={[width, 0.05, depth]} color={colors[room.rug]} round={0.02} />
    {map && <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[width - 0.025, depth - 0.025]} /><meshStandardMaterial map={map} color={room.rug === "jute" || room.rug === "runner" ? colors[room.rug] : "#ffffff"} roughness={1} /></mesh>}
    {(room.rug === "jute" || runner) && [-1, 1].map((side) => <group key={side}>
      {Array.from({ length: 14 }, (_, i) => <Box key={i} position={[-width / 2 + 0.1 + i * (width - 0.2) / 13, 0.03, side * (depth / 2 + 0.045)]} size={[0.025, 0.018, 0.1]} color={colors[room.rug]} round={0.002} />)}
    </group>)}
  </group>;
}
