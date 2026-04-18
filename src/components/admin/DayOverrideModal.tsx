"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DAYS_NL_LONG, defaultCloseTime, defaultOpenTime } from "@/lib/schedule-utils";
import { PALETTE } from "@/lib/palette";
import type { DayOverride } from "@/types/database";

type Props = {
  scheduleId: string;
  date: string;
  dow: number;
  existing?: DayOverride;
  onClose: () => void;
  onSaved: (override: DayOverride) => void;
};

export function DayOverrideModal({
  scheduleId,
  date,
  dow,
  existing,
  onClose,
  onSaved,
}: Props) {
  const [isClosed, setIsClosed] = useState(existing?.is_closed ?? false);
  const [customOpen, setCustomOpen] = useState<string>(
    existing?.custom_open_time?.slice(0, 5) ?? "",
  );
  const [customClose, setCustomClose] = useState<string>(
    existing?.custom_close_time?.slice(0, 5) ?? "",
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/day-overrides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedule_id: scheduleId,
        date,
        is_closed: isClosed,
        custom_open_time: customOpen || null,
        custom_close_time: customClose || null,
        title: title.trim() || null,
        color,
        note: note || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { override } = await res.json();
    onSaved(override);
  }

  const defaultOpen = defaultOpenTime(dow);
  const defaultClose = defaultCloseTime(dow);

  return (
    <Modal
      title={`${DAYS_NL_LONG[dow]} ${formatDate(date)}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
            Titel (optioneel)
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="bijv. Koningsdag, WK-finale, Paasbrunch"
            className="input-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-[color:var(--clr-text-muted)]">
            Kleur-accent (optioneel)
          </label>
          <div className="grid grid-cols-8 gap-2">
            {PALETTE.map((c) => {
              const selected = color === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(selected ? null : c.hex)}
                  aria-label={c.label}
                  title={c.label}
                  style={{ backgroundColor: c.hex }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform ${
                    selected
                      ? "ring-2 ring-offset-2 ring-offset-[color:var(--clr-surface)] ring-[color:var(--clr-text)] scale-110"
                      : "hover:scale-105"
                  }`}
                >
                  {selected ? (
                    <Check className="h-4 w-4 text-white drop-shadow" />
                  ) : null}
                </button>
              );
            })}
          </div>
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
            checked={isClosed}
            onChange={(e) => setIsClosed(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--clr-accent)]"
          />
          <div className="text-sm">
            <div className="font-medium">Gesloten</div>
            <div className="text-xs text-[color:var(--clr-text-muted)]">
              Markeer deze dag als gesloten (bijv. feestdag of verbouwing)
            </div>
          </div>
        </label>

        {!isClosed ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
                Open om
              </label>
              <input
                type="time"
                value={customOpen}
                onChange={(e) => setCustomOpen(e.target.value)}
                placeholder={defaultOpen ?? "-"}
                className="input-dark tabular-nums"
              />
              <p className="mt-1 text-[11px] text-[color:var(--clr-text-muted)]">
                Standaard: {defaultOpen ?? "gesloten"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
                Sluit om
              </label>
              <input
                type="time"
                value={customClose}
                onChange={(e) => setCustomClose(e.target.value)}
                placeholder={defaultClose ?? "-"}
                className="input-dark tabular-nums"
              />
              <p className="mt-1 text-[11px] text-[color:var(--clr-text-muted)]">
                Standaard: {defaultClose ?? "gesloten"}
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-medium mb-1.5 text-[color:var(--clr-text-muted)]">
            Notitie (optioneel)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-dark"
            placeholder="bijv. verwacht druk — evenement in de buurt"
          />
        </div>

        {error ? (
          <p className="text-sm text-[color:var(--clr-danger)]">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
