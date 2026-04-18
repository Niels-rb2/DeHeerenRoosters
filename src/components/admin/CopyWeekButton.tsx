"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toISODate, weekStart } from "@/lib/schedule-utils";

export function CopyWeekButton({
  scheduleId,
  scheduleWeekStart,
}: {
  scheduleId: string;
  scheduleWeekStart: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customWeek, setCustomWeek] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy(targetIso: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/schedules/${scheduleId}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_week_start: targetIso }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      if (j.id) {
        if (
          confirm(
            "Er bestaat al een rooster voor die week. Meteen openen?",
          )
        ) {
          router.push(`/admin/roosters/${j.id}`);
        }
        return;
      }
      setError(j.error ?? "Kopiëren mislukt");
      return;
    }
    const { schedule } = await res.json();
    router.push(`/admin/roosters/${schedule.id}`);
    setOpen(false);
  }

  function nextWeekIso(): string {
    const d = new Date(`${scheduleWeekStart}T00:00:00`);
    d.setDate(d.getDate() + 7);
    return toISODate(d);
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setError(null);
        }}
        aria-label="Kopieer deze week"
        data-tooltip="Kopieer deze week"
        className="h-10 w-10 rounded-full bg-[color:var(--clr-text)] text-[color:var(--clr-bg)] flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <Copy className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-72 card p-4 shadow-lg space-y-3">
            <p className="text-xs text-[color:var(--clr-text-muted)]">
              Kopieer shifts en dag-instellingen van deze week naar:
            </p>
            <button
              type="button"
              onClick={() => handleCopy(nextWeekIso())}
              disabled={busy}
              className="btn-primary w-full justify-center disabled:opacity-60"
            >
              {busy ? "Kopiëren…" : "Volgende week"}
            </button>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
                …of kies een andere week
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customWeek}
                  onChange={(e) => setCustomWeek(e.target.value)}
                  className="input-dark tabular-nums flex-1"
                />
                <button
                  type="button"
                  disabled={busy || !customWeek}
                  onClick={() => {
                    const iso = toISODate(
                      weekStart(new Date(`${customWeek}T00:00:00`)),
                    );
                    handleCopy(iso);
                  }}
                  className="btn-primary disabled:opacity-60"
                >
                  Kopieer
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[color:var(--clr-text-muted)]">
                We ronden af op de maandag van die week.
              </p>
            </div>

            {error ? (
              <p className="text-sm text-[color:var(--clr-danger)]">{error}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
