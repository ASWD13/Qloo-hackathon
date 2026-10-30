import type { RoomState } from "./state";
export const placementChoices = {
  bed: ["back_center", "back_left", "back_right"],
  chair: ["window_reading", "front_right", "front_left"],
  desk: ["right_wall", "front_left", "under_window"],
  floorLamp: ["window_side", "front_right"],
  storage: ["back_left", "right_wall", "front_right"],
} as const;
export type PlacementSlot = keyof typeof placementChoices;
export type Anchor = { x: number; z: number; rotation: number };
export const anchors = {
  bed: { back_center: { x: 0, z: -0.65, rotation: 0 }, back_left: { x: -0.55, z: -0.65, rotation: 0 }, back_right: { x: 0.55, z: -0.65, rotation: 0 } },
  chair: { window_reading: { x: -2.25, z: 0.75, rotation: 0.55 }, front_right: { x: 2.2, z: 1.6, rotation: -0.55 }, front_left: { x: -1.9, z: 1.95, rotation: 0.4 } },
  desk: { right_wall: { x: 2.48, z: -0.15, rotation: -Math.PI / 2 }, front_left: { x: -1.7, z: 2.2, rotation: 0 }, under_window: { x: -2.65, z: 0.2, rotation: Math.PI / 2 } },
  floorLamp: { window_side: { x: -2.65, z: 1.9, rotation: 0 }, front_right: { x: 2.7, z: 0.5, rotation: Math.PI } },
  storage: { back_left: { x: -2.55, z: -2.35, rotation: 0 }, right_wall: { x: 2.78, z: -0.1, rotation: -Math.PI / 2 }, front_right: { x: 2.2, z: 2.25, rotation: 0 } },
} as const;
export function anchorFor<S extends PlacementSlot>(room: RoomState, slot: S): Anchor {
  return (anchors[slot] as Record<string, Anchor>)[room.placements[slot]];
}
export function bedsideAnchor(room: RoomState, side: "left" | "right") {
  const bed = anchorFor(room, "bed");
  return { x: bed.x + (side === "left" ? -1.65 : 1.65), z: bed.z - 1.2, rotation: 0 };
}
export function nightstandHeight(id: RoomState["nightstandLeft"]): number {
  return id === "floating_shelf" ? 0.72 : id === "compact" ? 0.62 : 0.8;
}
export const wallMountedLamps = ["wall_sconce", "pendant"] as const;
export function isWallLamp(id: RoomState["tableLamp"]) { return (wallMountedLamps as readonly string[]).includes(id); }
type Footprint = { name: string; x: number; z: number; width: number; depth: number };
function footprint(name: string, anchor: Anchor, width: number, depth: number): Footprint {
  const c = Math.abs(Math.cos(anchor.rotation)), s = Math.abs(Math.sin(anchor.rotation));
  return { name, x: anchor.x, z: anchor.z, width: width * c + depth * s, depth: width * s + depth * c };
}
function intersects(a: Footprint, b: Footprint) {
  // Exact clearance contact is legal; tolerate floating-point error at the boundary.
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 0.025 - 1e-6 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + 0.025 - 1e-6;
}
export function layoutIssues(room: RoomState): string[] {
  const issues: string[] = [];
  const bed = anchorFor(room, "bed");
  const objects: Footprint[] = [footprint("bed", { ...bed, z: bed.z - 0.06 }, 2.4, 3.22)];
  for (const side of ["left", "right"] as const) {
    const id = side === "left" ? room.nightstandLeft : room.nightstandRight;
    if (id !== "none") {
      const anchor = bedsideAnchor(room, side);
      objects.push(footprint(`${side} bedside`, { ...anchor, z: anchor.z - (id === "floating_shelf" ? 0.245 : 0) }, id === "compact" ? 0.48 : 0.65, id === "floating_shelf" ? 1.14 : 0.65));
    }
  }
  if (room.chair !== "none") objects.push(footprint("chair", anchorFor(room, "chair"), room.chair === "bench" ? 1.25 : 0.95, room.chair === "bench" || room.chair === "ottoman" ? 0.55 : 0.95));
  if (room.secondary !== "none") objects.push(footprint("secondary", anchorFor(room, "desk"), room.secondary === "side_table" ? 0.55 : 1.45, room.secondary === "bench" ? 0.45 : 0.65));
  if (room.storage !== "none") objects.push(footprint("storage", anchorFor(room, "storage"), room.storage === "clothing_rail" ? 1 : 0.9, 0.55));
  if (room.floorLamp !== "none") objects.push(footprint("floor lamp", anchorFor(room, "floorLamp"), 0.58, 0.58));
  if (room.decor.floor) objects.push({ name: "floor decor", x: -2.55, z: -0.3, width: 0.55, depth: 0.55 });
  const door: Footprint = { name: "door clearance", x: 2.55, z: -2.13, width: 1.1, depth: 1.15 };
  for (let i = 0; i < objects.length; i++) {
    const a = objects[i];
    if (Math.abs(a.x) + a.width / 2 > 3.1 || a.z - a.depth / 2 < -2.68 || a.z + a.depth / 2 > 2.72) issues.push(`${a.name} crosses the room boundary`);
    if (intersects(a, door)) issues.push(`${a.name} blocks door clearance`);
    for (const b of objects.slice(i + 1)) if (intersects(a, b)) issues.push(`${a.name} overlaps ${b.name}`);
  }
  if (room.storage === "wall_shelf" && room.placements.storage === "front_right") issues.push("Wall shelves require a wall anchor");
  if (room.nightstandRight === "none" && room.decor.bedside) issues.push("Bedside decor requires the right bedside surface");
  if (room.tableLamp !== "none" && !isWallLamp(room.tableLamp) && room.nightstandLeft === "none" && room.nightstandRight === "none") issues.push("A table lamp requires a bedside surface; use wall_sconce or pendant without tables");
  return issues;
}
export function assertValidLayout(room: RoomState): void {
  const issues = layoutIssues(room);
  if (issues.length) throw new Error(`Invalid room layout: ${issues.join("; ")}`);
}
export const layoutForAgent = { anchors, rules: ["Bedside positions follow the bed; no free XYZ inputs.", "window_reading + window_side form a reading corner.", "Bed + bedside tables, furniture, floor decor and door clearance cannot overlap.", "Clear bedside decor before removing the right table; surface lamps need at least one table.", "desk placement controls every secondary furniture type."] };
