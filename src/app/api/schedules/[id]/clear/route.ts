import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Verwijder alle shifts + day_overrides van dit rooster. De Schedule-row
// blijft bestaan (leeg). Handig bij verbouwingen of volledig opnieuw beginnen.
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

  const [shifts, overrides] = await Promise.all([
    db.from("rooster_shifts").delete().eq("schedule_id", id),
    db.from("rooster_day_overrides").delete().eq("schedule_id", id),
  ]);

  if (shifts.error || overrides.error) {
    return NextResponse.json(
      { error: (shifts.error ?? overrides.error)?.message ?? "Mislukt" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
