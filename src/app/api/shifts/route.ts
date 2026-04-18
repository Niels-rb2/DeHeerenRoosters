import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Shift } from "@/types/database";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body?.schedule_id ||
    !body?.employee_id ||
    !body?.date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.date)
  ) {
    return NextResponse.json({ error: "Ongeldige velden" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("rooster_shifts")
    .insert({
      schedule_id: body.schedule_id,
      employee_id: body.employee_id,
      date: body.date,
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      is_day_off: Boolean(body.is_day_off),
      notes: body.notes ?? null,
    })
    .select("*")
    .single<Shift>();

  if (error) {
    const msg =
      error.code === "23505"
        ? "Deze medewerker heeft al een shift op deze datum"
        : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ shift: data });
}
