"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type State = "idle" | "subscribing" | "subscribed" | "blocked" | "unsupported";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushPermission() {
  const [state, setState] = useState<State>("idle");
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setState("subscribed");
      })
      .catch(() => {});
  }, []);

  async function subscribe() {
    if (!vapidKey) return;
    setState("subscribing");
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "idle");
        return;
      }
      const key = urlBase64ToUint8Array(vapidKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(
          key.byteOffset,
          key.byteOffset + key.byteLength,
        ) as ArrayBuffer,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setState("subscribed");
    } catch (err) {
      console.warn("[push] subscribe failed:", err);
      setState("idle");
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setState("idle");
  }

  if (state === "unsupported" || !vapidKey) return null;

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="inline-flex items-center gap-1.5 text-xs text-[color:var(--clr-text-muted)] hover:text-[color:var(--clr-text)]"
      >
        <BellOff className="h-3.5 w-3.5" />
        Meldingen uit
      </button>
    );
  }

  if (state === "blocked") {
    return (
      <p className="text-xs text-[color:var(--clr-text-muted)]">
        Meldingen geblokkeerd — zet aan via je browser-instellingen.
      </p>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={state === "subscribing"}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--clr-accent)] hover:underline disabled:opacity-60"
    >
      <Bell className="h-4 w-4" />
      {state === "subscribing" ? "Aanzetten…" : "Meldingen aanzetten"}
    </button>
  );
}
