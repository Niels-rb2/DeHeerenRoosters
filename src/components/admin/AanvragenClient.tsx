"use client";

import { useMemo, useState } from "react";
import type {
  LeaveRequest,
  SwapRequest,
  Employee,
  Shift,
} from "@/types/database";
import { formatEndTime, formatTime } from "@/lib/schedule-utils";

type Props = {
  leaveRequests: LeaveRequest[];
  swapRequests: SwapRequest[];
  employees: Employee[];
  shifts: Shift[];
};

export function AanvragenClient({
  leaveRequests: initialLeave,
  swapRequests: initialSwap,
  employees,
  shifts,
}: Props) {
  const [leave, setLeave] = useState(initialLeave);
  const [swap, setSwap] = useState(initialSwap);

  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);
  const shiftsById = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of shifts) m.set(s.id, s);
    return m;
  }, [shifts]);

  async function reviewLeave(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/leave-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { request } = await res.json();
      setLeave((list) => list.map((r) => (r.id === id ? request : r)));
    } else alert("Mislukt");
  }

  async function reviewSwap(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/swap-requests/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { request } = await res.json();
      setSwap((list) => list.map((r) => (r.id === id ? request : r)));
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Mislukt");
    }
  }

  const pendingLeave = leave.filter((r) => r.status === "pending");
  const pendingSwap = swap.filter((r) => r.status === "pending_admin");
  const awaitingTarget = swap.filter((r) => r.status === "pending_target");

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10 py-8 md:py-12 space-y-12">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-2xl md:text-[2.5rem] font-medium">Aanvragen</h1>
      </div>

      <section>
        <h2 className="text-lg font-medium">
          Verlof{" "}
          {pendingLeave.length > 0 ? (
            <span className="ml-1 rounded-full bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)] px-2 py-0.5 text-xs">
              {pendingLeave.length} nieuw
            </span>
          ) : null}
        </h2>

        {leave.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--clr-text-muted)]">
            Geen verlofaanvragen.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {leave.map((r) => {
              const emp = employeesById.get(r.employee_id);
              return (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{emp?.name ?? "?"}</p>
                      <p className="text-xs text-[color:var(--clr-text-muted)] tabular-nums">
                        {new Date(`${r.date}T00:00:00`).toLocaleDateString(
                          "nl-NL",
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          },
                        )}
                      </p>
                      {r.reason ? (
                        <p className="mt-1 text-xs italic text-[color:var(--clr-text-muted)]">
                          {r.reason}
                        </p>
                      ) : null}
                    </div>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewLeave(r.id, "rejected")}
                          className="btn-ghost text-sm"
                        >
                          Afwijzen
                        </button>
                        <button
                          onClick={() => reviewLeave(r.id, "approved")}
                          className="btn-primary text-sm"
                        >
                          Goedkeuren
                        </button>
                      </div>
                    ) : (
                      <StatusPill status={r.status} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">
          Ruilverzoeken{" "}
          {pendingSwap.length > 0 ? (
            <span className="ml-1 rounded-full bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)] px-2 py-0.5 text-xs">
              {pendingSwap.length} klaar voor review
            </span>
          ) : null}
        </h2>

        {swap.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--clr-text-muted)]">
            Geen ruilverzoeken.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {swap.map((r) => {
              const requester = employeesById.get(r.requester_id);
              const target = employeesById.get(r.target_id);
              const rShift = shiftsById.get(r.requester_shift_id);
              return (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{requester?.name ?? "?"}</span>
                        {" → "}
                        <span className="font-medium">{target?.name ?? "?"}</span>
                      </p>
                      {rShift ? (
                        <p className="text-xs text-[color:var(--clr-text-muted)] tabular-nums">
                          {new Date(`${rShift.date}T00:00:00`).toLocaleDateString("nl-NL", {
                            weekday: "short",
                            day: "numeric",
                            month: "long",
                          })}{" "}
                          · {formatTime(rShift.start_time)} –{" "}
                          {formatEndTime(rShift.end_time)}
                        </p>
                      ) : null}
                    </div>
                    {r.status === "pending_admin" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewSwap(r.id, "rejected")}
                          className="btn-ghost text-sm"
                        >
                          Afwijzen
                        </button>
                        <button
                          onClick={() => reviewSwap(r.id, "approved")}
                          className="btn-primary text-sm"
                        >
                          Goedkeuren
                        </button>
                      </div>
                    ) : (
                      <StatusPill status={r.status} />
                    )}
                  </div>
                </li>
              );
            })}
            {awaitingTarget.length === 0 ? null : null}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Wacht", cls: "bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)]" },
    pending_target: { label: "Wacht op collega", cls: "bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)]" },
    pending_admin: { label: "Wacht op review", cls: "bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)]" },
    approved: { label: "Goedgekeurd", cls: "bg-[color:var(--clr-success)]/20 text-[color:var(--clr-success)]" },
    rejected: { label: "Afgewezen", cls: "bg-[color:var(--clr-danger)]/20 text-[color:var(--clr-danger)]" },
  };
  const entry = map[status] ?? { label: status, cls: "bg-[color:var(--clr-surface-2)]" };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${entry.cls}`}>
      {entry.label}
    </span>
  );
}
