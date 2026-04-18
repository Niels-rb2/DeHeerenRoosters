"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DAYS_NL_LONG, dowMondayBased } from "@/lib/schedule-utils";
import type { DayOverride, Employee, Shift } from "@/types/database";

type Row = {
  employee_id: string;
  employee_name: string;
  enabled: boolean;
  is_day_off: boolean;
  start_time: string;
  end_time: string | null; // null = tot sluit
  notes: string;
};

type Props = {
  scheduleId: string;
  date: string;
  availableEmployees: Employee[]; // nog geen shift op deze datum
  isNormallyClosed: boolean; // ma/di — geen standaard openingstijden
  hasOverride: boolean; // al een dag-override geconfigureerd?
  onClose: () => void;
  onSaved: (shifts: Shift[], override: DayOverride | null) => void;
};

export function BulkShiftModal({
  scheduleId,
  date,
  availableEmployees,
  isNormallyClosed,
  hasOverride,
  onClose,
  onSaved,
}: Props) {
  const dow = dowMondayBased(new Date(`${date}T00:00:00`));
  const defaultStart = dow === 4 || dow === 5 ? "18:00" : "16:00";
  const defaultEnd = dow === 4 || dow === 5 ? null : "23:00";
  const needsOpening = isNormallyClosed && !hasOverride;
  const [openDay, setOpenDay] = useState(needsOpening);

  const [rows, setRows] = useState<Row[]>(() =>
    availableEmployees.map((e) => ({
      employee_id: e.id,
      employee_name: e.name,
      enabled: false,
      is_day_off: false,
      start_time: defaultStart,
      end_time: defaultEnd,
      notes: "",
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(employeeId: string, patch: Partial<Row>) {
    setRows((list) =>
      list.map((r) => (r.employee_id === employeeId ? { ...r, ...patch } : r)),
    );
  }

  async function handleSave() {
    const toSave = rows.filter((r) => r.enabled);
    if (toSave.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);

    // Als we een normaal gesloten dag openen: dag-override upserten met de
    // vroegste start / laatste eind uit de geselecteerde shifts.
    let createdOverride: DayOverride | null = null;
    if (openDay) {
      const workShifts = toSave.filter((r) => !r.is_day_off);
      const starts = workShifts
        .map((r) => r.start_time)
        .filter(Boolean)
        .sort();
      const ends = workShifts
        .map((r) => r.end_time)
        .filter((e): e is string => !!e)
        .sort();
      const open = starts[0] ?? defaultStart;
      const close = ends.length === workShifts.length ? ends[ends.length - 1] : null;

      const res = await fetch("/api/day-overrides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: scheduleId,
          date,
          is_closed: false,
          custom_open_time: open,
          custom_close_time: close,
        }),
      });
      if (res.ok) {
        const j = await res.json();
        createdOverride = j.override;
      }
    }

    const created: Shift[] = [];
    for (const row of toSave) {
      const body = {
        schedule_id: scheduleId,
        employee_id: row.employee_id,
        date,
        is_day_off: row.is_day_off,
        start_time: row.is_day_off ? null : row.start_time,
        end_time: row.is_day_off ? null : row.end_time,
        notes: row.notes.trim() || null,
      };
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(
          `${row.employee_name}: ${j.error ?? "kon niet opslaan"}`,
        );
        setSaving(false);
        if (created.length > 0) onSaved(created, createdOverride);
        return;
      }
      const { shift } = await res.json();
      created.push(shift);
    }

    setSaving(false);
    onSaved(created, createdOverride);
  }

  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
  });
  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <Modal
      title={`Shifts inplannen — ${DAYS_NL_LONG[dow]} ${dayLabel}`}
      onClose={onClose}
    >
      {availableEmployees.length === 0 ? (
        <p className="text-sm text-[color:var(--clr-text-muted)]">
          Alle actieve medewerkers hebben al een shift op deze dag. Bewerk een
          bestaande shift via het rooster.
        </p>
      ) : (
        <>
          <p className="text-sm text-[color:var(--clr-text-muted)]">
            Vink de medewerkers aan die je wilt inplannen. Je kunt tijden per
            persoon aanpassen. Laat <strong>Tot</strong> leeg of vink
            &ldquo;tot sluit&rdquo; aan voor vr/za.
          </p>

          {needsOpening ? (
            <label className="mt-4 flex items-start gap-3 rounded-2xl bg-[color:var(--clr-warning)]/15 p-3 cursor-pointer">
              <AlertCircle className="h-5 w-5 shrink-0 text-[color:var(--clr-warning)]" />
              <div className="flex-1 text-sm">
                <div className="font-medium">
                  {DAYS_NL_LONG[dow]} is normaal gesloten
                </div>
                <div className="text-xs text-[color:var(--clr-text-muted)]">
                  Vink aan om deze dag ook te openen — de openingstijden worden
                  automatisch afgestemd op de vroegste start en laatste eindtijd.
                </div>
              </div>
              <input
                type="checkbox"
                checked={openDay}
                onChange={(e) => setOpenDay(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:var(--clr-accent)]"
              />
            </label>
          ) : null}

          <div className="mt-4 space-y-2">
            {rows.map((row) => (
              <div
                key={row.employee_id}
                className={`rounded-2xl border border-[color:var(--clr-border)] p-3 ${
                  row.enabled ? "bg-[color:var(--clr-surface)]" : ""
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      update(row.employee_id, { enabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-[color:var(--clr-accent)]"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {row.employee_name}
                  </span>
                  {row.enabled ? (
                    <label className="flex items-center gap-1.5 text-xs text-[color:var(--clr-text-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.is_day_off}
                        onChange={(e) =>
                          update(row.employee_id, {
                            is_day_off: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 accent-[color:var(--clr-accent)]"
                      />
                      Vrij
                    </label>
                  ) : null}
                </label>

                {row.enabled && !row.is_day_off ? (
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 tabular-nums">
                    <input
                      type="time"
                      value={row.start_time}
                      onChange={(e) =>
                        update(row.employee_id, { start_time: e.target.value })
                      }
                      className="input-dark"
                    />
                    <span className="text-[color:var(--clr-text-muted)]">–</span>
                    <input
                      type="time"
                      value={row.end_time ?? ""}
                      onChange={(e) =>
                        update(row.employee_id, {
                          end_time: e.target.value || null,
                        })
                      }
                      placeholder="tot sluit"
                      className="input-dark"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-[color:var(--clr-text-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.end_time === null}
                        onChange={(e) =>
                          update(row.employee_id, {
                            end_time: e.target.checked ? null : "23:00",
                          })
                        }
                        className="h-3.5 w-3.5 accent-[color:var(--clr-accent)]"
                      />
                      tot sluit
                    </label>
                  </div>
                ) : null}

                {row.enabled ? (
                  <input
                    value={row.notes}
                    onChange={(e) =>
                      update(row.employee_id, { notes: e.target.value })
                    }
                    placeholder="Notitie (optioneel)"
                    className="input-dark mt-2 text-sm"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      {error ? (
        <p className="mt-4 text-sm text-[color:var(--clr-danger)]">{error}</p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          {availableEmployees.length === 0 ? "Sluiten" : "Annuleren"}
        </button>
        {availableEmployees.length > 0 ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || enabledCount === 0}
            className="btn-primary disabled:opacity-60"
          >
            {saving
              ? "Opslaan…"
              : enabledCount > 0
                ? `${enabledCount} shift${enabledCount > 1 ? "s" : ""} opslaan`
                : "Opslaan"}
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
