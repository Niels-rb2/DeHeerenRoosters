import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushTo } from "@/lib/push";
import type { SwapRequest, Shift } from "@/types/database";

// Admin (Suzan) keurt definitief goed of wijst af.
// Bij approved: wissel employee_id van requester_shift en target_shift (indien aanwezig).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const existing = await db
    .from("rooster_swap_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle<SwapRequest>();

  if (!existing.data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  if (existing.data.status !== "pending_admin") {
    return NextResponse.json(
      { error: "Collega moet eerst accepteren" },
      { status: 400 },
    );
  }

  if (body.status === "approved") {
    const swap = existing.data;

    const rShift = await db
      .from("rooster_shifts")
      .select("*")
      .eq("id", swap.requester_shift_id)
      .maybeSingle<Shift>();

    if (!rShift.data) {
      return NextResponse.json(
        { error: "Originele shift bestaat niet meer" },
        { status: 400 },
      );
    }

    // Wissel employee_id
    await db
      .from("rooster_shifts")
      .update({ employee_id: swap.target_id })
      .eq("id", swap.requester_shift_id);

    if (swap.target_shift_id) {
      await db
        .from("rooster_shifts")
        .update({ employee_id: swap.requester_id })
        .eq("id", swap.target_shift_id);
    }
  }

  const { data, error } = await db
    .from("rooster_swap_requests")
    .update({
      status: body.status,
      reviewed_by: user.employeeId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<SwapRequest>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data) {
    sendPushTo([data.requester_id, data.target_id], {
      title:
        body.status === "approved"
          ? "Ruil goedgekeurd"
          : "Ruil afgewezen",
      body:
        body.status === "approved"
          ? "Je rooster is bijgewerkt."
          : "Suzan kon de ruil niet goedkeuren.",
      url: "/rooster",
    }).catch(() => {});
  }

  return NextResponse.json({ request: data });
}
