import type { RoomState } from "@/lib/room/state";
import { curatedTextureFor } from "@/lib/assets/textures";
import { useSafeTexture } from "./texture";
import { Box } from "./primitives";
export default function Artwork({ room }: { room: RoomState }) {
  const map = useSafeTexture(room.textures.artwork, curatedTextureFor("artwork", room.artwork));
  if (room.artwork === "none") return null;
  return <group>
    <Box position={[0, 2.35, -2.68]} size={[1.42, 1.05, 0.06]} color="#473d30" />
    <mesh position={[0, 2.35, -2.635]}><planeGeometry args={[1.32, 0.95]} /><meshStandardMaterial key={map ? "textured" : "solid"} color={map ? "#ffffff" : room.accentColor} map={map} roughness={1} /></mesh>
  </group>;
}
