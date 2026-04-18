"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type {
  SwapRequest,
  Shift,
  Employee,
} from "@/types/database";
import { formatEndTime, formatTime } from "@/lib/schedule-utils";

type Props = {
  myEmployeeId: string;
  myShifts: Shift[];
  allShifts: Shift[];
  requests: SwapRequest[];
  employees: Employee[];
};

export function SwapRequestsClient({
  myEmployeeId,
  myShifts,
  allShifts,
  requests: initialRequests,
  employees,
}: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [creating, setCreating] = useState(false);

  const shiftsById = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of allShifts) m.set(s.id, s);
    return m;
  }, [allShifts]);
  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  async function respond(req: SwapRequest, accept: boolean) {
    const res = await fetch(`/api/swap-requests/${req.id}/accept`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    if (res.ok) {
      const { request } = await res.json();
      setRequests((list) => list.map((r) => (r.id === request.id ? request : r)));
    } else alert("Mislukt");
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Ruilen</p>
          <h1 className="mt-2 text-2xl font-medium">Diensten ruilen</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          disabled={myShifts.length === 0}
          className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Verzoek
        </button>
      </div>

      {myShifts.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--clr-text-muted)]">
          Je hebt nog geen toekomstige shifts om te ruilen.
        </p>
      ) : null}

      {requests.length === 0 ? (
        <p className="mt-8 text-sm text-[color:var(--clr-text-muted)]">
          Nog geen ruilverzoeken.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => {
            const reqShift = shiftsById.get(r.requester_shift_id);
            const reqEmp = r.requester_id === myEmployeeId ? null : employeesById.get(r.requester_id);
            const isIncoming = r.target_id === myEmployeeId;

            return (
              <li key={r.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[color:var(--clr-text-muted)]">
                      {isIncoming
                        ? `${reqEmp?.name ?? "Collega"} wil ruilen met jou`
                        : `Jouw verzoek aan ${employeesById.get(r.target_id)?.name ?? "?"}`}
                    </p>
                    {reqShift ? (
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {new Date(`${reqShift.date}T00:00:00`).toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {formatTime(reqShift.start_time)} –{" "}
                        {formatEndTime(reqShift.end_time)}
                      </p>
                    ) : null}
                  </div>
                  <SwapStatusBadge status={r.status} />
                </div>

                {isIncoming && r.status === "pending_target" ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => respond(r, false)}
                      className="btn-ghost text-sm"
                    >
                      Afwijzen
                    </button>
                    <button
                      onClick={() => respond(r, true)}
                      className="btn-primary text-sm"
                    >
                      Accepteren
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <NewSwapModal
          myShifts={myShifts}
          employees={employees}
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setRequests((list) => [r, ...list]);
            setCreating(false);
            router.refresh();
          }}
        />
      ) : null}
    </main>
  );
}

function SwapStatusBadge({ status }: { status: SwapRequest["status"] }) {
  const label: Record<SwapRequest["status"], string> = {
    pending_target: "Wacht op collega",
    pending_admin: "Wacht op Suzan",
    approved: "Goedgekeurd",
    rejected: "Afgewezen",
  };
  const cls: Record<SwapRequest["status"], string> = {
    pending_target:
      "bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)]",
    pending_admin:
      "bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)]",
    approved:
      "bg-[color:var(--clr-success)]/20 text-[color:var(--clr-success)]",
    rejected:
      "bg-[color:var(--clr-danger)]/20 text-[color:var(--clr-danger)]",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide ${cls[status]}`}>
      {label[status]}
    </span>
  );
}

function NewSwapModal({
  myShifts,
  employees,
  onClose,
  onCreated,
}: {
  myShifts: Shift[];
  employees: Employee[];
  onClose: () => void;
  onCreated: (r: SwapRequest) => void;
}) {
  const [shiftId, setShiftId] = useState(myShifts[0]?.id ?? "");
  const [targetId, setTargetId] = useState(employees[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/swap-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requester_shift_id: shiftId, target_id: targetId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { request } = await res.json();
    onCreated(request);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md rounded-t-3xl p-6"
      >
        <h2 className="text-lg font-medium">Ruilverzoek</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
              Welke shift wil je ruilen?
            </label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="input-dark"
            >
              {myShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(`${s.date}T00:00:00`).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {formatTime(s.start_time)} – {formatEndTime(s.end_time)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
              Met wie?
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="input-dark"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-sm text-[color:var(--clr-danger)]">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">
              Annuleren
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !shiftId || !targetId}
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? "Versturen…" : "Verzoek versturen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
