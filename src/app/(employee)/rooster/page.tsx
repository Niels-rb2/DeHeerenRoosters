import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MySchedule } from "@/components/employee/MySchedule";
import { getPartiesInRange } from "@/lib/parties";
import { getCalendarEvents } from "@/lib/google-calendar";
import type {
  Schedule,
  Shift,
  Employee,
  DayOverride,
} from "@/types/database";
import { toISODate, weekStart } from "@/lib/schedule-utils";

export const dynamic = "force-dynamic";

export default async function MyRoosterPage() {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/login");

  const admin = supabaseAdmin();

  // Haal de lopende + eerstvolgende gepubliceerde weken op (max 4).
  const todayMonday = toISODate(weekStart(new Date()));

  const schedulesRes = await admin
    .from("rooster_schedules")
    .select("*")
    .eq("status", "published")
    .gte("week_start", todayMonday)
    .order("week_start", { ascending: true })
    .limit(4)
    .returns<Schedule[]>();

  const schedules = schedulesRes.data ?? [];
  const scheduleIds = schedules.map((s) => s.id);

  let shifts: Shift[] = [];
  let overrides: DayOverride[] = [];
  let employees: Employee[] = [];
  let parties: Awaited<ReturnType<typeof getPartiesInRange>> = [];
  let events: Awaited<ReturnType<typeof getCalendarEvents>> = [];

  if (scheduleIds.length > 0) {
    const fromIso = schedules[0].week_start;
    const last = new Date(`${schedules[schedules.length - 1].week_start}T00:00:00`);
    last.setDate(last.getDate() + 6);
    const toIso = toISODate(last);

    const [sRes, oRes, eRes, pRes, cRes] = await Promise.all([
      admin
        .from("rooster_shifts")
        .select("*")
        .in("schedule_id", scheduleIds)
        .returns<Shift[]>(),
      admin
        .from("rooster_day_overrides")
        .select("*")
        .in("schedule_id", scheduleIds)
        .returns<DayOverride[]>(),
      admin
        .from("rooster_employees")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .returns<Employee[]>(),
      getPartiesInRange(fromIso, toIso),
      getCalendarEvents(fromIso, toIso),
    ]);
    shifts = sRes.data ?? [];
    overrides = oRes.data ?? [];
    employees = eRes.data ?? [];
    parties = pRes;
    events = cRes;
  }

  return (
    <MySchedule
      myEmployeeId={session.user.employeeId}
      schedules={schedules}
      shifts={shifts}
      overrides={overrides}
      employees={employees}
      parties={parties}
      events={events}
    />
  );
}
