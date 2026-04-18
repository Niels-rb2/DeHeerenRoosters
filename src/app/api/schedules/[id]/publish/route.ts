import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToAllActive } from "@/lib/push";
import type { Schedule } from "@/types/database";

export async function POST(
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
    .from("rooster_schedules")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single<Schedule>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify all active employees — niet blocken op falende push.
  if (data) {
    const weekLabel = new Date(`${data.week_start}T00:00:00`).toLocaleDateString(
      "nl-NL",
      { day: "numeric", month: "long" },
    );
    sendPushToAllActive({
      title: "Nieuw rooster gepubliceerd",
      body: `Week van ${weekLabel} staat klaar — bekijk je shifts.`,
      url: "/rooster",
    }).catch(() => {});
  }

  return NextResponse.json({ schedule: data });
}
