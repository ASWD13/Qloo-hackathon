import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { SRGBColorSpace, TextureLoader, type Texture } from "three";
import { textureValueSchema } from "@/lib/assets/textures";
type Entry = { refs: number; promise: Promise<Texture | null>; texture: Texture | null };
const textures = new Map<string, Entry>();
const loader = new TextureLoader();
function acquire(path: string): Entry {
  const cached = textures.get(path);
  if (cached) { cached.refs++; return cached; }
  const entry: Entry = { refs: 1, promise: Promise.resolve(null), texture: null };
  entry.promise = loader.loadAsync(path).then((texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 2;
    if (!entry.refs) { texture.dispose(); return null; }
    entry.texture = texture;
    return texture;
  }).catch(() => null);
  textures.set(path, entry);
  return entry;
}
function release(path: string, entry: Entry) {
  entry.refs--;
  if (!entry.refs) {
    entry.texture?.dispose();
    if (textures.get(path) === entry) textures.delete(path);
  }
}
/** Local allowlisted textures only. Failed generated assets fall back without suspending the room. */
export function useSafeTexture(value: string | null, fallback: string): Texture | null {
  const parsed = textureValueSchema.safeParse(value);
  const path = parsed.success ? parsed.data : fallback;
  const invalidate = useThree((state) => state.invalidate);
  const [loaded, setLoaded] = useState<{ path: string; texture: Texture | null } | null>(null);
  useEffect(() => {
    let active = true;
    const acquired: [string, Entry][] = [];
    async function load() {
      const entry = acquire(path);
      acquired.push([path, entry]);
      let texture = await entry.promise;
      if (!active) return;
      if (!texture && path !== fallback) {
        const backup = acquire(fallback);
        acquired.push([fallback, backup]);
        texture = await backup.promise;
      }
      if (active) { setLoaded({ path, texture }); invalidate(); }
    }
    void load();
    return () => { active = false; for (const [key, entry] of acquired) release(key, entry); };
  }, [path, fallback, invalidate]);
  return loaded?.path === path ? loaded.texture : null;
}
