"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
} from "lucide-react";
import type {
  Schedule,
  Shift,
  DayOverride,
  Employee,
} from "@/types/database";
import type { PartyDisplay } from "@/lib/parties";
import type { CalendarEvent } from "@/lib/google-calendar";
import { DayExtras } from "@/components/schedule/DayExtras";
import {
  DAYS_NL_LONG,
  defaultCloseTime,
  defaultOpenTime,
  formatEndTime,
  formatTime,
  toISODate,
} from "@/lib/schedule-utils";
import { ShiftEditorModal } from "./ShiftEditorModal";
import { DayOverrideModal } from "./DayOverrideModal";
import { BulkShiftModal } from "./BulkShiftModal";
import { WeekGrid } from "./WeekGrid";
import { WeekCard, StatusEyebrow } from "./WeekCard";
import { ScheduleActionsMenu } from "./ScheduleActionsMenu";
import { CopyWeekButton } from "./CopyWeekButton";
import { Printer } from "lucide-react";
import { isOpenDay } from "@/lib/schedule-utils";
import { colorStyles } from "@/lib/palette";

type WeekBundle = {
  schedule: Schedule;
  shifts: Shift[];
  overrides: DayOverride[];
  parties: PartyDisplay[];
  events: CalendarEvent[];
};

type Props = {
  schedule: Schedule;
  initialShifts: Shift[];
  initialOverrides: DayOverride[];
  employees: Employee[];
  parties: PartyDisplay[];
  events: CalendarEvent[];
  prevWeek?: WeekBundle | null;
  nextWeek?: WeekBundle | null;
};

