import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DefaultPattern } from "@/types/database";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from("rooster_default_patterns")
    .select("*")
    .eq("employee_id", id)
    .order("day_of_week", { ascending: true })
    .returns<DefaultPattern[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patterns: data });
}

// Volledige vervanging: wis bestaande patronen voor medewerker, schrijf nieuwe set.
// Body: { patterns: [{ day_of_week, start_time, end_time }, ...] }
// end_time mag null zijn = "tot sluit".
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const patterns: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string | null;
  }> = Array.isArray(body?.patterns) ? body.patterns : [];

  for (const p of patterns) {
    if (
      typeof p.day_of_week !== "number" ||
      p.day_of_week < 0 ||
      p.day_of_week > 6 ||
      typeof p.start_time !== "string"
    ) {
      return NextResponse.json({ error: "Ongeldig patroon" }, { status: 400 });
    }
  }

  const admin = supabaseAdmin();

  const del = await admin
    .from("rooster_default_patterns")
    .delete()
    .eq("employee_id", id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }

  if (patterns.length === 0) {
    return NextResponse.json({ patterns: [] });
  }

  const rows = patterns.map((p) => ({
    employee_id: id,
    day_of_week: p.day_of_week,
    start_time: p.start_time,
    end_time: p.end_time,
    is_active: true,
  }));

  const ins = await admin
    .from("rooster_default_patterns")
    .insert(rows)
    .select("*")
    .returns<DefaultPattern[]>();

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ patterns: ins.data });
}
