import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PushSubscription as PushSub } from "@/types/database";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@cafedeheeren.nl";
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
};

export async function sendPushTo(
  employeeIds: string[],
  payload: PushPayload,
): Promise<void> {
  configure();
  if (!configured || employeeIds.length === 0) return;

  const db = supabaseAdmin();
  const { data } = await db
    .from("rooster_push_subscriptions")
    .select("*")
    .in("employee_id", employeeIds)
    .returns<PushSub[]>();

  if (!data || data.length === 0) return;

  const body = JSON.stringify(payload);
  const staleEndpoints: string[] = [];

  await Promise.all(
    data.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.warn("[push] send failed:", err);
        }
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await db
      .from("rooster_push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }
}

export async function sendPushToAllActive(payload: PushPayload): Promise<void> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("rooster_employees")
    .select("id")
    .eq("is_active", true)
    .returns<{ id: string }[]>();
  const ids = (data ?? []).map((e) => e.id);
  await sendPushTo(ids, payload);
}
