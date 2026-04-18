"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Plane, Repeat2, LogOut } from "lucide-react";

const items = [
  { href: "/rooster", label: "Rooster", icon: CalendarDays },
  { href: "/verlof", label: "Verlof", icon: Plane },
  { href: "/ruilen", label: "Ruilen", icon: Repeat2 },
];

export function EmployeeNav({ userName }: { userName?: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--clr-border)] bg-[color:var(--clr-surface)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] ${
                active
                  ? "text-[color:var(--clr-accent)]"
                  : "text-[color:var(--clr-text-muted)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <form action="/api/auth/signout" method="post" className="contents">
          <button
            type="submit"
            aria-label={`Uitloggen${userName ? ` (${userName})` : ""}`}
            className="flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] text-[color:var(--clr-text-muted)]"
          >
            <LogOut className="h-5 w-5" />
            <span>Uitloggen</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
