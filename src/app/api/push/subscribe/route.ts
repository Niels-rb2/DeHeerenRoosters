import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint) {
    return NextResponse.json({ error: "Ongeldig subscription" }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("rooster_push_subscriptions")
    .upsert(
      {
        employee_id: user.employeeId,
        endpoint: sub.endpoint,
        subscription: sub,
      },
      { onConflict: "endpoint" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