export function ScheduleEditor({
  schedule,
  initialShifts,
  initialOverrides,
  prevWeek = null,
  nextWeek = null,
  employees,
  parties,
  events,
}: Props) {
  const router = useRouter();
  const [shifts, setShifts] = useState(initialShifts);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [addingShiftFor, setAddingShiftFor] = useState<string | null>(null);
  const [addingSingleShift, setAddingSingleShift] = useState<{
    employeeId: string;
    date: string;
  } | null>(null);
  const [editingOverrideDate, setEditingOverrideDate] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [sliding, setSliding] = useState<"prev" | "next" | null>(null);

  function triggerSlide(direction: "prev" | "next") {
    setSliding(direction);
  }

  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const days = useMemo(() => {
    const start = new Date(`${schedule.week_start}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { dow: i, date: d, iso: toISODate(d) };
    });
  }, [schedule.week_start]);

  const shiftsByDate = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
    }
    return m;
  }, [shifts]);

  const overrideByDate = useMemo(() => {
    const m = new Map<string, DayOverride>();
    for (const o of overrides) m.set(o.date, o);
    return m;
  }, [overrides]);

  const partiesByDate = useMemo(() => {
    const m = new Map<string, PartyDisplay[]>();
    for (const p of parties) {
      if (!m.has(p.date)) m.set(p.date, []);
      m.get(p.date)!.push(p);
    }
    return m;
  }, [parties]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return m;
  }, [events]);

  async function handleRefill() {
    if (
      !confirm(
        "Ontbrekende shifts aanvullen vanuit de vaste weekpatronen? Bestaande shifts worden niet gewijzigd.",
      )
    )
      return;
    setRefilling(true);
    const res = await fetch(`/api/schedules/${schedule.id}/refill`, {
      method: "POST",
    });
    setRefilling(false);
    if (!res.ok) {
      alert("Aanvullen mislukt");
      return;
    }
    const { shifts: added, added: count } = await res.json();
    if (count === 0) {
      alert("Geen ontbrekende shifts gevonden.");
      return;
    }
    setShifts((list) => [...list, ...added]);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/schedules/${schedule.id}/publish`, {
      method: "POST",
    });
    setPublishing(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Publiceren mislukt");
    }
  }

  return (
    <main className="pb-20 md:pb-0">
      {/* Top bar heeft dezelfde breedte en horizontale positie als de
          center WeekCard — zo lijnt "Alle roosters" precies uit met het
          woord CONCEPT in de kaarttitel. */}
      <div className="mx-auto w-[min(64rem,calc(100vw-18rem))] pt-8 md:pt-12">
        <div className="relative flex items-center">
          <Link
            href="/admin/roosters"
            className="inline-flex items-center gap-1.5 text-sm text-[color:var(--clr-text-muted)] hover:text-[color:var(--clr-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Alle roosters
          </Link>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-3">
              <NavArrow
                href={
                  prevWeek ? `/admin/roosters/${prevWeek.schedule.id}` : null
                }
                direction="prev"
                onNavigate={(dir) => triggerSlide(dir)}
              />
              <span className="eyebrow tabular-nums">
                Week {isoWeekNumber(schedule.week_start)}
              </span>
              <NavArrow
                href={
                  nextWeek ? `/admin/roosters/${nextWeek.schedule.id}` : null
                }
                direction="next"
                onNavigate={(dir) => triggerSlide(dir)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* De actie-knoppen zitten nu in de header van de center-kaart zodat
          ze samen met de datums mee-animeren tijdens het slidenavigatie. */}

      {/* Desktop: drie volledige week-kaarten naast elkaar.
          Prev en next hebben dezelfde afmeting als center en peeken
          vanaf de zijkanten (overflow-x-clip op wrapper). */}
      <section
        key={schedule.id}
        className="mt-8 hidden md:block relative overflow-x-clip motion-safe:animate-[rooster-fadein_240ms_ease-out]"
      >
        <div
          onTransitionEnd={() => {
            // Navigatie pas na afronden van de slide-animatie.
            if (sliding === "prev" && prevWeek) {
              router.push(`/admin/roosters/${prevWeek.schedule.id}`);
            } else if (sliding === "next" && nextWeek) {
              router.push(`/admin/roosters/${nextWeek.schedule.id}`);
            }
          }}
          style={{
            transform:
              sliding === "next"
                ? "translateX(calc(-1 * (min(64rem, 100vw - 18rem) + 2rem)))"
                : sliding === "prev"
                  ? "translateX(calc(min(64rem, 100vw - 18rem) + 2rem))"
                  : "translateX(0)",
            transition: sliding
              ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease-out"
              : undefined,
            opacity: sliding ? 0.4 : 1,
          }}
          className="flex items-start justify-center gap-8 px-5 md:px-10"
        >
          {prevWeek ? (
            <Link
              href={`/admin/roosters/${prevWeek.schedule.id}`}
              aria-label="Naar vorige week"
              title="Naar vorige week"
              data-print="side"
              className="w-[min(64rem,calc(100vw-18rem))] flex-none opacity-50 hover:opacity-75 transition-opacity"
            >
              <div className="pointer-events-none">
                <WeekCard
                  bundle={prevWeek}
                  employees={employees}
                  variant="side"
                />
              </div>
            </Link>
          ) : (
            // Onzichtbare placeholder zodat het center altijd gecentreerd blijft
            <div
              aria-hidden
              className="w-[min(64rem,calc(100vw-18rem))] flex-none invisible"
            />
          )}

          <div
            data-print="center"
            className="w-[min(64rem,calc(100vw-18rem))] flex-none"
          >
            <WeekCard
              bundle={{
                schedule,
                shifts,
                overrides,
                parties,
                events,
              }}
              employees={employees}
              variant="center"
              onAddShift={(employeeId, date) =>
                setAddingSingleShift({ employeeId, date })
              }
              onEditShift={(s) => setEditingShift(s)}
              onEditDay={(iso) => setEditingOverrideDate(iso)}
              headerRight={
                <>
                  <CopyWeekButton
                    scheduleId={schedule.id}
                    scheduleWeekStart={schedule.week_start}
                  />
                  <button
                    onClick={() => setTimeout(() => window.print(), 50)}
                    aria-label="Print weekrooster"
                    data-tooltip="Print weekrooster"
                    className="h-10 w-10 rounded-full bg-[color:var(--clr-text)] text-[color:var(--clr-bg)] flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <ScheduleActionsMenu
                    scheduleId={schedule.id}
                    days={days}
                    overrideByDate={overrideByDate}
                    onPickDay={(iso) => setEditingOverrideDate(iso)}
                    onRefill={handleRefill}
                    refilling={refilling}
                  />
                  {schedule.status === "draft" ? (
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {publishing ? "Publiceren…" : "Publiceren"}
                    </button>
                  ) : null}
                </>
              }
            />
          </div>

          {nextWeek ? (
            <Link
              href={`/admin/roosters/${nextWeek.schedule.id}`}
              aria-label="Naar volgende week"
              title="Naar volgende week"
              data-print="side"
              className="w-[min(64rem,calc(100vw-18rem))] flex-none opacity-50 hover:opacity-75 transition-opacity"
            >
              <div className="pointer-events-none">
                <WeekCard
                  bundle={nextWeek}
                  employees={employees}
                  variant="side"
                />
              </div>
            </Link>
          ) : (
            <div
              aria-hidden
              className="w-[min(64rem,calc(100vw-18rem))] flex-none invisible"
            />
          )}
        </div>
      </section>

      {/* Mobile: dag-kaarten */}
      <div className="mx-auto max-w-5xl px-5 mt-8 space-y-4 md:hidden">
        {days.map(({ dow, date, iso }) => {
          const dayShifts = shiftsByDate.get(iso) ?? [];
          const override = overrideByDate.get(iso);
          const isClosed = override?.is_closed ?? false;
          const openTime = override?.custom_open_time ?? defaultOpenTime(dow);
          const closeTime =
            override?.custom_close_time ?? defaultCloseTime(dow);

          return (
            <section
              key={iso}
              className={`card p-5 md:p-6 ${isClosed ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{DAYS_NL_LONG[dow]}</p>
                  <p className="mt-1 text-lg font-medium tabular-nums">
                    {date.toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  {isClosed ? (
                    <p className="mt-1 text-sm text-[color:var(--clr-danger)]">
                      Gesloten
                    </p>
                  ) : openTime ? (
                    <p className="mt-1 text-sm text-[color:var(--clr-text-muted)] tabular-nums">
                      {openTime.slice(0, 5)} – {closeTime?.slice(0, 5)} uur
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[color:var(--clr-text-muted)]">
                      Normaal gesloten
                    </p>
                  )}
                  {override?.title ? (
                    <p
                      className="mt-1 text-xs font-medium uppercase tracking-wide"
                      style={override.color ? { color: override.color } : undefined}
                    >
                      {override.title}
                    </p>
                  ) : null}
                  {override?.note ? (
                    <p className="mt-2 text-xs italic text-[color:var(--clr-text-muted)]">
                      {override.note}
                    </p>
                  ) : null}

                  <DayExtras
                    parties={partiesByDate.get(iso) ?? []}
                    events={eventsByDate.get(iso) ?? []}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {true ? (
                    <>
                      <button
                        onClick={() => setEditingOverrideDate(iso)}
                        className="btn-ghost inline-flex items-center gap-2"
                        title="Dag-instellingen"
                      >
                        <Settings2 className="h-4 w-4" />
                        Dag
                      </button>
                      <button
                        onClick={() => setAddingShiftFor(iso)}
                        className="btn-ghost inline-flex items-center gap-2"
                        disabled={isClosed}
                      >
                        <Plus className="h-4 w-4" />
                        Shift
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {!isClosed ? (
                <ul className="mt-4 space-y-2">
                  {dayShifts.length === 0 ? (
                    <li className="text-sm text-[color:var(--clr-text-muted)] italic">
                      Nog geen shifts ingepland
                    </li>
                  ) : (
                    dayShifts.map((shift) => {
                      const emp = employeesById.get(shift.employee_id);
                      const tint = colorStyles(emp?.color);
                      return (
                        <li
                          key={shift.id}
                          style={tint}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--clr-border)] px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {emp?.name ?? "Onbekend"}
                            </p>
                            <p className="text-xs text-[color:var(--clr-text-muted)] tabular-nums">
                              {shift.is_day_off
                                ? "Vrij"
                                : `${formatTime(shift.start_time)} – ${formatEndTime(shift.end_time)}`}
                              {shift.notes ? ` · ${shift.notes}` : null}
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingShift(shift)}
                            className="btn-ghost text-xs"
                          >
                            Bewerken
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {editingShift ? (
        <ShiftEditorModal
          shift={editingShift}
          employee={employeesById.get(editingShift.employee_id)}
          onClose={() => setEditingShift(null)}
          onSaved={(updated) => {
            setShifts((list) =>
              list.map((s) => (s.id === updated.id ? updated : s)),
            );
            setEditingShift(null);
          }}
          onDeleted={(id) => {
            setShifts((list) => list.filter((s) => s.id !== id));
            setEditingShift(null);
          }}
        />
      ) : null}

      {addingShiftFor ? (
        <BulkShiftModal
          scheduleId={schedule.id}
          date={addingShiftFor}
          isNormallyClosed={
            !isOpenDay(
              days.find((d) => d.iso === addingShiftFor)?.dow ?? 0,
            )
          }
          hasOverride={overrideByDate.has(addingShiftFor)}
          availableEmployees={employees.filter(
            (e) =>
              !(shiftsByDate.get(addingShiftFor) ?? []).some(
                (s) => s.employee_id === e.id,
              ),
          )}
          onClose={() => setAddingShiftFor(null)}
          onSaved={(created, override) => {
            if (created.length > 0) {
              setShifts((list) => [...list, ...created]);
            }
            if (override) {
              setOverrides((list) => {
                const idx = list.findIndex((o) => o.date === override.date);
                if (idx >= 0) return list.map((o, i) => (i === idx ? override : o));
                return [...list, override];
              });
            }
            setAddingShiftFor(null);
          }}
        />
      ) : null}

      {addingSingleShift ? (
        <ShiftEditorModal
          newForDate={addingSingleShift.date}
          scheduleId={schedule.id}
          employees={employees.filter(
            (e) => e.id === addingSingleShift.employeeId,
          )}
          onClose={() => setAddingSingleShift(null)}
          onSaved={(created) => {
            setShifts((list) => [...list, created]);
            setAddingSingleShift(null);
          }}
        />
      ) : null}

      {editingOverrideDate ? (
        <DayOverrideModal
          scheduleId={schedule.id}
          date={editingOverrideDate}
          existing={overrideByDate.get(editingOverrideDate)}
          dow={days.find((d) => d.iso === editingOverrideDate)!.dow}
          onClose={() => setEditingOverrideDate(null)}
          onSaved={(saved) => {
            setOverrides((list) => {
              const idx = list.findIndex((o) => o.date === saved.date);
              if (idx >= 0) return list.map((o, i) => (i === idx ? saved : o));
              return [...list, saved];
            });
            setEditingOverrideDate(null);
          }}
        />
      ) : null}
    </main>
  );
}

function NavArrow({
  href,
  direction,
  onNavigate,
}: {
  href: string | null;
  direction: "prev" | "next";
  onNavigate: (d: "prev" | "next") => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Vorige week" : "Volgende week";

  if (!href) {
    return (
      <button
        disabled
        aria-label={label}
        data-tooltip={label}
        className="h-10 w-10 rounded-full border border-[color:var(--clr-border)] bg-[color:var(--clr-surface)] flex items-center justify-center opacity-30 cursor-not-allowed"
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      onClick={() => onNavigate(direction)}
      className="h-10 w-10 rounded-full border border-[color:var(--clr-border)] bg-[color:var(--clr-surface)] flex items-center justify-center hover:bg-[color:var(--clr-surface-2)] transition-colors"
    >
      <Icon className="h-5 w-5" />
    </button>
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

function formatWeekHeader(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d
      .toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
      .replace(".", "");
  return `${fmt(start)} – ${fmt(end)}`;
}
