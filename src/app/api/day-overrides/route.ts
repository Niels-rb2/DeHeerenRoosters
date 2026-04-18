import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidColor } from "@/lib/palette";
import type { DayOverride } from "@/types/database";

// Upsert op (schedule_id, date) — één override per dag per rooster.
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.schedule_id || !body?.date) {
    return NextResponse.json({ error: "schedule_id en date zijn verplicht" }, { status: 400 });
  }

  const color = isValidColor(body.color) ? body.color : null;

  const { data, error } = await supabaseAdmin()
    .from("rooster_day_overrides")
    .upsert(
      {
        schedule_id: body.schedule_id,
        date: body.date,
        is_closed: Boolean(body.is_closed),
        custom_open_time: body.custom_open_time || null,
        custom_close_time: body.custom_close_time || null,
        title: body.title?.trim() || null,
        color,
        note: body.note?.trim() || null,
      },
      { onConflict: "schedule_id,date" },
    )
    .select("*")
    .single<DayOverride>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ override: data });
}
