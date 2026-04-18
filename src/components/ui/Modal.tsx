"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center backdrop-blur-sm p-0 md:p-6"
      style={{ backgroundColor: "rgba(250, 247, 244, 0.5)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full md:max-w-lg max-h-[92dvh] overflow-hidden flex flex-col rounded-t-3xl md:rounded-3xl"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-full p-1.5 text-[color:var(--clr-text-muted)] hover:bg-[color:var(--clr-surface-2)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
