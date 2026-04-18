import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Schedule } from "@/types/database";
import { Plus, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default async function RoostersPage() {
  const { data } = await supabaseAdmin()
    .from("rooster_schedules")
    .select("*")
    .order("week_start", { ascending: false })
    .returns<Schedule[]>();

  const schedules = data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10 py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-2xl md:text-[2.5rem] font-medium">Roosters</h1>
        </div>
        <Link
          href="/admin/roosters/nieuw"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nieuw rooster
        </Link>
      </div>

      {schedules.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-[color:var(--clr-text-muted)]" />
          <p className="mt-4 text-sm text-[color:var(--clr-text-muted)]">
            Nog geen roosters. Maak je eerste rooster aan om te beginnen.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {schedules.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/roosters/${s.id}`}
                className="card block p-5 hover:bg-[color:var(--clr-surface-2)] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">Week {weekNumber(s.week_start)}</p>
                    <p className="mt-1 text-base font-medium tabular-nums">
                      {formatWeekRange(s.week_start)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
                      s.status === "published"
                        ? "bg-[color:var(--clr-success)]/20 text-[color:var(--clr-success)]"
                        : "bg-[color:var(--clr-surface-2)] text-[color:var(--clr-text-muted)]"
                    }`}
                  >
                    {s.status === "published" ? "Gepubliceerd" : "Concept"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function weekNumber(weekStart: string): number {
  const d = new Date(`${weekStart}T00:00:00`);
  // ISO-week nummer
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
