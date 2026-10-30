"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { defaultRoom, alternateRoom } from "@/lib/room/state";
import { choices, label } from "@/lib/assets/catalog";
import { executeTools, fieldTools } from "@/lib/room/tools";
import { placementChoices, isWallLamp } from "@/lib/room/anchors";
import { textureSlots } from "@/lib/assets/textures";
const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => <p>Loading room engine…</p> });
const assetControls = Object.entries(choices).flatMap(([category, ids]) => category === "decor" ? [] : (category === "nightstand" ? ["nightstandLeft", "nightstandRight"] : [category]).map((field) => ({ field: field as keyof typeof fieldTools, ids })));
export default function Workbench() {
  const [room, setRoom] = useState(defaultRoom);
  const [reset, setReset] = useState(0);
  const [json, setJson] = useState('[{"tool":"set_bedding","value":"sage_moss"},{"tool":"set_lighting_temperature","value":2800}]');
  const [message, setMessage] = useState("");
  function apply(input: unknown) {
    try { setRoom(executeTools(room, input)); setMessage("Validated atomic plan applied"); }
    catch (error) { setMessage(`Room unchanged. ${error instanceof Error ? error.message : "Invalid plan"}`); }
  }
  return <main>
    <h1>TasteSpace / Room engine</h1>
    <div style={{ height: "65vh" }}><Scene room={room} resetKey={reset} /></div>
    <button onClick={() => setRoom(defaultRoom)}>Neutral state</button>{" "}
    <button onClick={() => setRoom(alternateRoom)}>Alternate state</button>{" "}
    <button onClick={() => setReset((x) => x + 1)}>Reset view</button>
    <p>Only predefined placements are accepted. Collisions, locked fields and door clearance are checked for the entire batch.</p>
    <fieldset style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 20 }}><legend>Catalog</legend>
      {assetControls.map(({ field, ids }) => <label key={field}>{label(field)}{" "}<select aria-label={field} value={room[field]} onChange={(event) => {
        const value = event.target.value;
        const calls: unknown[] = [{ tool: fieldTools[field], value }];
        if (field === "nightstandRight" && value === "none" && room.decor.bedside) calls.push({ tool: "remove_decor", slot: "bedside" });
        if (value === "none" && ((field === "nightstandLeft" && room.nightstandRight === "none") || (field === "nightstandRight" && room.nightstandLeft === "none")) && !isWallLamp(room.tableLamp)) calls.push({ tool: "set_table_lamp", value: "none" });
        apply(calls);
      }}>{ids.map((id) => <option key={id} value={id}>{label(id)}</option>)}</select></label>)}
      {(["bedside", "shelf", "floor"] as const).map((slot) => <label key={slot}>{label(slot)} decor{" "}<select aria-label={`${slot} decor`} value={room.decor[slot] ?? "none"} onChange={(event) => apply([event.target.value === "none" ? { tool: "remove_decor", slot } : { tool: "add_decor", slot, assetId: event.target.value }])}><option value="none">None</option>{choices.decor.map((id) => <option key={id} value={id}>{label(id)}</option>)}</select></label>)}
    </fieldset>
    <fieldset style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 20 }}><legend>Anchors</legend>
      {(Object.keys(placementChoices) as (keyof typeof placementChoices)[]).map((slot) => <label key={slot}>{label(slot)} position{" "}<select aria-label={`${slot} placement`} value={room.placements[slot]} onChange={(event) => apply([{ tool: "move_furniture", slot, placement_id: event.target.value }])}>{placementChoices[slot].map((id) => <option key={id} value={id}>{label(id)}</option>)}</select></label>)}
    </fieldset>
    <fieldset style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 20 }}><legend>Materials and lighting</legend>
      {(["wallColor", "accentColor"] as const).map((field) => <label key={field}>{label(field)} <input type="color" aria-label={field} value={room[field]} onChange={(event) => apply([{ tool: fieldTools[field], value: event.target.value }])} /></label>)}
      <label>Temperature <input aria-label="Lighting temperature" type="range" min={2200} max={6500} step={100} value={room.lightingTemperature} onChange={(event) => apply([{ tool: "set_lighting_temperature", value: Number(event.target.value) }])} />{room.lightingTemperature} K</label>
      <label>Intensity <input aria-label="Lighting intensity" type="range" min={0.2} max={1.5} step={0.05} value={room.lightingIntensity} onChange={(event) => apply([{ tool: "set_lighting_intensity", value: Number(event.target.value) }])} /></label>
      {textureSlots.map((slot) => <label key={slot}>{label(slot)} local texture <input aria-label={`${slot} texture`} key={`${slot}:${room.textures[slot]}`} defaultValue={room.textures[slot] ?? ""} placeholder="Catalog default" onBlur={(event) => { if (event.target.value !== (room.textures[slot] ?? "")) apply([{ tool: "set_texture", slot, value: event.target.value || null }]); }} /></label>)}
    </fieldset>
    <label>Room tool JSON<textarea aria-label="Room tool JSON" value={json} onChange={(event) => setJson(event.target.value)} style={{ display: "block", width: "100%", minHeight: 90 }} /></label>
    <button onClick={() => { try { apply(JSON.parse(json)); } catch { setMessage("Invalid JSON. Room unchanged."); } }}>Execute tools</button>
    <p role="status">{message}</p>
    <pre data-testid="room-state">{JSON.stringify(room, null, 2)}</pre>
  </main>;
}
