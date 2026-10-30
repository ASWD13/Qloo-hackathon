import type { RoomState } from "@/lib/room/state";

const groups: { label: string; fields: RoomState["constraints"]["locked"] }[] = [
  { label: "Bed", fields: ["bedType", "bedFrame", "bedding", "bedPlacement", "textures.bedding"] },
  { label: "Wall color", fields: ["wallColor", "accentColor"] },
  { label: "Layout", fields: ["bedPlacement", "chairPlacement", "deskPlacement", "floorLampPlacement", "storagePlacement"] },
  { label: "Seating", fields: ["chair", "chairPlacement"] },
  { label: "Artwork", fields: ["artwork", "textures.artwork"] },
  { label: "Rug", fields: ["rug", "rugSize", "textures.rug"] },
  { label: "Lighting", fields: ["tableLamp", "floorLamp", "lightingTemperature", "lightingIntensity"] },
];
export default function RoomLocks({ room, disabled, onToggle }: {
  room: RoomState; disabled: boolean; onToggle: (fields: RoomState["constraints"]["locked"]) => void;
}) {
  return (
    <fieldset className="room-locks" disabled={disabled}>
      <legend>Keep these unchanged</legend>
      {groups.map(({ label, fields }) => (
        <label key={label}>
          <input
            type="checkbox"
            checked={fields.every((field) => room.constraints.locked.includes(field))}
            onChange={() => onToggle(fields)}
          />
          {label}
        </label>
      ))}
      <p>Checked items stay fixed when you edit or redesign. Undo restores locks too.</p>
      {room.constraints.forbidden.length > 0 && (
        <p>Keep out: {room.constraints.forbidden.map((value) => value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()).join(", ")}.</p>
      )}
    </fieldset>
  );
}
