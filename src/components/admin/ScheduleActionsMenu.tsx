"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  CalendarPlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { DayOverride } from "@/types/database";

type Props = {
  scheduleId: string;
  days: { dow: number; date: Date; iso: string }[];
  overrideByDate: Map<string, DayOverride>;
  onPickDay: (iso: string) => void;
  onRefill: () => Promise<void> | void;
  refilling: boolean;
};

export function ScheduleActionsMenu({
  scheduleId,
  days,
  overrideByDate,
  onPickDay,
  onRefill,
  refilling,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "add-day">("idle");
  const [busy, setBusy] = useState(false);

  // Kandidaten voor "dag toevoegen": ma/di die nog niet expliciet open staan.
  const dayCandidates = days.filter(
    (d) =>
      (d.dow === 0 || d.dow === 1) &&
      !overrideByDate.get(d.iso)?.custom_open_time,
  );

  async function handleClear() {
    if (
      !confirm(
        "Weet je zeker dat je alle shifts van deze week wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/schedules/${scheduleId}/clear`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) {
      alert("Leegmaken mislukt");
      return;
    }
    router.refresh();
    setOpen(false);
  }

  async function handleRefillClick() {
    setOpen(false);
    await onRefill();
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setMode("idle");
        }}
        aria-label="Meer acties"
        data-tooltip="Meer acties"
        className="h-10 w-10 rounded-full bg-[color:var(--clr-text)] text-[color:var(--clr-bg)] flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setOpen(false);
              setMode("idle");
            }}
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-72 card p-1.5 shadow-lg">
            {mode === "idle" ? (
              <div className="space-y-0.5">
                <MenuItem
                  icon={<CalendarPlus className="h-4 w-4" />}
                  label="Dag toevoegen"
                  sub={
                    dayCandidates.length === 0
                      ? "Geen gesloten dagen beschikbaar"
                      : "Open een maandag of dinsdag"
                  }
                  disabled={dayCandidates.length === 0}
                  onClick={() => setMode("add-day")}
                />
                <MenuItem
                  icon={
                    <RotateCcw
                      className={`h-4 w-4 ${refilling ? "animate-spin" : ""}`}
                    />
                  }
                  label="Rooster verversen"
                  sub="Vul ontbrekende shifts aan uit vaste patronen"
                  onClick={handleRefillClick}
                  disabled={refilling}
                />
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Maak deze week leeg"
                  sub="Verwijder alle shifts en dag-instellingen"
                  onClick={handleClear}
                  disabled={busy}
                  danger
                />
              </div>
            ) : null}

            {mode === "add-day" ? (
              <div className="p-1.5">
                <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-[color:var(--clr-text-muted)]">
                  Normaal gesloten dagen
                </p>
                {dayCandidates.map((d) => (
                  <button
                    key={d.iso}
                    onClick={() => {
                      onPickDay(d.iso);
                      setOpen(false);
                      setMode("idle");
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[color:var(--clr-surface-2)]"
                  >
                    <span className="font-medium">
                      {d.date.toLocaleDateString("nl-NL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                    <span className="block text-xs text-[color:var(--clr-text-muted)]">
                      Open deze dag voor bijv. een borrel
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setMode("idle")}
                  className="mt-1 px-3 py-1.5 text-xs text-[color:var(--clr-text-muted)] hover:underline"
                >
                  ← Terug
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  sub,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-[color:var(--clr-surface-2)]"
      } ${danger ? "text-[color:var(--clr-danger)]" : ""}`}
    >
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {sub ? (
          <span className="block text-xs text-[color:var(--clr-text-muted)]">
            {sub}
          </span>
        ) : null}
      </span>
    </button>
  );
}
