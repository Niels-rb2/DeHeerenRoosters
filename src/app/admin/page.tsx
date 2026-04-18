import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Users,
  Inbox,
  Plus,
  ArrowRight,
  PartyPopper,
  Clock,
  AlertTriangle,
  Moon,
  Bell,
} from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  Schedule,
  Shift,
  DayOverride,
  Employee,
  DefaultPattern,
} from "@/types/database";
import {
  defaultCloseTime,
  toISODate,
  weekStart,
  buildDisplayNames,
} from "@/lib/schedule-utils";
import { getPartiesInRange } from "@/lib/parties";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/rooster");

  const db = supabaseAdmin();
  const today = new Date();
  const mondayDate = weekStart(today);
  const todayMonday = toISODate(mondayDate);
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);
  const sundayIso = toISODate(sundayDate);

  const todayIso = toISODate(today);
  const sevenLater = new Date(today);
  sevenLater.setDate(sevenLater.getDate() + 7);
  const sevenIso = toISODate(sevenLater);

  const [
    currentWeek,
    upcomingDraft,
    nearbySchedules,
    employeeCount,
    leavePending,
    swapPending,
    parties,
    allEmployees,
    allPatterns,
  ] = await Promise.all([
    db
      .from("rooster_schedules")
      .select("*")
      .eq("week_start", todayMonday)
      .maybeSingle<Schedule>(),
    db
      .from("rooster_schedules")
      .select("*")
      .eq("status", "draft")
      .gte("week_start", todayMonday)
      .order("week_start", { ascending: true })
      .limit(1)
      .maybeSingle<Schedule>(),
    db
      .from("rooster_schedules")
      .select("*")
      .gte("week_start", todayMonday)
      .order("week_start", { ascending: true })
      .limit(8)
      .returns<Schedule[]>(),
    db
      .from("rooster_employees")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    db
      .from("rooster_leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("rooster_swap_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_admin"),
    getPartiesInRange(todayIso, sevenIso),
    db
      .from("rooster_employees")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<Employee[]>(),
    db
      .from("rooster_default_patterns")
      .select("employee_id")
      .eq("is_active", true)
      .returns<Pick<DefaultPattern, "employee_id">[]>(),
  ]);

  const pendingRequests = (leavePending.count ?? 0) + (swapPending.count ?? 0);

  // Shifts + overrides deze week (alleen als rooster bestaat).
  let currentShifts: Shift[] = [];
  let currentOverrides: DayOverride[] = [];
  if (currentWeek.data) {
    const [s, o] = await Promise.all([
      db
        .from("rooster_shifts")
        .select("*")
        .eq("schedule_id", currentWeek.data.id)
        .returns<Shift[]>(),
      db
        .from("rooster_day_overrides")
        .select("*")
        .eq("schedule_id", currentWeek.data.id)
        .returns<DayOverride[]>(),
    ]);
    currentShifts = s.data ?? [];
    currentOverrides = o.data ?? [];
  }

  // Bouw strip van 6 weken (nu + 5 komende). Match met bestaande schedules.
  const schedulesByWeek = new Map<string, Schedule>();
  for (const s of nearbySchedules.data ?? []) {
    schedulesByWeek.set(s.week_start, s);
  }
  const upcomingStrip = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i * 7);
    const iso = toISODate(d);
    const match = schedulesByWeek.get(iso);
    return {
      weekStart: d,
      iso,
      weekNumber: isoWeekNumber(iso),
      schedule: match ?? null,
    };
  });

  // Tellingen voor Roosters-kaart
  const upcomingPublished = upcomingStrip.filter(
    (w) => w.schedule?.status === "published",
  ).length;
  const upcomingDrafts = upcomingStrip.filter(
    (w) => w.schedule?.status === "draft",
  ).length;

  // Eerste lege week (geen bestaand rooster) voor de "Start nieuw rooster" link
  const firstEmpty = upcomingStrip.find((w) => !w.schedule);
  const firstEmptyIso = firstEmpty?.iso ?? null;

  // 1. Feestjes komende 7 dagen
  const partyCount = parties.length;
  const partyGuests = parties.reduce(
    (sum, p) => sum + (p.guest_count ?? 0),
    0,
  );

  // 2. Shifts deze week + totaal uren
  const workShifts = currentShifts.filter(
    (s) => !s.is_day_off && s.start_time,
  );
  const shiftCount = workShifts.length;
  const totalHours = workShifts.reduce((sum, s) => {
    const dayDate = new Date(`${s.date}T00:00:00`);
    const dow = Math.floor(
      (dayDate.getTime() - mondayDate.getTime()) / 86400000,
    );
    const override = currentOverrides.find((o) => o.date === s.date);
    const endTime =
      s.end_time ??
      override?.custom_close_time ??
      defaultCloseTime(dow) ??
      "23:00";
    return sum + hoursBetween(s.start_time!, endTime);
  }, 0);

  // 4. Weekend preview
  const friday = new Date(mondayDate);
  friday.setDate(friday.getDate() + 4);
  const saturday = new Date(mondayDate);
  saturday.setDate(saturday.getDate() + 5);
  const fridayIso = toISODate(friday);
  const saturdayIso = toISODate(saturday);
  const employeesById = new Map<string, Employee>();
  for (const e of allEmployees.data ?? []) employeesById.set(e.id, e);
  const displayNames = buildDisplayNames(allEmployees.data ?? []);

  function weekendNamesFor(iso: string): string[] {
    const ids = currentShifts
      .filter((s) => s.date === iso && !s.is_day_off)
      .map((s) => s.employee_id);
    return ids
      .map((id) => displayNames.get(id) ?? employeesById.get(id)?.name ?? "?")
      .slice(0, 5);
  }
  const fridayNames = weekendNamesFor(fridayIso);
  const saturdayNames = weekendNamesFor(saturdayIso);

  // 6. Medewerkers zonder vaste patronen
  const employeesWithPatterns = new Set(
    (allPatterns.data ?? []).map((p) => p.employee_id),
  );
  const withoutPatterns = (allEmployees.data ?? []).filter(
    (e) => !employeesWithPatterns.has(e.id),
  );

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10 py-8 md:py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-2xl md:text-[2.5rem] font-medium">
            {getGreeting()},{" "}
            <span className="text-[color:var(--clr-accent)]">
              {session.user.name?.split(" ")[0] ?? "daar"}
            </span>
          </h1>
        </div>
        <Link
          href="/admin/aanvragen"
          aria-label={
            pendingRequests > 0
              ? `${pendingRequests} aanvragen openstaand`
              : "Aanvragen"
          }
          data-tooltip={
            pendingRequests > 0
              ? `${pendingRequests} aanvragen openstaand`
              : "Geen openstaande aanvragen"
          }
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--clr-border)] bg-[color:var(--clr-surface)] text-[color:var(--clr-text)] hover:bg-[color:var(--clr-surface-2)] transition-colors mt-4 shrink-0"
        >
          <Bell className="h-5 w-5" />
          {pendingRequests > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-[color:var(--clr-accent)] text-[color:var(--clr-accent-fg)] px-1.5 text-[11px] font-medium tabular-nums flex items-center justify-center border-2 border-[color:var(--clr-bg)]">
              {pendingRequests}
            </span>
          ) : null}
        </Link>
      </div>

      {/* Overzicht lopende & aankomende week */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <StatCard
          title={`Deze week · Week ${isoWeekNumber(todayMonday)}`}
          icon={<CalendarDays className="h-5 w-5" />}
          color="#88280B"
          highlight={
            currentWeek.data
              ? currentWeek.data.status === "published"
                ? "Gepubliceerd"
                : "Concept — nog niet live"
              : "Nog geen rooster"
          }
          cta={
            currentWeek.data ? `Open rooster` : "Maak een rooster voor deze week"
          }
          ctaHref={
            currentWeek.data
              ? `/admin/roosters/${currentWeek.data.id}`
              : "/admin/roosters/nieuw"
          }
        />

        <StatCard
          title="Niet afgemaakt"
          icon={<CalendarDays className="h-5 w-5" />}
          color="#b45309"
          highlight={
            upcomingDraft.data
              ? new Date(
                  `${upcomingDraft.data.week_start}T00:00:00`,
                ).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                })
              : "Geen concept open"
          }
          cta={upcomingDraft.data ? "Verder werken" : "Nieuw rooster starten"}
          ctaHref={
            upcomingDraft.data
              ? `/admin/roosters/${upcomingDraft.data.id}`
              : "/admin/roosters/nieuw"
          }
        />
      </div>

      {/* Weken-strip: klikbare labels met status per komende week */}
      <div className="mt-4 flex flex-wrap gap-2">
        {upcomingStrip.map((w) => (
          <WeekChip key={w.iso} item={w} />
        ))}
      </div>

      {/* Kengetallen komende week */}
      <p className="eyebrow mt-12">Komende week</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Shifts deze week"
          icon={<Clock className="h-5 w-5" />}
          color="#2563eb"
          highlight={
            currentWeek.data
              ? `${shiftCount} shift${shiftCount === 1 ? "" : "s"}${
                  totalHours > 0 ? ` · ${formatHours(totalHours)} uur` : ""
                }`
              : "—"
          }
          cta={currentWeek.data ? "Open rooster" : "Rooster maken"}
          ctaHref={
            currentWeek.data
              ? `/admin/roosters/${currentWeek.data.id}`
              : "/admin/roosters/nieuw"
          }
        />

        <StatCard
          title="Feestjes komende 7 dagen"
          icon={<PartyPopper className="h-5 w-5" />}
          color="#ec4899"
          highlight={
            partyCount === 0
              ? "Geen feestjes"
              : `${partyCount} feestje${partyCount === 1 ? "" : "s"}${
                  partyGuests > 0 ? ` · ${partyGuests} personen` : ""
                }`
          }
          cta="Bekijk roosters"
          ctaHref="/admin/roosters"
        />

        <WeekendCard
          fridayNames={fridayNames}
          saturdayNames={saturdayNames}
          scheduleHref={
            currentWeek.data
              ? `/admin/roosters/${currentWeek.data.id}`
              : "/admin/roosters"
          }
          hasCurrentWeek={!!currentWeek.data}
        />

      </div>

      {/* Waarschuwing: medewerkers zonder patronen */}
      {withoutPatterns.length > 0 ? (
        <Link
          href="/admin/medewerkers"
          className="mt-6 block rounded-3xl p-5 transition-colors"
          style={{
            backgroundColor: "rgba(35, 25, 23, 0.88)",
            color: "#faf7f4",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="rounded-full p-2 shrink-0"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {withoutPatterns.length === 1
                  ? `${withoutPatterns[0].name} heeft nog geen vast weekpatroon`
                  : `${withoutPatterns.length} medewerkers hebben nog geen vast weekpatroon`}
              </p>
              <p className="mt-0.5 text-xs opacity-75">
                Zonder patroon worden shifts niet automatisch ingevuld bij het
                aanmaken van een nieuw rooster.
                {withoutPatterns.length > 1
                  ? ` (${withoutPatterns
                      .map((e) => e.name.split(/\s+/)[0])
                      .join(", ")})`
                  : ""}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 mt-1 opacity-60" />
          </div>
        </Link>
      ) : null}

      {/* Beheer */}
      <p className="eyebrow mt-12">Beheer</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Aanvragen"
          icon={<Inbox className="h-5 w-5" />}
          color="#eab308"
          highlight={
            pendingRequests > 0
              ? `${pendingRequests} wachten op review`
              : "Alles afgehandeld"
          }
          cta={pendingRequests > 0 ? "Bekijken" : "Overzicht"}
          ctaHref="/admin/aanvragen"
          accent={pendingRequests > 0}
        />

        <StatCard
          title="Medewerkers"
          icon={<Users className="h-5 w-5" />}
          color="#10b981"
          highlight={`${employeeCount.count ?? 0} actief`}
          cta="Beheren"
          ctaHref="/admin/medewerkers"
        />

        <RoostersCard
          publishedCount={upcomingPublished}
          draftCount={upcomingDrafts}
          firstEmptyIso={firstEmptyIso}
        />
      </div>
    </main>
  );
}

