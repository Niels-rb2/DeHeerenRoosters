import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EventKeyword } from "@/types/database";

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  start_time: string | null; // "HH:MM" lokaal of null bij all-day
  end_time: string | null;
};

function getAuth() {
  const raw = process.env.GOOGLE_CALENDAR_SA_JSON;
  if (!raw) return null;
  try {
    // Accepteer zowel pure JSON als base64-gecodeerd.
    const json = raw.trim().startsWith("{")
      ? JSON.parse(raw)
      : JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return new google.auth.JWT({
      email: json.client_email,
      key: json.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      subject: process.env.GOOGLE_CALENDAR_SUBJECT || undefined,
    });
  } catch {
    return null;
  }
}

export async function getCalendarEvents(
  fromIso: string,
  toIso: string,
): Promise<CalendarEvent[]> {
  const auth = getAuth();
  if (!auth) return [];

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date(`${fromIso}T00:00:00`).toISOString(),
      timeMax: new Date(`${toIso}T23:59:59`).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const [keywordsRes] = await Promise.all([
      supabaseAdmin()
        .from("rooster_event_keywords")
        .select("keyword")
        .returns<Pick<EventKeyword, "keyword">[]>(),
    ]);
    const keywords = (keywordsRes.data ?? []).map((k) =>
      k.keyword.toLowerCase(),
    );

    const events = (res.data.items ?? [])
      .map((ev): CalendarEvent | null => {
        const title = ev.summary ?? "";
        const lower = title.toLowerCase();
        if (!keywords.some((k) => lower.includes(k))) return null;

        const start = ev.start?.dateTime ?? ev.start?.date;
        if (!start) return null;
        const end = ev.end?.dateTime ?? ev.end?.date;

        if (ev.start?.date) {
          // all-day event
          return {
            id: ev.id ?? title + start,
            date: ev.start.date!,
            title,
            start_time: null,
            end_time: null,
          };
        }
        const d = new Date(start);
        return {
          id: ev.id ?? title + start,
          date: toLocalISO(d),
          title,
          start_time: toLocalTime(d),
          end_time: end ? toLocalTime(new Date(end)) : null,
        };
      })
      .filter((e): e is CalendarEvent => e !== null);

    return events;
  } catch (err) {
    console.warn("[google-calendar] fetch failed:", err);
    return [];
  }
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function toLocalTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
