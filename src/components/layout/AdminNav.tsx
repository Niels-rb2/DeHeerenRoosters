"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Users,
  Inbox,
  Settings,
  LogOut,
  Home,
  LayoutGrid,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  badgeKey?: "pending";
};

const items: Item[] = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/roosters", label: "Roosters", icon: CalendarDays },
  { href: "/admin/medewerkers", label: "Medewerkers", icon: Users },
  { href: "/admin/aanvragen", label: "Aanvragen", icon: Inbox, badgeKey: "pending" },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
];

export function AdminNav({
  userName,
  pendingCount = 0,
}: {
  userName?: string | null;
  pendingCount?: number;
}) {
  const pathname = usePathname();

  function badge(item: Item): number {
    if (item.badgeKey === "pending") return pendingCount;
    return 0;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-[color:var(--clr-border)] bg-[color:var(--clr-surface)] px-4 py-6 z-30">
        <div className="mb-8 px-2">
          <p className="eyebrow">Café De Heeren</p>
          <p className="mt-1 text-lg font-medium">Rooster — Admin</p>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const count = badge(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[color:var(--clr-surface-2)] text-[color:var(--clr-text)] font-medium"
                    : "text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)] hover:text-[color:var(--clr-text)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {count > 0 ? (
                  <span className="min-w-[1.25rem] text-center rounded-full bg-[color:var(--clr-accent)] text-[color:var(--clr-accent-fg)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-[color:var(--clr-border)] pt-4">
          {userName ? (
            <p className="px-3 text-sm text-[color:var(--clr-text)]">{userName}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-2 px-2">
            <a
              href="https://bijcafedeheeren.nl"
              aria-label="De Heeren Portal"
              data-tooltip="De Heeren Portal"
              className="h-10 w-10 rounded-full inline-flex items-center justify-center text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)] hover:text-[color:var(--clr-text)] transition-colors"
            >
              <LayoutGrid className="h-4 w-4" />
            </a>
            <ThemeToggle />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                aria-label="Uitloggen"
                data-tooltip="Uitloggen"
                className="h-10 w-10 rounded-full inline-flex items-center justify-center text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)] hover:text-[color:var(--clr-text)] transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--clr-border)] bg-[color:var(--clr-surface)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const count = badge(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 px-2 py-2 text-[10px] ${
                  active
                    ? "text-[color:var(--clr-accent)]"
                    : "text-[color:var(--clr-text-muted)]"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {count > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 rounded-full bg-[color:var(--clr-accent)] text-[color:var(--clr-accent-fg)] px-1 text-[9px] font-medium tabular-nums flex items-center justify-center">
                      {count}
                    </span>
                  ) : null}
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
