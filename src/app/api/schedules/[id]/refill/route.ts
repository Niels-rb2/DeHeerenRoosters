import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toISODate } from "@/lib/schedule-utils";
import type {
  Schedule,
  DefaultPattern,
  Shift,
  Employee,
} from "@/types/database";

// Vul ontbrekende shifts aan vanuit de huidige vaste weekpatronen.
// Bestaande shifts worden NIET overschreven — alleen dagen/medewerkers
// zonder shift krijgen er een bij.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const schedRes = await db
    .from("rooster_schedules")
    .select("*")
    .eq("id", id)
    .maybeSingle<Schedule>();
  if (!schedRes.data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  const schedule = schedRes.data;

  const [empRes, patRes, existingRes] = await Promise.all([
    db
      .from("rooster_employees")
      .select("id")
      .eq("is_active", true)
      .returns<Pick<Employee, "id">[]>(),
    db
      .from("rooster_default_patterns")
      .select("*")
      .eq("is_active", true)
      .returns<DefaultPattern[]>(),
    db
      .from("rooster_shifts")
      .select("employee_id, date")
      .eq("schedule_id", id)
      .returns<Pick<Shift, "employee_id" | "date">[]>(),
  ]);

  const activeIds = new Set((empRes.data ?? []).map((e) => e.id));
  const patterns = (patRes.data ?? []).filter((p) => activeIds.has(p.employee_id));
  const existing = new Set(
    (existingRes.data ?? []).map((s) => `${s.employee_id}|${s.date}`),
  );

  const weekDate = new Date(`${schedule.week_start}T00:00:00`);
  const newShifts: Partial<Shift>[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(weekDate);
    d.setDate(d.getDate() + offset);
    const dateStr = toISODate(d);
    const dow = offset;
    for (const p of patterns) {
      if (p.day_of_week !== dow) continue;
      if (existing.has(`${p.employee_id}|${dateStr}`)) continue;
      newShifts.push({
        schedule_id: id,
        employee_id: p.employee_id,
        date: dateStr,
        start_time: p.start_time,
        end_time: p.end_time,
        is_day_off: false,
      });
    }
  }

  if (newShifts.length === 0) {
    return NextResponse.json({ shifts: [], added: 0 });
  }

  const ins = await db
    .from("rooster_shifts")
    .insert(newShifts)
    .select("*")
    .returns<Shift[]>();

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ shifts: ins.data ?? [], added: ins.data?.length ?? 0 });
}
