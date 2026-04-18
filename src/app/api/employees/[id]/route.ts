import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidColor } from "@/lib/palette";
import type { Employee } from "@/types/database";

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
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });

  const update: Partial<Employee> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.is_admin === "boolean") update.is_admin = body.is_admin;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if ("color" in body) update.color = isValidColor(body.color) ? body.color : null;

  const { data, error } = await supabaseAdmin()
    .from("rooster_employees")
    .update(update)
    .eq("id", id)
    .select("*")
    .single<Employee>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ employee: data });
}

// "Verwijderen" = soft delete: zet is_active=false.
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
    .from("rooster_employees")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
