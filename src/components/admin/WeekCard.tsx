"use client";

import type {
  Schedule,
  Shift,
  DayOverride,
  Employee,
} from "@/types/database";
import type { PartyDisplay } from "@/lib/parties";
import type { CalendarEvent } from "@/lib/google-calendar";
import { CheckCircle2 } from "lucide-react";
import { WeekGrid } from "./WeekGrid";
import { toISODate } from "@/lib/schedule-utils";

export function StatusEyebrow({
  status,
}: {
  status: "draft" | "published";
}) {
  if (status === "published") {
    return (
      <p className="text-xs uppercase tracking-widest font-medium text-[color:var(--clr-success)] inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Gepubliceerd
      </p>
    );
  }
  return (
    <p className="text-xs uppercase tracking-widest font-medium text-[color:var(--clr-accent)]">
      Concept
    </p>
  );
}

type Bundle = {
  schedule: Schedule;
  shifts: Shift[];
  overrides: DayOverride[];
  parties: PartyDisplay[];
  events: CalendarEvent[];
};

type Handlers =
  | {
      variant: "center";
      onAddShift: (employeeId: string, date: string) => void;
      onEditShift: (shift: Shift) => void;
      onEditDay: (date: string) => void;
      headerRight?: React.ReactNode;
    }
  | {
      variant: "side";
      onAddShift?: never;
      onEditShift?: never;
      onEditDay?: never;
      headerRight?: never;
    };

type Props = {
  bundle: Bundle;
  employees: Employee[];
} & Handlers;

export function WeekCard(props: Props) {
  const { bundle, employees } = props;
  const isSide = props.variant === "side";

  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(`${bundle.schedule.week_start}T00:00:00`);
    start.setDate(start.getDate() + i);
    return { dow: i, date: start, iso: toISODate(start) };
  });

  const shiftsByDate = new Map<string, Shift[]>();
  for (const s of bundle.shifts) {
    if (!shiftsByDate.has(s.date)) shiftsByDate.set(s.date, []);
    shiftsByDate.get(s.date)!.push(s);
  }
  const overrideByDate = new Map<string, DayOverride>();
  for (const o of bundle.overrides) overrideByDate.set(o.date, o);
  const partiesByDate = new Map<string, PartyDisplay[]>();
  for (const p of bundle.parties) {
    if (!partiesByDate.has(p.date)) partiesByDate.set(p.date, []);
    partiesByDate.get(p.date)!.push(p);
  }
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const e of bundle.events) {
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, []);
    eventsByDate.get(e.date)!.push(e);
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 min-h-[52px] md:min-h-[60px]">
        <div>
          <StatusEyebrow status={bundle.schedule.status} />
          <h2
            className={`mt-1 tabular-nums leading-none font-medium ${
              isSide ? "text-xl md:text-3xl" : "text-2xl md:text-[2rem]"
            }`}
          >
            {formatRange(bundle.schedule.week_start)}
          </h2>
        </div>
        {!isSide && props.headerRight ? (
          <div className="flex flex-wrap items-center gap-2">
            {props.headerRight}
          </div>
        ) : null}
      </header>

      <WeekGrid
        schedule={bundle.schedule}
        days={days}
        employees={employees}
        shiftsByDate={shiftsByDate}
        overrideByDate={overrideByDate}
        partiesByDate={partiesByDate}
        eventsByDate={eventsByDate}
        onAddShift={isSide ? () => {} : props.onAddShift!}
        onEditShift={isSide ? () => {} : props.onEditShift!}
        onEditDay={isSide ? () => {} : props.onEditDay!}
      />
    </div>
  );
}

function formatRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d
      .toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
      .replace(".", "");
  return `${fmt(start)} – ${fmt(end)}`;
}
