"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  const label = isDark ? "Lichte modus" : "Donkere modus";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      data-tooltip={label}
      className={`h-10 w-10 rounded-full inline-flex items-center justify-center text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)] hover:text-[color:var(--clr-text)] transition-colors ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
