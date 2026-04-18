"use client";

import { useMemo } from "react";
import { CalendarX, Users } from "lucide-react";
import type {
  Schedule,
  Shift,
  Employee,
  DayOverride,
} from "@/types/database";
import type { PartyDisplay } from "@/lib/parties";
import type { CalendarEvent } from "@/lib/google-calendar";
import { DayExtras } from "@/components/schedule/DayExtras";
import { PushPermission } from "@/components/pwa/PushPermission";
import { colorStyles } from "@/lib/palette";
import {
  DAYS_NL_LONG,
  defaultCloseTime,
  defaultOpenTime,
  formatEndTime,
  formatTime,
  toISODate,
} from "@/lib/schedule-utils";

type Props = {
  myEmployeeId: string;
  schedules: Schedule[];
  shifts: Shift[];
  overrides: DayOverride[];
  employees: Employee[];
  parties: PartyDisplay[];
  events: CalendarEvent[];
};

export function MySchedule({
  myEmployeeId,
  schedules,
  shifts,
  overrides,
  employees,
  parties,
  events,
}: Props) {
  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const me = employeesById.get(myEmployeeId);
  const todayIso = toISODate(new Date());

  const days = useMemo(() => {
    const list: Array<{ iso: string; date: Date; dow: number; scheduleId: string }> = [];
    for (const sched of schedules) {
      const start = new Date(`${sched.week_start}T00:00:00`);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const iso = toISODate(d);
        if (iso < todayIso) continue;
        list.push({ iso, date: d, dow: i, scheduleId: sched.id });
      }
    }
    return list;
  }, [schedules, todayIso]);

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

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Mijn rooster</p>
          <h1 className="mt-2 text-2xl font-medium">
            Hoi {me?.name?.split(" ")[0] ?? "daar"}
          </h1>
        </div>
        <div className="mt-2">
          <PushPermission />
        </div>
      </div>

      {schedules.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 space-y-3">
          {days.map(({ iso, date, dow }) => {
            const dayShifts = shiftsByDate.get(iso) ?? [];
            const override = overrideByDate.get(iso);
            const myShift = dayShifts.find((s) => s.employee_id === myEmployeeId);
            const otherShifts = dayShifts.filter(
              (s) => s.employee_id !== myEmployeeId && !s.is_day_off,
            );
            const isClosed = override?.is_closed ?? false;
            const openTime = override?.custom_open_time ?? defaultOpenTime(dow);
            const closeTime =
              override?.custom_close_time ?? defaultCloseTime(dow);

            return (
              <article key={iso} className="card p-5">
                <header className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="eyebrow">{DAYS_NL_LONG[dow]}</p>
                    <p className="mt-1 text-lg font-medium tabular-nums">
                      {date.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                  {isClosed ? (
                    <span className="rounded-full bg-[color:var(--clr-danger)]/15 text-[color:var(--clr-danger)] px-2.5 py-1 text-xs uppercase tracking-wide">
                      Gesloten
                    </span>
                  ) : openTime ? (
                    <span className="text-xs text-[color:var(--clr-text-muted)] tabular-nums">
                      {openTime.slice(0, 5)} – {closeTime?.slice(0, 5)}
                    </span>
                  ) : null}
                </header>

                {override?.title ? (
                  <p
                    className="mt-1 text-xs font-medium uppercase tracking-wide"
                    style={override.color ? { color: override.color } : undefined}
                  >
                    {override.title}
                  </p>
                ) : null}
                {override?.note ? (
                  <p className="mt-2 rounded-xl bg-[color:var(--clr-surface-2)] px-3 py-2 text-xs italic text-[color:var(--clr-text-muted)]">
                    {override.note}
                  </p>
                ) : null}

                <DayExtras
                  parties={partiesByDate.get(iso) ?? []}
                  events={eventsByDate.get(iso) ?? []}
                />

                {myShift ? (
                  <div className="mt-4 rounded-2xl bg-[color:var(--clr-accent)] text-[color:var(--clr-accent-fg)] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest opacity-80">
                      Jij werkt
                    </p>
                    <p className="mt-1 text-lg font-medium tabular-nums">
                      {myShift.is_day_off
                        ? "Vrij"
                        : `${formatTime(myShift.start_time)} – ${formatEndTime(myShift.end_time)}`}
                    </p>
                    {myShift.notes ? (
                      <p className="mt-0.5 text-xs opacity-80">
                        {myShift.notes}
                      </p>
                    ) : null}
                  </div>
                ) : !isClosed ? (
                  <p className="mt-4 text-sm text-[color:var(--clr-text-muted)]">
                    Je werkt deze dag niet
                  </p>
                ) : null}

                {otherShifts.length > 0 && !isClosed ? (
                  <div className="mt-4 border-t border-[color:var(--clr-border)] pt-3">
                    <p className="text-xs font-medium text-[color:var(--clr-text-muted)] flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Ook deze dag
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {otherShifts.map((s) => {
                        const emp = employeesById.get(s.employee_id);
                        const tint = colorStyles(emp?.color);
                        return (
                          <li
                            key={s.id}
                            style={tint}
                            className="flex items-center justify-between rounded-lg border border-[color:var(--clr-border)] px-3 py-1.5 text-sm"
                          >
                            <span className="flex items-center gap-2">
                              {emp?.color ? (
                                <span
                                  aria-hidden
                                  style={{ backgroundColor: emp.color }}
                                  className="inline-block h-2 w-2 rounded-full"
                                />
                              ) : null}
                              {emp?.name ?? "?"}
                            </span>
                            <span className="text-[color:var(--clr-text-muted)] tabular-nums">
                              {formatTime(s.start_time)} –{" "}
                              {formatEndTime(s.end_time)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="card mt-8 p-10 text-center">
      <CalendarX className="mx-auto h-10 w-10 text-[color:var(--clr-text-muted)]" />
      <p className="mt-4 text-sm text-[color:var(--clr-text-muted)]">
        Er is nog geen gepubliceerd rooster voor de komende weken.
      </p>
    </div>
  );
}
