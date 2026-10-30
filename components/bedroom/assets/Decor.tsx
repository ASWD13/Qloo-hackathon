import type { RoomState } from "@/lib/room/state";
import { Box, Cylinder, Ball, type V3 } from "./primitives";
import { bedsideAnchor, nightstandHeight } from "@/lib/room/anchors";
function ObjectMesh({ id }: { id: string }) {
  if (id === "plant")
    return (
      <group>
        <Cylinder
          position={[0, 0.15, 0]}
          radius={0.17}
          top={0.2}
          height={0.3}
          color="#a47b53"
        />
        <Cylinder
          position={[0, 0.65, 0]}
          radius={0.02}
          height={0.9}
          color="#5c6944"
        />
        {[-1, 1].flatMap((s) =>
          [0.45, 0.7, 0.95].map((y, i) => (
            <group
              key={s + ":" + y}
              position={[s * 0.13, y, (i % 2) * 0.12]}
              scale={[1, 0.3, 0.65]}
              rotation={[0, 0, s * 0.5]}
            >
              <Ball
                position={[0, 0, 0]}
                radius={0.21}
                color={i % 2 ? "#6d8155" : "#81935c"}
              />
            </group>
          )),
        )}
      </group>
    );
  if (id === "books_stack" || id === "magazines")
    return (
      <group>
        {["#a96645", "#dad2b7", "#6c7b69"].map((c, i) => (
          <Box
            key={c}
            position={[(i % 2) * 0.03, 0.04 + i * 0.065, 0]}
            size={[id === "magazines" ? 0.4 : 0.3, 0.06, 0.24]}
            color={c}
          />
        ))}
      </group>
    );
  if (id === "tray" || id === "bowl")
    return (
      <Cylinder
        position={[0, 0.045, 0]}
        radius={0.2}
        top={0.24}
        height={id === "bowl" ? 0.14 : 0.04}
        color="#b99d70"
      />
    );
  if (id === "candle" || id === "small_lamp")
    return (
      <group>
        <Cylinder
          position={[0, 0.1, 0]}
          radius={0.08}
          height={0.2}
          color="#e7d7a7"
        />
        {id === "small_lamp" && (
          <Ball position={[0, 0.26, 0]} radius={0.13} color="#edcda1" />
        )}
      </group>
    );
  if (id === "sculpture" || id === "abstract_object")
    return (
      <group rotation={[0.1, 0, 0.2]}>
        <mesh position={[0, 0.23, 0]} castShadow>
          <torusGeometry args={[0.16, 0.055, 12, 24]} />
          <meshStandardMaterial
            color={id === "sculpture" ? "#a86444" : "#82939b"}
          />
        </mesh>
        <Box
          position={[0, 0.025, 0]}
          size={[0.26, 0.05, 0.2]}
          color="#c8c0ac"
        />
      </group>
    );
  return (
    <group>
      <Cylinder
        position={[0, 0.16, 0]}
        radius={0.12}
        top={0.09}
        height={0.32}
        color="#baa98b"
      />
      <Cylinder
        position={[0, 0.34, 0]}
        radius={0.055}
        height={0.12}
        color="#b4a384"
      />
    </group>
  );
}
export default function Decor({ room }: { room: RoomState }) {
  const bedside = bedsideAnchor(room, "right");
  const slots: Record<keyof RoomState["decor"], V3> = {
    bedside: [bedside.x + 0.09, nightstandHeight(room.nightstandRight) + 0.01, bedside.z + 0.13],
    shelf: [-2.15, 2.34, -2.58],
    floor: [-2.55, 0, -0.3],
  };
  return (
    <group>
      {Object.entries(room.decor).map(
        ([slot, id]) =>
          id && (slot !== "bedside" || room.nightstandRight !== "none") && (
            <group
              key={slot}
              position={slots[slot as keyof typeof slots]}
              scale={slot === "floor" ? 1.1 : slot === "bedside" ? (room.nightstandRight === "compact" ? 0.35 : 0.5) : 0.65}
            >
              <ObjectMesh id={id} />
            </group>
          ),
      )}
    </group>
  );
}
