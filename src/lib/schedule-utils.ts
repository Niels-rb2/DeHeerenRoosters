// Schedule helpers — day-of-week conventie: 0=ma … 6=zo.

export const DAYS_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;
export const DAYS_NL_LONG = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
] as const;

// Standaard openingsdagen: wo–zo (dow 2..6). Ma/di gesloten.
export const OPEN_DAYS = [2, 3, 4, 5, 6] as const;

export function isOpenDay(dow: number): boolean {
  return OPEN_DAYS.includes(dow as (typeof OPEN_DAYS)[number]);
}

// Standaard openings- en sluitingstijden per dag.
// Vrijdag (4) en zaterdag (5) gaan door tot 04:00 de volgende dag.
export function defaultOpenTime(dow: number): string | null {
  return isOpenDay(dow) ? "16:00" : null;
}
export function defaultCloseTime(dow: number): string | null {
  if (!isOpenDay(dow)) return null;
  return dow === 4 || dow === 5 ? "04:00" : "23:00";
}

// Render "tot sluit" als end_time NULL is.
export function formatEndTime(end: string | null): string {
  return end ? end.slice(0, 5) : "tot sluit";
}

export function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

// Monday-based day-of-week voor een JS Date (native: 0=zo … 6=za).
export function dowMondayBased(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Geef de maandag (0:00) van de week waar `date` in valt.
export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dowMondayBased(d));
  return d;
}

// Bouw een "display name" map per medewerker: alleen voornaam, tenzij de
// voornaam binnen de set vaker voorkomt — dan voornaam + eerste letter van
// de achternaam (bijv. "Niels S.", "Niels G.").
export function buildDisplayNames<T extends { id: string; name: string }>(
  employees: T[],
): Map<string, string> {
  const countByFirst = new Map<string, number>();
  for (const e of employees) {
    const first = e.name.trim().split(/\s+/)[0] ?? e.name;
    countByFirst.set(first, (countByFirst.get(first) ?? 0) + 1);
  }
  const result = new Map<string, string>();
  for (const e of employees) {
    const parts = e.name.trim().split(/\s+/);
    const first = parts[0] ?? e.name;
    if ((countByFirst.get(first) ?? 0) <= 1) {
      result.set(e.id, first);
    } else {
      const last = parts.slice(1).join(" ");
      const initial = last.charAt(0).toUpperCase();
      result.set(e.id, initial ? `${first} ${initial}.` : first);
    }
  }
  return result;
}

// YYYY-MM-DD in lokale tijd (voorkomt UTC-shift bij toISOString).
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
