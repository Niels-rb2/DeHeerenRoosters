"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { Employee, Shift } from "@/types/database";

type EditProps = {
  shift: Shift;
  employee: Employee | undefined;
  onClose: () => void;
  onSaved: (shift: Shift) => void;
  onDeleted: (id: string) => void;
  // new-mode fields absent
  newForDate?: undefined;
  scheduleId?: undefined;
  employees?: undefined;
};

type NewProps = {
  newForDate: string;
  scheduleId: string;
  employees: Employee[];
  onClose: () => void;
  onSaved: (shift: Shift) => void;
  // edit-mode fields absent
  shift?: undefined;
  employee?: undefined;
  onDeleted?: undefined;
};

export function ShiftEditorModal(props: EditProps | NewProps) {
  const isNew = "newForDate" in props && !!props.newForDate;

  const [employeeId, setEmployeeId] = useState<string>(
    isNew ? props.employees![0]?.id ?? "" : props.shift!.employee_id,
  );
  const [isDayOff, setIsDayOff] = useState<boolean>(
    isNew ? false : props.shift!.is_day_off,
  );
  const [startTime, setStartTime] = useState<string>(
    (isNew ? "16:00" : props.shift!.start_time?.slice(0, 5) ?? "16:00"),
  );
  const [endTime, setEndTime] = useState<string | null>(
    isNew ? "23:00" : props.shift!.end_time ? props.shift!.end_time.slice(0, 5) : null,
  );
  const [notes, setNotes] = useState<string>(
    isNew ? "" : props.shift!.notes ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    if (isNew) {
      const body = {
        schedule_id: props.scheduleId,
        employee_id: employeeId,
        date: props.newForDate,
        is_day_off: isDayOff,
        start_time: isDayOff ? null : startTime,
        end_time: isDayOff ? null : endTime,
        notes: notes || null,
      };
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaving(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Er ging iets mis");
        return;
      }
      const { shift } = await res.json();
      props.onSaved(shift);
    } else {
      const body = {
        is_day_off: isDayOff,
        start_time: isDayOff ? null : startTime,
        end_time: isDayOff ? null : endTime,
        notes: notes || null,
      };
      const res = await fetch(`/api/shifts/${props.shift!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaving(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Er ging iets mis");
        return;
      }
      const { shift } = await res.json();
      props.onSaved(shift);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    if (!confirm("Shift verwijderen?")) return;
    const res = await fetch(`/api/shifts/${props.shift!.id}`, {
      method: "DELETE",
    });
    if (res.ok) props.onDeleted!(props.shift!.id);
    else alert("Verwijderen mislukt");
  }

  const employeeName = isNew
    ? props.employees!.find((e) => e.id === employeeId)?.name
    : props.employee?.name;

  return (
    <Modal
      title={isNew ? "Shift toevoegen" : `Shift — ${employeeName ?? "?"}`}
      onClose={props.onClose}
    >
      <div className="space-y-4">
        {isNew ? (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
              Medewerker
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="input-dark"
            >
              {props.employees!.length === 0 ? (
                <option value="">Geen medewerkers beschikbaar</option>
              ) : (
                props.employees!.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))
              )}
            </select>
          </div>
        ) : null}

        <label className="flex items-center gap-3 rounded-xl border border-[color:var(--clr-border)] p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isDayOff}
            onChange={(e) => setIsDayOff(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--clr-accent)]"
          />
          <div className="text-sm">
            <div className="font-medium">Vrije dag</div>
            <div className="text-xs text-[color:var(--clr-text-muted)]">
              Markeer als vrij i.p.v. een werkshift
            </div>
          </div>
        </label>

        {!isDayOff ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
                Van
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-dark tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
                Tot
              </label>
              <input
                type="time"
                value={endTime ?? ""}
                onChange={(e) => setEndTime(e.target.value || null)}
                placeholder="tot sluit"
                className="input-dark tabular-nums"
              />
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-[color:var(--clr-text-muted)]">
                <input
                  type="checkbox"
                  checked={endTime === null}
                  onChange={(e) =>
                    setEndTime(e.target.checked ? null : "23:00")
                  }
                  className="h-3.5 w-3.5 accent-[color:var(--clr-accent)]"
                />
                tot sluit
              </label>
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
            Notitie (optioneel)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-dark"
            placeholder="bijv. sluit af"
          />
        </div>

        {error ? (
          <p className="text-sm text-[color:var(--clr-danger)]">{error}</p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-2">
          {!isNew ? (
            <button
              onClick={handleDelete}
              type="button"
              className="inline-flex items-center gap-1.5 text-sm text-[color:var(--clr-danger)] hover:underline"
            >
              <Trash2 className="h-4 w-4" />
              Verwijderen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={props.onClose} className="btn-ghost">
              Annuleren
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (isNew && !employeeId)}
              className="btn-primary disabled:opacity-60"
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
