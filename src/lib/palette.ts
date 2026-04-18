// 16-kleuren palette voor medewerker-tags. Divers gekozen — mix van warme,
// koele, heldere en aardse tinten zodat elke medewerker direct herkenbaar is.
// Hex-waarde wordt opgeslagen in rooster_employees.color.
// Elke kleur is uniek per rooster (1 medewerker per kleur).

export type PaletteEntry = { hex: string; label: string };

export const PALETTE: PaletteEntry[] = [
  { hex: "#dc2626", label: "Kers" },       // bright red
  { hex: "#f97316", label: "Koraal" },     // orange
  { hex: "#eab308", label: "Saffraan" },   // yellow-gold
  { hex: "#84cc16", label: "Limoen" },     // yellow-green
  { hex: "#10b981", label: "Smaragd" },    // emerald
  { hex: "#14b8a6", label: "Teal" },       // teal
  { hex: "#0ea5e9", label: "Hemel" },      // sky blue
  { hex: "#2563eb", label: "Kobalt" },     // cobalt
  { hex: "#6366f1", label: "Indigo" },     // indigo
  { hex: "#8b5cf6", label: "Violet" },     // violet
  { hex: "#d946ef", label: "Magenta" },    // magenta
  { hex: "#ec4899", label: "Roze" },       // pink
  { hex: "#b45309", label: "Oker" },       // ochre (earthy)
  { hex: "#65a30d", label: "Olijf" },      // olive
  { hex: "#7c2d12", label: "Kastanje" },   // chestnut
  { hex: "#475569", label: "Grafiet" },    // graphite
];

export function paletteLabel(hex: string | null | undefined): string | null {
  if (!hex) return null;
  return (
    PALETTE.find((p) => p.hex.toLowerCase() === hex.toLowerCase())?.label ??
    null
  );
}

export function isValidColor(hex: string | null | undefined): boolean {
  if (!hex) return false;
  return PALETTE.some((p) => p.hex.toLowerCase() === hex.toLowerCase());
}

// Border 100%, achtergrond ~12% (hex 1F ≈ 12%).
export function colorStyles(
  hex: string | null | undefined,
): { borderColor: string; backgroundColor: string } | undefined {
  if (!hex) return undefined;
  return {
    borderColor: hex,
    backgroundColor: `${hex}1f`,
  };
}

export function colorDotStyles(hex: string | null | undefined) {
  if (!hex) return undefined;
  return { backgroundColor: hex };
}
