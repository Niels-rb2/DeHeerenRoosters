import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidColor } from "@/lib/palette";
import type { Employee } from "@/types/database";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("rooster_employees")
    .select("*")
    .order("name", { ascending: true })
    .returns<Employee[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim() || !body?.email?.trim()) {
    return NextResponse.json(
      { error: "Naam en e-mail zijn verplicht" },
      { status: 400 },
    );
  }

  const color = isValidColor(body.color) ? body.color : null;

  const { data, error } = await supabaseAdmin()
    .from("rooster_employees")
    .insert({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      is_admin: Boolean(body.is_admin),
      is_active: true,
      color,
    })
    .select("*")
    .single<Employee>();

  if (error) {
    const msg = error.code === "23505" ? "Deze e-mail staat al in de lijst" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ employee: data });
}
