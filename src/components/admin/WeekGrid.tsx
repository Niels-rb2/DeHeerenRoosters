"use client";

import { Fragment, useState } from "react";
import { PartyDetailsModal } from "@/components/schedule/PartyDetailsModal";
import { Plus, Settings2, PartyPopper, Music2, Sparkles } from "lucide-react";
import type {
  Employee,
  Shift,
  DayOverride,
  Schedule,
} from "@/types/database";
import type { PartyDisplay } from "@/lib/parties";
import type { CalendarEvent } from "@/lib/google-calendar";
import {
  DAYS_NL_LONG,
  buildDisplayNames,
  defaultCloseTime,
  defaultOpenTime,
  formatTime,
  isOpenDay,
} from "@/lib/schedule-utils";

type Day = { dow: number; date: Date; iso: string };

type Props = {
  schedule: Schedule;
  days: Day[];
  employees: Employee[];
  shiftsByDate: Map<string, Shift[]>;
  overrideByDate: Map<string, DayOverride>;
  partiesByDate: Map<string, PartyDisplay[]>;
  eventsByDate: Map<string, CalendarEvent[]>;
  onAddShift: (employeeId: string, date: string) => void;
  onEditShift: (shift: Shift) => void;
  onEditDay: (date: string) => void;
};

export function WeekGrid({
  schedule,
  days,
  employees,
  shiftsByDate,
  overrideByDate,
  partiesByDate,
  eventsByDate,
  onAddShift,
  onEditShift,
  onEditDay,
}: Props) {
  const readonly = false;

  const displayNames = buildDisplayNames(employees);
  const [selectedParty, setSelectedParty] = useState<PartyDisplay | null>(null);

  // wo t/m zo altijd zichtbaar; ma/di alleen bij uitzondering.
  const visibleDays = days.filter((d) => {
    if (isOpenDay(d.dow)) return true;
    const hasShift = (shiftsByDate.get(d.iso) ?? []).length > 0;
    const override = overrideByDate.get(d.iso);
    const isOpened = !!override?.custom_open_time;
    const hasParty = (partiesByDate.get(d.iso) ?? []).length > 0;
    const hasEvent = (eventsByDate.get(d.iso) ?? []).length > 0;
    return hasShift || isOpened || hasParty || hasEvent;
  });

  // Eén grid voor alles → kolommen delen zich over header + body rijen.
  const templateColumns = `max-content repeat(${visibleDays.length}, minmax(0, 1fr))`;

  return (
    <div
      className="card overflow-hidden grid"
      style={{ gridTemplateColumns: templateColumns }}
    >
      {/* ── Header row ── */}
      <div className="bg-[color:var(--clr-surface-2)] px-4 py-3 text-xs uppercase tracking-widest text-[color:var(--clr-text-muted)] border-b border-[color:var(--clr-border)]">
        Week {isoWeekNumber(schedule.week_start)}
      </div>
      {visibleDays.map((day) => {
        const override = overrideByDate.get(day.iso);
        const isClosed = override?.is_closed ?? false;
        const openTime = override?.custom_open_time ?? defaultOpenTime(day.dow);
        const closeTime = override?.custom_close_time ?? defaultCloseTime(day.dow);
        const parties = partiesByDate.get(day.iso) ?? [];
        const events = eventsByDate.get(day.iso) ?? [];
        const accent = override?.color;

        return (
          <div
            key={`h-${day.iso}`}
            style={
              accent
                ? {
                    backgroundColor: `${accent}1f`,
                    borderTop: `3px solid ${accent}`,
                  }
                : undefined
            }
            className="border-l border-b border-[color:var(--clr-border)] bg-[color:var(--clr-surface-2)] px-3 py-3"
          >
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-xs font-bold text-[color:var(--clr-text)]">
                  {DAYS_NL_LONG[day.dow]}
                </p>
                <p className="mt-0.5 text-sm font-medium tabular-nums text-[color:var(--clr-text-muted)]">
                  {day.date.toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {!readonly ? (
                <button
                  onClick={() => onEditDay(day.iso)}
                  className="rounded-full p-1 text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface)]"
                  title="Dag-instellingen"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {isClosed ? (
              <p className="mt-0.5 text-[11px] text-[color:var(--clr-danger)]">
                Gesloten
              </p>
            ) : openTime ? (
              <p className="mt-0.5 text-[11px] text-[color:var(--clr-text-muted)] tabular-nums">
                {openTime.slice(0, 5)} – {closeTime?.slice(0, 5)}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-[color:var(--clr-text-muted)]">
                Normaal dicht
              </p>
            )}

            {(override?.title || parties.length > 0 || events.length > 0) && (
              <div className="mt-2 space-y-1">
                {override?.title ? (
                  <div
                    className="flex items-start gap-1 rounded-md px-1.5 py-1 text-[10px] leading-tight font-medium"
                    style={{
                      backgroundColor: accent ? `${accent}26` : undefined,
                      color: accent ?? undefined,
                    }}
                    title={override.title}
                  >
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="truncate uppercase tracking-wide">
                      {override.title}
                    </span>
                  </div>
                ) : null}
                {parties.map((p) => (
                  <button
                    key={`p-${p.id}`}
                    type="button"
                    onClick={() => setSelectedParty(p)}
                    className="flex w-full items-start gap-1 rounded-md bg-[color:var(--clr-accent)]/15 px-1.5 py-1 text-left text-[10px] leading-tight hover:bg-[color:var(--clr-accent)]/25 transition-colors"
                    title={`${p.title}${p.guest_count ? ` · ${p.guest_count}p` : ""}`}
                  >
                    <PartyPopper className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--clr-accent)]" />
                    <span className="truncate">
                      {p.title}
                      {p.guest_count ? ` · ${p.guest_count}p` : ""}
                    </span>
                  </button>
                ))}
                {events.map((e) => (
                  <div
                    key={`e-${e.id}`}
                    className="flex items-start gap-1 rounded-md bg-[color:var(--clr-surface)] px-1.5 py-1 text-[10px] leading-tight"
                  >
                    <Music2 className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--clr-text-muted)]" />
                    <span className="truncate" title={e.title}>
                      {e.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Empty state ── */}
      {employees.length === 0 ? (
        <div
          className="p-6 text-center text-sm text-[color:var(--clr-text-muted)]"
          style={{ gridColumn: `1 / span ${visibleDays.length + 1}` }}
        >
          Nog geen medewerkers — voeg ze eerst toe.
        </div>
      ) : null}

      {/* ── Employee rows ── */}
      {employees.map((emp, idx) => (
        <Fragment key={emp.id}>
          <div
            className={`flex items-center gap-2 px-4 py-3 ${
              idx > 0 ? "border-t border-[color:var(--clr-border)]" : ""
            }`}
            style={
              emp.color
                ? {
                    borderLeft: `4px solid ${emp.color}`,
                  }
                : undefined
            }
          >
            <span className="text-sm font-medium truncate" title={emp.name}>
              {displayNames.get(emp.id) ?? emp.name}
            </span>
          </div>

          {visibleDays.map((day) => {
            const dayShifts = shiftsByDate.get(day.iso) ?? [];
            const shift = dayShifts.find((s) => s.employee_id === emp.id);
            const override = overrideByDate.get(day.iso);
            const isClosed = override?.is_closed ?? false;
            // Alleen getinte achtergrond, geen gekleurde border op de cellen.
            const tint = emp.color
              ? { backgroundColor: `${emp.color}1f` }
              : undefined;
            const borderTop = idx > 0 ? "border-t border-[color:var(--clr-border)]" : "";

            if (shift) {
              return (
                <button
                  key={`${emp.id}-${day.iso}`}
                  onClick={readonly ? undefined : () => onEditShift(shift)}
                  disabled={readonly}
                  title={`Shift van ${emp.name} bewerken`}
                  aria-label={`Shift van ${emp.name} bewerken`}
                  style={tint}
                  className={`border-l ${borderTop} border-[color:var(--clr-border)] px-2 py-2 text-left text-xs tabular-nums cursor-pointer hover:brightness-[0.95] hover:outline hover:outline-2 hover:outline-offset-[-2px] hover:outline-[color:var(--clr-accent)]/40 transition-all disabled:cursor-default`}
                >
                  {shift.is_day_off ? (
                    <span className="text-[color:var(--clr-text-muted)] italic">
                      Vrij
                    </span>
                  ) : (
                    <>
                      <span className="font-medium">
                        {formatTime(shift.start_time)}
                      </span>
                      <span className="text-[color:var(--clr-text-muted)]">
                        {" – "}
                        {shift.end_time ? formatTime(shift.end_time) : "sl"}
                      </span>
                      {shift.notes ? (
                        <p
                          className="mt-0.5 truncate text-[10px] text-[color:var(--clr-text-muted)]"
                          title={shift.notes}
                        >
                          {shift.notes}
                        </p>
                      ) : null}
                    </>
                  )}
                </button>
              );
            }

            if (readonly || isClosed) {
              return (
                <div
                  key={`${emp.id}-${day.iso}`}
                  className={`border-l ${borderTop} border-[color:var(--clr-border)] px-2 py-2`}
                />
              );
            }

            return (
              <button
                key={`${emp.id}-${day.iso}`}
                onClick={() => onAddShift(emp.id, day.iso)}
                aria-label={`Shift toevoegen voor ${emp.name}`}
                title={`Shift toevoegen voor ${emp.name}`}
                className={`group border-l ${borderTop} border-[color:var(--clr-border)] px-2 py-2 text-left text-[color:var(--clr-text-muted)] cursor-pointer hover:bg-[color:var(--clr-surface-2)] transition-colors flex items-center`}
              >
                <Plus className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            );
          })}
        </Fragment>
      ))}

      {selectedParty ? (
        <PartyDetailsModal
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
        />
      ) : null}
    </div>
  );
}

function isoWeekNumber(weekStart: string): number {
  const d = new Date(`${weekStart}T00:00:00`);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
