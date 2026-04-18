import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toISODate, weekStart } from "@/lib/schedule-utils";
import type { Schedule, Shift, DayOverride } from "@/types/database";

// Kopieer een bestaande week naar een nieuwe week_start.
// Body: { target_week_start: "YYYY-MM-DD" } — moet een maandag zijn.
// De nieuwe week bevat dezelfde shifts + day_overrides, alleen de datums
// schuiven mee met het weekoffset.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const target: string | undefined = body?.target_week_start;
  if (!target || !/^\d{4}-\d{2}-\d{2}$/.test(target)) {
    return NextResponse.json(
      { error: "target_week_start ontbreekt" },
      { status: 400 },
    );
  }
  const targetDate = new Date(`${target}T00:00:00`);
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Ongeldige datum" }, { status: 400 });
  }
  const normalized = toISODate(weekStart(targetDate));
  if (normalized !== target) {
    return NextResponse.json(
      { error: "target_week_start moet een maandag zijn" },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  // Bron-rooster + bestaat target al?
  const [srcRes, existingRes] = await Promise.all([
    db
      .from("rooster_schedules")
      .select("*")
      .eq("id", id)
      .maybeSingle<Schedule>(),
    db
      .from("rooster_schedules")
      .select("id")
      .eq("week_start", target)
      .maybeSingle<Pick<Schedule, "id">>(),
  ]);

  if (!srcRes.data) {
    return NextResponse.json({ error: "Bron niet gevonden" }, { status: 404 });
  }
  if (existingRes.data) {
    return NextResponse.json(
      {
        error: "Er bestaat al een rooster voor die week",
        id: existingRes.data.id,
      },
      { status: 409 },
    );
  }

  // Nieuwe schedule row
  const newSched = await db
    .from("rooster_schedules")
    .insert({ week_start: target, status: "draft" })
    .select("*")
    .single<Schedule>();
  if (newSched.error || !newSched.data) {
    return NextResponse.json(
      { error: newSched.error?.message ?? "Kon niet aanmaken" },
      { status: 500 },
    );
  }
  const newScheduleId = newSched.data.id;

  // Haal bron-shifts + overrides op
  const [shiftsRes, overridesRes] = await Promise.all([
    db
      .from("rooster_shifts")
      .select("*")
      .eq("schedule_id", id)
      .returns<Shift[]>(),
    db
      .from("rooster_day_overrides")
      .select("*")
      .eq("schedule_id", id)
      .returns<DayOverride[]>(),
  ]);

  const srcMonday = new Date(`${srcRes.data.week_start}T00:00:00`);
  const offsetMs = targetDate.getTime() - srcMonday.getTime();

  function shiftDate(srcIso: string): string {
    const d = new Date(`${srcIso}T00:00:00`);
    d.setTime(d.getTime() + offsetMs);
    return toISODate(d);
  }

  // Shifts kopiëren
  const newShifts = (shiftsRes.data ?? []).map((s) => ({
    schedule_id: newScheduleId,
    employee_id: s.employee_id,
    date: shiftDate(s.date),
    start_time: s.start_time,
    end_time: s.end_time,
    is_day_off: s.is_day_off,
    notes: s.notes,
  }));
  if (newShifts.length > 0) {
    const ins = await db.from("rooster_shifts").insert(newShifts);
    if (ins.error) {
      await db.from("rooster_schedules").delete().eq("id", newScheduleId);
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }
  }

  // Overrides kopiëren
  const newOverrides = (overridesRes.data ?? []).map((o) => ({
    schedule_id: newScheduleId,
    date: shiftDate(o.date),
    is_closed: o.is_closed,
    custom_open_time: o.custom_open_time,
    custom_close_time: o.custom_close_time,
    title: o.title,
    color: o.color,
    note: o.note,
  }));
  if (newOverrides.length > 0) {
    const ins = await db.from("rooster_day_overrides").insert(newOverrides);
    if (ins.error) {
      // laat het door — override is minder kritiek. rapporteer alleen.
      console.warn("[copy] override insert failed:", ins.error);
    }
  }

  return NextResponse.json({
    schedule: newSched.data,
    shifts_copied: newShifts.length,
    overrides_copied: newOverrides.length,
  });
}
