import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toISODate, weekStart } from "@/lib/schedule-utils";
import type {
  Schedule,
  Employee,
  DefaultPattern,
  Shift,
} from "@/types/database";

// Medewerker: alleen gepubliceerde roosters. Admin: alles.
export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = supabaseAdmin()
    .from("rooster_schedules")
    .select("*")
    .order("week_start", { ascending: false });

  if (!user.isAdmin) q.eq("status", "published");

  const { data, error } = await q.returns<Schedule[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data });
}

// Maak rooster + vul shifts automatisch vanuit default_patterns.
// Body: { week_start: "YYYY-MM-DD" } — moet een maandag zijn.
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const weekStartStr: string | undefined = body?.week_start;
  if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
    return NextResponse.json({ error: "Ongeldige week_start" }, { status: 400 });
  }
  const weekDate = new Date(`${weekStartStr}T00:00:00`);
  if (isNaN(weekDate.getTime())) {
    return NextResponse.json({ error: "Ongeldige datum" }, { status: 400 });
  }
  const mondayStr = toISODate(weekStart(weekDate));
  if (mondayStr !== weekStartStr) {
    return NextResponse.json(
      { error: "week_start moet een maandag zijn" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  // Bestaat al?
  const existing = await admin
    .from("rooster_schedules")
    .select("id")
    .eq("week_start", weekStartStr)
    .maybeSingle<Pick<Schedule, "id">>();
  if (existing.data) {
    return NextResponse.json(
      { error: "Er bestaat al een rooster voor deze week", id: existing.data.id },
      { status: 409 },
    );
  }

  const schedIns = await admin
    .from("rooster_schedules")
    .insert({ week_start: weekStartStr, status: "draft" })
    .select("*")
    .single<Schedule>();

  if (schedIns.error || !schedIns.data) {
    return NextResponse.json(
      { error: schedIns.error?.message ?? "Kon rooster niet aanmaken" },
      { status: 500 },
    );
  }

  const schedule = schedIns.data;

  // Auto-fill: haal actieve medewerkers + hun patronen op.
  const [empRes, patRes] = await Promise.all([
    admin
      .from("rooster_employees")
      .select("id")
      .eq("is_active", true)
      .returns<Pick<Employee, "id">[]>(),
    admin
      .from("rooster_default_patterns")
      .select("*")
      .eq("is_active", true)
      .returns<DefaultPattern[]>(),
  ]);

  const activeIds = new Set((empRes.data ?? []).map((e) => e.id));
  const patterns = (patRes.data ?? []).filter((p) => activeIds.has(p.employee_id));

  const shifts: Partial<Shift>[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(weekDate);
    d.setDate(d.getDate() + offset);
    const dateStr = toISODate(d);
    const dow = offset; // maandag=0 … zondag=6
    for (const p of patterns) {
      if (p.day_of_week !== dow) continue;
      shifts.push({
        schedule_id: schedule.id,
        employee_id: p.employee_id,
        date: dateStr,
        start_time: p.start_time,
        end_time: p.end_time,
        is_day_off: false,
      });
    }
  }

  if (shifts.length > 0) {
    const shiftIns = await admin.from("rooster_shifts").insert(shifts);
    if (shiftIns.error) {
      // Rollback: verwijder het net aangemaakte rooster
      await admin.from("rooster_schedules").delete().eq("id", schedule.id);
      return NextResponse.json(
        { error: shiftIns.error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    schedule,
    shifts_created: shifts.length,
  });
}
