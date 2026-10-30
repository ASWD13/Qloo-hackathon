import type { Taste } from "@/lib/validation/contracts";
export const profiles: {
  id: string;
  name: string;
  note: string;
  taste: Taste;
}[] = [
  {
    id: "quiet",
    name: "Quiet Experimental",
    note: "Restrained, tactile, a little unexpected.",
    taste: {
      music: ["Radiohead"],
      film: ["A24"],
      brands: ["Muji"],
      wildcard: "",
    },
  },
  {
    id: "bold",
    name: "Bold Contemporary",
    note: "Rhythm, confident color, clean shapes.",
    taste: {
      music: ["Bad Bunny"],
      film: ["Fast & Furious"],
      brands: ["Nike"],
      wildcard: "",
    },
  },
  {
    id: "soft",
    name: "Soft Cinematic",
    note: "Soft light and a considered romantic streak.",
    taste: {
      music: ["Lana Del Rey"],
      film: ["Sofia Coppola"],
      brands: ["Anthropologie"],
      wildcard: "",
    },
  },
  {
    id: "future",
    name: "Futurist",
    note: "Precise forms with a cinematic edge.",
    taste: {
      music: ["Daft Punk"],
      film: ["Blade Runner"],
      brands: ["Arc'teryx"],
      wildcard: "",
    },
  },
];
export function profileIndex(taste: Taste) {
  const text = JSON.stringify(taste).toLowerCase();
  const index = profiles.findIndex(
    (p) =>
      p.taste.music.some((m) => text.includes(m.toLowerCase())) ||
      p.taste.brands.some((b) => text.includes(b.toLowerCase())),
  );
  return index < 0 ? 0 : index;
}
