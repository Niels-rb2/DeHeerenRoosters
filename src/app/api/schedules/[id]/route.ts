import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  Schedule,
  Shift,
  DayOverride,
  Employee,
} from "@/types/database";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = supabaseAdmin();

  const schedRes = await admin
    .from("rooster_schedules")
    .select("*")
    .eq("id", id)
    .maybeSingle<Schedule>();

  if (schedRes.error) {
    return NextResponse.json({ error: schedRes.error.message }, { status: 500 });
  }
  if (!schedRes.data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  const schedule = schedRes.data;
  if (!user.isAdmin && schedule.status !== "published") {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const [shiftsRes, overridesRes, employeesRes] = await Promise.all([
    admin
      .from("rooster_shifts")
      .select("*")
      .eq("schedule_id", id)
      .returns<Shift[]>(),
    admin
      .from("rooster_day_overrides")
      .select("*")
      .eq("schedule_id", id)
      .returns<DayOverride[]>(),
    admin
      .from("rooster_employees")
      .select("*")
      .order("name", { ascending: true })
      .returns<Employee[]>(),
  ]);

  return NextResponse.json({
    schedule,
    shifts: shiftsRes.data ?? [],
    overrides: overridesRes.data ?? [],
    employees: employeesRes.data ?? [],
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Partial<Schedule> = {};
  if (body.status === "draft" || body.status === "published") update.status = body.status;

  const { data, error } = await supabaseAdmin()
    .from("rooster_schedules")
    .update(update)
    .eq("id", id)
    .select("*")
    .single<Schedule>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedule: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await supabaseAdmin()
    .from("rooster_schedules")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
