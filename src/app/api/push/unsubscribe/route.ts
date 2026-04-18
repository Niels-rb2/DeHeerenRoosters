import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint ontbreekt" }, { status: 400 });
  }

  await supabaseAdmin()
    .from("rooster_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("employee_id", user.employeeId);

  return NextResponse.json({ ok: true });
}
