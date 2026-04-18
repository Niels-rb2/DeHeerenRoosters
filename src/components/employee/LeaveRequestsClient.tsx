"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { LeaveRequest } from "@/types/database";

export function LeaveRequestsClient({ initial }: { initial: LeaveRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const [adding, setAdding] = useState(false);

  async function handleCancel(id: string) {
    if (!confirm("Deze aanvraag intrekken?")) return;
    const res = await fetch(`/api/leave-requests/${id}`, { method: "DELETE" });
    if (res.ok) setRequests((list) => list.filter((r) => r.id !== id));
    else alert("Intrekken mislukt");
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Verlof</p>
          <h1 className="mt-2 text-2xl font-medium">Vrije dagen aanvragen</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nieuw
        </button>
      </div>

      {requests.length === 0 ? (
        <p className="mt-8 text-sm text-[color:var(--clr-text-muted)]">
          Je hebt nog geen aanvragen gedaan.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="card flex items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-sm font-medium tabular-nums">
                  {new Date(`${r.date}T00:00:00`).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                {r.reason ? (
                  <p className="text-xs text-[color:var(--clr-text-muted)]">
                    {r.reason}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === "pending" ? (
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="rounded-full p-1.5 text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)]"
                    aria-label="Intrekken"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddLeaveModal
          onClose={() => setAdding(false)}
          onAdded={(r) => {
            setRequests((list) => [r, ...list]);
            setAdding(false);
          }}
        />
      ) : null}
    </main>
  );
}

function StatusBadge({ status }: { status: LeaveRequest["status"] }) {
  const label = { pending: "Wacht", approved: "Goedgekeurd", rejected: "Afgewezen" }[status];
  const cls = {
    pending:
      "bg-[color:var(--clr-warning)]/20 text-[color:var(--clr-warning)]",
    approved:
      "bg-[color:var(--clr-success)]/20 text-[color:var(--clr-success)]",
    rejected:
      "bg-[color:var(--clr-danger)]/20 text-[color:var(--clr-danger)]",
  }[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${cls}`}>{label}</span>
  );
}

function AddLeaveModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (r: LeaveRequest) => void;
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { request } = await res.json();
    onAdded(request);
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
        <h2 className="text-lg font-medium">Nieuwe aanvraag</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-dark tabular-nums"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
              Reden (optioneel)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-dark"
              placeholder="bijv. bruiloft, doktersafspraak"
            />
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
              disabled={submitting || !date}
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? "Versturen…" : "Aanvraag versturen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
