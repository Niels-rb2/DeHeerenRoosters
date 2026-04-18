"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "rooster-install-dismissed-at";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      // Toon alleen als gebruiker het niet recent (binnen 14 dagen) heeft weggeklikt.
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (Date.now() - dismissed < 14 * 24 * 60 * 60 * 1000) return;
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
      <div className="card flex items-center gap-3 p-3 shadow-lg">
        <Download className="h-5 w-5 text-[color:var(--clr-accent)] shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Installeer de app</p>
          <p className="text-xs text-[color:var(--clr-text-muted)]">
            Snel openen vanaf je startscherm
          </p>
        </div>
        <button
          onClick={install}
          className="btn-primary text-xs"
        >
          Installeren
        </button>
        <button
          onClick={dismiss}
          aria-label="Niet nu"
          className="rounded-full p-1 text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
