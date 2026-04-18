"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { weekStart, toISODate } from "@/lib/schedule-utils";

export function NewScheduleForm({ defaultWeekStart }: { defaultWeekStart: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultWeekStart);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Normaliseer naar maandag zodra de gebruiker een willekeurige dag kiest.
  function handleDateChange(value: string) {
    setError(null);
    setExistingId(null);
    if (value) {
      const m = toISODate(weekStart(new Date(`${value}T00:00:00`)));
      setDate(m);
    } else {
      setDate(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: date }),
    });

    setSubmitting(false);

    if (res.status === 409) {
      const j = await res.json();
      setExistingId(j.id);
      setError("Er bestaat al een rooster voor deze week.");
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { schedule } = await res.json();
    router.push(`/admin/roosters/${schedule.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
      <div>
        <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
          Week (kies een datum, we ronden af op de maandag)
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="input-dark tabular-nums"
          required
        />
        <p className="mt-2 text-xs text-[color:var(--clr-text-muted)] tabular-nums">
          Weekstart: {formatDate(date)}
        </p>
      </div>

      {error ? (
        <div className="text-sm text-[color:var(--clr-danger)]">
          {error}
          {existingId ? (
            <>
              {" "}
              <Link
                href={`/admin/roosters/${existingId}`}
                className="underline underline-offset-2"
              >
                Open bestaand rooster →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Link href="/admin/roosters" className="btn-ghost">
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:opacity-60"
        >
          {submitting ? "Aanmaken…" : "Aanmaken & automatisch vullen"}
        </button>
      </div>
    </form>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
