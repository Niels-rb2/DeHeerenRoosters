import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  SwapRequest,
  Shift,
  Employee,
  Schedule,
} from "@/types/database";
import { SwapRequestsClient } from "@/components/employee/SwapRequestsClient";
import { toISODate, weekStart } from "@/lib/schedule-utils";

export const dynamic = "force-dynamic";

export default async function RuilenPage() {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/login");

  const me = session.user.employeeId;
  const admin = supabaseAdmin();
  const todayMonday = toISODate(weekStart(new Date()));

  // Toekomstige gepubliceerde roosters (voor selecteerbare shifts).
  const schedulesRes = await admin
    .from("rooster_schedules")
    .select("*")
    .eq("status", "published")
    .gte("week_start", todayMonday)
    .returns<Schedule[]>();

  const scheduleIds = (schedulesRes.data ?? []).map((s) => s.id);

  const [myShiftsRes, requestsRes, employeesRes, allShiftsRes] = await Promise.all([
    scheduleIds.length
      ? admin
          .from("rooster_shifts")
          .select("*")
          .in("schedule_id", scheduleIds)
          .eq("employee_id", me)
          .eq("is_day_off", false)
          .order("date", { ascending: true })
          .returns<Shift[]>()
      : Promise.resolve({ data: [] as Shift[] }),
    admin
      .from("rooster_swap_requests")
      .select("*")
      .or(`requester_id.eq.${me},target_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .returns<SwapRequest[]>(),
    admin
      .from("rooster_employees")
      .select("*")
      .eq("is_active", true)
      .neq("id", me)
      .order("name", { ascending: true })
      .returns<Employee[]>(),
    scheduleIds.length
      ? admin
          .from("rooster_shifts")
          .select("*")
          .in("schedule_id", scheduleIds)
          .returns<Shift[]>()
      : Promise.resolve({ data: [] as Shift[] }),
  ]);

  return (
    <SwapRequestsClient
      myEmployeeId={me}
      myShifts={myShiftsRes.data ?? []}
      allShifts={allShiftsRes.data ?? []}
      requests={requestsRes.data ?? []}
      employees={employeesRes.data ?? []}
    />
  );
}
