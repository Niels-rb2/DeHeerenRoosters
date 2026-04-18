"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, UserX, UserCheck, Calendar } from "lucide-react";
import type { Employee, DefaultPattern } from "@/types/database";
import { EmployeeFormModal } from "./EmployeeFormModal";
import { PatternEditorModal } from "./PatternEditorModal";
import { DAYS_NL, formatEndTime, formatTime } from "@/lib/schedule-utils";

type Props = {
  initialEmployees: Employee[];
  initialPatternsByEmployee: Record<string, DefaultPattern[]>;
};

export function EmployeesClient({
  initialEmployees,
  initialPatternsByEmployee,
}: Props) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [patternsByEmployee, setPatternsByEmployee] = useState(
    initialPatternsByEmployee,
  );
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [patternFor, setPatternFor] = useState<Employee | null>(null);

  async function toggleActive(emp: Employee) {
    const res = await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !emp.is_active }),
    });
    if (res.ok) {
      const { employee } = await res.json();
      setEmployees((list) =>
        list.map((e) => (e.id === employee.id ? employee : e)),
      );
    } else {
      alert("Kon de status niet wijzigen");
    }
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[color:var(--clr-text-muted)]">
          {employees.filter((e) => e.is_active).length} actief ·{" "}
          {employees.filter((e) => !e.is_active).length} inactief
        </p>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Medewerker toevoegen
        </button>
      </div>

      <ul className="space-y-3">
        {employees.map((emp) => {
          const patterns = patternsByEmployee[emp.id] ?? [];
          return (
            <li
              key={emp.id}
              className={`card p-5 ${!emp.is_active ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {emp.color ? (
                      <span
                        aria-hidden
                        style={{ backgroundColor: emp.color }}
                        className="inline-block h-2.5 w-2.5 rounded-full"
                      />
                    ) : null}
                    <h3 className="text-base font-medium">{emp.name}</h3>
                    {emp.is_admin ? (
                      <span className="rounded-full bg-[color:var(--clr-accent)] text-[color:var(--clr-accent-fg)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        Admin
                      </span>
                    ) : null}
                    {!emp.is_active ? (
                      <span className="rounded-full bg-[color:var(--clr-surface-2)] text-[color:var(--clr-text-muted)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        Inactief
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--clr-text-muted)]">
                    {emp.email}
                  </p>

                  {patterns.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {patterns.map((p) => (
                        <span
                          key={p.id}
                          className="rounded-full border border-[color:var(--clr-border)] px-2.5 py-1 text-xs tabular-nums"
                        >
                          {DAYS_NL[p.day_of_week]} {formatTime(p.start_time)}–
                          {formatEndTime(p.end_time)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[color:var(--clr-text-muted)] italic">
                      Nog geen vast patroon ingesteld
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPatternFor(emp)}
                    className="btn-ghost inline-flex items-center gap-2"
                    title="Vast weekpatroon bewerken"
                  >
                    <Calendar className="h-4 w-4" />
                    Patroon
                  </button>
                  <button
                    onClick={() => setEditing(emp)}
                    className="btn-ghost p-2"
                    title="Gegevens bewerken"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(emp)}
                    className="btn-ghost p-2"
                    title={emp.is_active ? "Deactiveren" : "Heractiveren"}
                  >
                    {emp.is_active ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {creating ? (
        <EmployeeFormModal
          allEmployees={employees}
          onClose={() => setCreating(false)}
          onSaved={(emp) => {
            setEmployees((list) => [...list, emp].sort((a, b) => a.name.localeCompare(b.name)));
            setCreating(false);
          }}
        />
      ) : null}

      {editing ? (
        <EmployeeFormModal
          employee={editing}
          allEmployees={employees}
          onClose={() => setEditing(null)}
          onSaved={(emp) => {
            setEmployees((list) => list.map((e) => (e.id === emp.id ? emp : e)));
            setEditing(null);
          }}
        />
      ) : null}

      {patternFor ? (
        <PatternEditorModal
          employee={patternFor}
          initialPatterns={patternsByEmployee[patternFor.id] ?? []}
          onClose={() => setPatternFor(null)}
          onSaved={(patterns) => {
            setPatternsByEmployee((prev) => ({
              ...prev,
              [patternFor.id]: patterns,
            }));
            setPatternFor(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
