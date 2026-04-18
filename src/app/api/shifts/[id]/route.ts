import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Shift } from "@/types/database";

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

  const update: Partial<Shift> = {};
  if ("start_time" in body) update.start_time = body.start_time || null;
  if ("end_time" in body) update.end_time = body.end_time || null;
  if ("is_day_off" in body) update.is_day_off = Boolean(body.is_day_off);
  if ("notes" in body) update.notes = body.notes || null;

  const { data, error } = await supabaseAdmin()
    .from("rooster_shifts")
    .update(update)
    .eq("id", id)
    .select("*")
    .single<Shift>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ shift: data });
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
    .from("rooster_shifts")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
