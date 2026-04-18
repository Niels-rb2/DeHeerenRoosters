"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PALETTE } from "@/lib/palette";
import type { Employee } from "@/types/database";

type Props = {
  employee?: Employee;
  allEmployees?: Employee[]; // om al-gebruikte kleuren te tonen
  onClose: () => void;
  onSaved: (emp: Employee) => void;
};

export function EmployeeFormModal({
  employee,
  allEmployees = [],
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!employee;
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [isAdmin, setIsAdmin] = useState(employee?.is_admin ?? false);
  const [color, setColor] = useState<string | null>(employee?.color ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Welke kleuren zijn al in gebruik door anderen? (huidige medewerker niet meetellen)
  const takenByOther = new Map<string, string>();
  for (const e of allEmployees) {
    if (!e.color) continue;
    if (employee && e.id === employee.id) continue;
    takenByOther.set(e.color.toLowerCase(), e.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body = isEdit
      ? { name, is_admin: isAdmin, color }
      : { name, email, is_admin: isAdmin, color };

    const url = isEdit ? `/api/employees/${employee!.id}` : "/api/employees";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { employee: saved } = await res.json();
    onSaved(saved);
  }

  return (
    <Modal
      title={isEdit ? "Medewerker bewerken" : "Nieuwe medewerker"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
            Naam
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-dark"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
            Google e-mailadres
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            disabled={isEdit}
            className="input-dark disabled:opacity-60"
            placeholder="naam@gmail.com"
          />
          {isEdit ? (
            <p className="mt-1.5 text-xs text-[color:var(--clr-text-muted)]">
              E-mail kan niet worden gewijzigd — maak eventueel een nieuwe
              medewerker aan.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-[color:var(--clr-text-muted)]">
            Kleur
          </label>
          <div className="grid grid-cols-8 gap-2">
            {PALETTE.map((c) => {
              const ownerName = takenByOther.get(c.hex.toLowerCase());
              const taken = !!ownerName;
              const selected = color === c.hex;
              const tooltip = taken
                ? `${c.label} · in gebruik door ${ownerName}`
                : c.label;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() =>
                    !taken && setColor(selected ? null : c.hex)
                  }
                  disabled={taken}
                  aria-label={tooltip}
                  title={tooltip}
                  style={{ backgroundColor: c.hex }}
                  className={`relative h-8 w-8 rounded-full flex items-center justify-center transition-transform ${
                    selected
                      ? "ring-2 ring-offset-2 ring-offset-[color:var(--clr-surface)] ring-[color:var(--clr-text)] scale-110"
                      : taken
                        ? "opacity-30 cursor-not-allowed"
                        : "hover:scale-105"
                  }`}
                >
                  {selected ? (
                    <Check className="h-4 w-4 text-white drop-shadow" />
                  ) : null}
                  {taken && !selected ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="h-px w-5 rotate-45 bg-white/80" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {color
            ? (() => {
                const label = PALETTE.find((p) => p.hex === color)?.label;
                return label ? (
                  <p className="mt-2 text-xs text-[color:var(--clr-text-muted)]">
                    Gekozen: <span className="text-[color:var(--clr-text)]">{label}</span>
                  </p>
                ) : null;
              })()
            : null}
          {color ? (
            <button
              type="button"
              onClick={() => setColor(null)}
              className="mt-2 text-xs text-[color:var(--clr-text-muted)] hover:underline"
            >
              Geen kleur
            </button>
          ) : null}
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[color:var(--clr-border)] p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--clr-accent)]"
          />
          <div className="flex-1 text-sm">
            <div className="font-medium">Admin-rechten</div>
            <div className="text-xs text-[color:var(--clr-text-muted)]">
              Kan roosters maken en aanvragen goedkeuren
            </div>
          </div>
        </label>

        {error ? (
          <p className="text-sm text-[color:var(--clr-danger)]">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Annuleren
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
