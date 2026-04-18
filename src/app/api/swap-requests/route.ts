import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushTo } from "@/lib/push";
import type { SwapRequest, Shift } from "@/types/database";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = supabaseAdmin()
    .from("rooster_swap_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (!user.isAdmin) {
    q.or(`requester_id.eq.${user.employeeId},target_id.eq.${user.employeeId}`);
  }

  const { data, error } = await q.returns<SwapRequest[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

// Medewerker maakt ruilverzoek: requester_shift_id + target_id.
export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.requester_shift_id || !body?.target_id) {
    return NextResponse.json(
      { error: "Shift en collega zijn verplicht" },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  // Verify shift belongs to requester
  const shiftRes = await db
    .from("rooster_shifts")
    .select("id, employee_id")
    .eq("id", body.requester_shift_id)
    .maybeSingle<Pick<Shift, "id" | "employee_id">>();
  if (!shiftRes.data || shiftRes.data.employee_id !== user.employeeId) {
    return NextResponse.json(
      { error: "Dit is niet jouw shift" },
      { status: 403 },
    );
  }

  const { data, error } = await db
    .from("rooster_swap_requests")
    .insert({
      requester_id: user.employeeId,
      requester_shift_id: body.requester_shift_id,
      target_id: body.target_id,
      target_shift_id: body.target_shift_id ?? null,
      status: "pending_target",
    })
    .select("*")
    .single<SwapRequest>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data) {
    sendPushTo([data.target_id], {
      title: "Nieuw ruilverzoek",
      body: "Een collega wil met je ruilen. Bekijk het verzoek.",
      url: "/ruilen",
    }).catch(() => {});
  }

  return NextResponse.json({ request: data });
}
