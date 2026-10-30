import { readdir, stat } from "node:fs/promises";
import { choices } from "../lib/assets/catalog";
type FileMeasure = { path: string; bytes: number };
async function scan(dir: string): Promise<FileMeasure[]> {
  const out: FileMeasure[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await scan(path));
    else out.push({ path, bytes: (await stat(path)).size });
  }
  return out;
}
const publicFiles = await scan("public");
const sourcePaths = ["lib/assets/catalog.ts", "lib/room/state.ts", "lib/room/tools.ts", "lib/room/anchors.ts", "lib/assets/textures.ts"];
const sources = [...await scan("components/bedroom"), ...await Promise.all(sourcePaths.map(async (path) => ({ path, bytes: (await stat(path)).size })))];
const models = publicFiles.filter((file) => /\.(glb|gltf|fbx|obj|usdz)$/i.test(file.path) || /\/models\//.test(file.path));
const fonts = publicFiles.filter((file) => /\.(woff2?|ttf|otf)$/i.test(file.path));
const textures = publicFiles.filter((file) => /\/(artwork|textures|environment)\//.test(file.path) && !models.includes(file));
const other = publicFiles.filter((file) => !models.includes(file) && !fonts.includes(file) && !textures.includes(file));
console.table(Object.entries(choices).map(([category, ids]) => ({ category, selectableVariants: ids.filter((id) => id !== "none").length, removable: (ids as readonly string[]).includes("none") })));
console.table([
  { measure: "Downloaded model files", files: models.length, bytes: models.reduce((sum, file) => sum + file.bytes, 0) },
  { measure: "Room artwork / texture files", files: textures.length, bytes: textures.reduce((sum, file) => sum + file.bytes, 0) },
  { measure: "Font files (not room assets)", files: fonts.length, bytes: fonts.reduce((sum, file) => sum + file.bytes, 0) },
  { measure: "Other public files", files: other.length, bytes: other.reduce((sum, file) => sum + file.bytes, 0) },
  { measure: "Uncompiled room source (not network model bytes)", files: sources.length, bytes: sources.reduce((sum, file) => sum + file.bytes, 0) },
]);
console.table([...models, ...textures].map((file) => ({ ...file, kind: models.includes(file) ? "model" : "texture" })));
console.log("Geometry is original procedural source; a zero model-byte count does not include Three.js, client chunks, fonts, or textures. Selected category modules are lazy loaded; only selected geometry is instantiated. Generated server-cache textures are measured separately by the image evaluation script, not included in public asset bytes.");
if ([...models, ...textures].some((file) => file.bytes > 250_000)) throw new Error("A room model or texture exceeds the 250 KB per-file asset budget");
