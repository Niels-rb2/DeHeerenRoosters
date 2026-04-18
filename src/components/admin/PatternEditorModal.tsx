"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DAYS_NL_LONG } from "@/lib/schedule-utils";
import type { Employee, DefaultPattern } from "@/types/database";

type Props = {
  employee: Employee;
  initialPatterns: DefaultPattern[];
  onClose: () => void;
  onSaved: (patterns: DefaultPattern[]) => void;
};

type Row = {
  enabled: boolean;
  start_time: string;
  end_time: string | null; // null = "tot sluit"
};

export function PatternEditorModal({
  employee,
  initialPatterns,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    [0, 1, 2, 3, 4, 5, 6].map((dow) => {
      const existing = initialPatterns.find((p) => p.day_of_week === dow);
      if (existing) {
        return {
          enabled: true,
          start_time: existing.start_time.slice(0, 5),
          end_time: existing.end_time ? existing.end_time.slice(0, 5) : null,
        };
      }
      return {
        enabled: false,
        start_time: dow === 4 || dow === 5 ? "18:00" : "16:00",
        end_time: dow === 4 || dow === 5 ? null : "23:00",
      };
    }),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(dow: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === dow ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const patterns = rows
      .map((r, dow) => ({
        day_of_week: dow,
        start_time: r.start_time,
        end_time: r.end_time,
        enabled: r.enabled,
      }))
      .filter((p) => p.enabled)
      .map(({ enabled, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

    const res = await fetch(`/api/employees/${employee.id}/patterns`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patterns }),
    });

    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { patterns: saved } = await res.json();
    onSaved(saved);
  }

  return (
    <Modal title={`Weekpatroon — ${employee.name}`} onClose={onClose}>
      <p className="text-sm text-[color:var(--clr-text-muted)]">
        Vink aan op welke dagen deze medewerker standaard werkt. Deze tijden
        worden automatisch ingevuld bij een nieuw weekrooster. Laat eindtijd
        leeg voor <strong>tot sluit</strong>.
      </p>

      <div className="mt-5 space-y-2">
        {rows.map((row, dow) => (
          <div
            key={dow}
            className={`rounded-xl border border-[color:var(--clr-border)] p-3 ${
              row.enabled ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => update(dow, { enabled: e.target.checked })}
                className="h-4 w-4 accent-[color:var(--clr-accent)]"
              />
              <span className="w-24 text-sm font-medium">{DAYS_NL_LONG[dow]}</span>

              <div className="flex-1 flex items-center gap-2 tabular-nums">
                <input
                  type="time"
                  value={row.start_time}
                  onChange={(e) => update(dow, { start_time: e.target.value })}
                  disabled={!row.enabled}
                  className="input-dark w-28 disabled:opacity-50"
                />
                <span className="text-[color:var(--clr-text-muted)]">–</span>
                <input
                  type="time"
                  value={row.end_time ?? ""}
                  onChange={(e) =>
                    update(dow, { end_time: e.target.value || null })
                  }
                  disabled={!row.enabled}
                  placeholder="tot sluit"
                  className="input-dark w-28 disabled:opacity-50"
                />
                <label className="ml-1 flex items-center gap-1.5 text-xs text-[color:var(--clr-text-muted)]">
                  <input
                    type="checkbox"
                    checked={row.end_time === null}
                    onChange={(e) =>
                      update(dow, { end_time: e.target.checked ? null : "23:00" })
                    }
                    disabled={!row.enabled}
                    className="h-3.5 w-3.5 accent-[color:var(--clr-accent)]"
                  />
                  tot sluit
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[color:var(--clr-danger)]">{error}</p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Annuleren
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? "Opslaan…" : "Patroon opslaan"}
        </button>
      </div>
    </Modal>
  );
}
