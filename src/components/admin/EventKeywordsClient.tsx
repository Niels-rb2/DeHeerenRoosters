"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { EventKeyword } from "@/types/database";

export function EventKeywordsClient({ initial }: { initial: EventKeyword[] }) {
  const [keywords, setKeywords] = useState(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function add() {
    const kw = input.trim().toLowerCase();
    if (!kw) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/event-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: kw }),
    });
    setAdding(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Er ging iets mis");
      return;
    }
    const { keyword } = await res.json();
    setKeywords((list) =>
      [...list, keyword].sort((a, b) => a.keyword.localeCompare(b.keyword)),
    );
    setInput("");
  }

  async function remove(id: string) {
    const res = await fetch(`/api/event-keywords/${id}`, { method: "DELETE" });
    if (res.ok) setKeywords((list) => list.filter((k) => k.id !== id));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="bijv. pubquiz"
          className="input-dark flex-1"
        />
        <button
          onClick={add}
          disabled={adding || !input.trim()}
          className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Toevoegen
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-[color:var(--clr-danger)]">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {keywords.length === 0 ? (
          <p className="text-sm text-[color:var(--clr-text-muted)] italic">
            Nog geen termen ingesteld.
          </p>
        ) : (
          keywords.map((k) => (
            <span
              key={k.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--clr-border)] pl-3 pr-1 py-1 text-sm"
            >
              {k.keyword}
              <button
                onClick={() => remove(k.id)}
                aria-label="Verwijderen"
                className="rounded-full p-0.5 text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
