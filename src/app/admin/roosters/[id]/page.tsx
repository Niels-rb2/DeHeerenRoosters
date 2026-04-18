import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { getPartiesInRange } from "@/lib/parties";
import { getCalendarEvents } from "@/lib/google-calendar";
import { toISODate } from "@/lib/schedule-utils";
import type {
  Schedule,
  Shift,
  DayOverride,
  Employee,
} from "@/types/database";
import type { PartyDisplay } from "@/lib/parties";
import type { CalendarEvent } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

type WeekBundle = {
  schedule: Schedule;
  shifts: Shift[];
  overrides: DayOverride[];
  parties: PartyDisplay[];
  events: CalendarEvent[];
} | null;

async function loadWeek(
  scheduleId: string | null,
): Promise<WeekBundle> {
  if (!scheduleId) return null;
  const admin = supabaseAdmin();

  const schedRes = await admin
    .from("rooster_schedules")
    .select("*")
    .eq("id", scheduleId)
    .maybeSingle<Schedule>();
  if (!schedRes.data) return null;
  const schedule = schedRes.data;

  const weekEnd = new Date(`${schedule.week_start}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndIso = toISODate(weekEnd);

  const [shiftsRes, overridesRes, parties, events] = await Promise.all([
    admin
      .from("rooster_shifts")
      .select("*")
      .eq("schedule_id", scheduleId)
      .returns<Shift[]>(),
    admin
      .from("rooster_day_overrides")
      .select("*")
      .eq("schedule_id", scheduleId)
      .returns<DayOverride[]>(),
    getPartiesInRange(schedule.week_start, weekEndIso),
    getCalendarEvents(schedule.week_start, weekEndIso),
  ]);

  return {
    schedule,
    shifts: shiftsRes.data ?? [],
    overrides: overridesRes.data ?? [],
    parties,
    events,
  };
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = supabaseAdmin();

  const center = await loadWeek(id);
  if (!center) notFound();

  // Zoek de buren op basis van week_start ± 7 dagen.
  const centerDate = new Date(`${center.schedule.week_start}T00:00:00`);
  const prevDate = new Date(centerDate);
  prevDate.setDate(prevDate.getDate() - 7);
  const nextDate = new Date(centerDate);
  nextDate.setDate(nextDate.getDate() + 7);

  const [prevRow, nextRow] = await Promise.all([
    admin
      .from("rooster_schedules")
      .select("id")
      .eq("week_start", toISODate(prevDate))
      .maybeSingle<Pick<Schedule, "id">>(),
    admin
      .from("rooster_schedules")
      .select("id")
      .eq("week_start", toISODate(nextDate))
      .maybeSingle<Pick<Schedule, "id">>(),
  ]);

  const [prev, next, employeesRes] = await Promise.all([
    loadWeek(prevRow.data?.id ?? null),
    loadWeek(nextRow.data?.id ?? null),
    admin
      .from("rooster_employees")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<Employee[]>(),
  ]);

  return (
    <ScheduleEditor
      schedule={center.schedule}
      initialShifts={center.shifts}
      initialOverrides={center.overrides}
      parties={center.parties}
      events={center.events}
      employees={employeesRes.data ?? []}
      prevWeek={prev}
      nextWeek={next}
    />
  );
}
