import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EventKeyword } from "@/types/database";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data } = await supabaseAdmin()
    .from("rooster_event_keywords")
    .select("*")
    .order("keyword", { ascending: true })
    .returns<EventKeyword[]>();
  return NextResponse.json({ keywords: data ?? [] });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const kw = body?.keyword?.trim().toLowerCase();
  if (!kw) return NextResponse.json({ error: "keyword ontbreekt" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("rooster_event_keywords")
    .insert({ keyword: kw })
    .select("*")
    .single<EventKeyword>();

  if (error) {
    const msg = error.code === "23505" ? "Deze term bestaat al" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ keyword: data });
}