function StatCard({
  title,
  icon,
  highlight,
  cta,
  ctaHref,
  accent = false,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  highlight: string;
  cta: string;
  ctaHref: string;
  accent?: boolean;
  color?: string; // hex voor icon-badge
}) {
  const iconStyle = color
    ? { backgroundColor: `${color}1f`, color: color }
    : undefined;
  return (
    <Link
      href={ctaHref}
      className={`card group relative p-5 transition-colors hover:bg-[color:var(--clr-surface-2)] ${
        accent ? "ring-2 ring-[color:var(--clr-warning)]/40" : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          style={iconStyle}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            color ? "" : "bg-[color:var(--clr-surface-2)] text-[color:var(--clr-text-muted)]"
          }`}
        >
          {icon}
        </span>
        <span className="text-xs uppercase tracking-widest text-[color:var(--clr-text-muted)]">
          {title}
        </span>
      </div>
      <p className="mt-3 text-lg font-medium leading-snug">{highlight}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-[color:var(--clr-accent)]">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

function RoostersCard({
  publishedCount,
  draftCount,
  firstEmptyIso,
}: {
  publishedCount: number;
  draftCount: number;
  firstEmptyIso: string | null;
}) {
  const color = "#88280B"; // accent bordeaux
  const href = firstEmptyIso
    ? `/admin/roosters/nieuw?week=${firstEmptyIso}`
    : "/admin/roosters/nieuw";
  return (
    <div className="card group relative p-5">
      <div className="flex items-center gap-2.5">
        <span
          style={{ backgroundColor: `${color}1f`, color }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
        >
          <CalendarDays className="h-5 w-5" />
        </span>
        <span className="text-xs uppercase tracking-widest text-[color:var(--clr-text-muted)]">
          Roosters
        </span>
      </div>

      <p className="mt-3 text-sm">
        <Link
          href="/admin/roosters"
          className="hover:underline tabular-nums"
        >
          <span className="font-medium">{publishedCount} klaar</span>
          {draftCount > 0 ? (
            <>
              ,{" "}
              <span className="text-[color:var(--clr-accent)]">
                {draftCount} in behandeling
              </span>
            </>
          ) : null}
        </Link>
      </p>

      <div className="mt-3">
        <Link
          href={href}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Start een nieuw rooster
        </Link>
      </div>
    </div>
  );
}

function WeekendCard({
  fridayNames,
  saturdayNames,
  scheduleHref,
  hasCurrentWeek,
}: {
  fridayNames: string[];
  saturdayNames: string[];
  scheduleHref: string;
  hasCurrentWeek: boolean;
}) {
  const color = "#6d28d9"; // violet
  return (
    <Link
      href={scheduleHref}
      className="card group relative p-5 transition-colors hover:bg-[color:var(--clr-surface-2)]"
    >
      <div className="flex items-center gap-2.5">
        <span
          style={{ backgroundColor: `${color}1f`, color }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
        >
          <Moon className="h-5 w-5" />
        </span>
        <span className="text-xs uppercase tracking-widest text-[color:var(--clr-text-muted)]">
          Dit weekend
        </span>
      </div>
      {hasCurrentWeek ? (
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="w-8 text-[color:var(--clr-text-muted)]">Vr</span>
            <span className="font-medium">
              {fridayNames.length > 0 ? fridayNames.join(", ") : "—"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-8 text-[color:var(--clr-text-muted)]">Za</span>
            <span className="font-medium">
              {saturdayNames.length > 0 ? saturdayNames.join(", ") : "—"}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-lg font-medium">—</p>
      )}
      <p className="mt-2 inline-flex items-center gap-1 text-sm text-[color:var(--clr-accent)]">
        Bekijk rooster
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function WeekChip({
  item,
}: {
  item: {
    weekStart: Date;
    iso: string;
    weekNumber: number;
    schedule: Schedule | null;
  };
}) {
  const end = new Date(item.weekStart);
  end.setDate(end.getDate() + 6);
  const label = `${item.weekStart.getDate()} – ${end.getDate()} ${item.weekStart
    .toLocaleDateString("nl-NL", { month: "short" })
    .replace(".", "")}`;

  let status: "published" | "draft" | "empty" = "empty";
  if (item.schedule?.status === "published") status = "published";
  else if (item.schedule) status = "draft";

  // Groen = gepubliceerd, rood = concept, grijs = leeg.
  // Tinten overgenomen uit reserveren.bijcafedeheeren.nl.
  const statusColor = {
    published: "#16a34a", // groen
    draft: "#dc2626", // rood
    empty: "#9ca3af", // grijs
  }[status];
  const statusTitle = {
    published: "Gepubliceerd",
    draft: "Concept",
    empty: "Nog leeg",
  }[status];

  const href = item.schedule
    ? `/admin/roosters/${item.schedule.id}`
    : `/admin/roosters/nieuw?week=${item.iso}`;

  return (
    <Link
      href={href}
      title={statusTitle}
      style={{
        borderColor: statusColor,
        backgroundColor: `${statusColor}1f`,
        color: statusColor,
      }}
      className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm transition-[filter] hover:brightness-[0.95]"
    >
      <span className="tabular-nums font-medium">Week {item.weekNumber}</span>
      <span className="tabular-nums opacity-80">{label}</span>
    </Link>
  );
}

function isoWeekNumber(weekStart: string): number {
  const d = new Date(`${weekStart}T00:00:00`);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function hoursBetween(start: string, end: string): number {
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  let diff = eH * 60 + eM - (sH * 60 + sM);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 2) / 2; // afronden op halve uren
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

