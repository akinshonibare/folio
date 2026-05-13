"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function WelcomeHero({ name }: { name: string | null }) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5"
      style={{
        background:
          "linear-gradient(135deg, #2DE38E 0%, #25CD7F 35%, #2EE38E 100%)",
        color: "#0A1A10",
      }}
    >
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Dismiss"
        className="absolute right-4 top-4 rounded-full p-1 text-black/70 hover:bg-black/10"
      >
        <X size={16} />
      </button>
      <svg
        className="absolute -left-6 -top-6 opacity-50"
        width="220"
        height="220"
        viewBox="0 0 220 220"
        fill="none"
      >
        <circle cx="60" cy="60" r="55" stroke="#1F1A8C" strokeWidth="22" />
        <polygon points="155,85 175,60 175,110" fill="#FF4D22" />
        <circle cx="170" cy="120" r="38" stroke="#9F7AFA" strokeWidth="18" opacity="0.8" />
        <polygon points="100,150 120,128 120,172" fill="#F2C94C" />
      </svg>
      <div className="relative pt-24">
        <h2 className="text-3xl font-extrabold leading-tight">
          Welcome{name ? `, ${name}` : ""},
          <br /> to your folio!
        </h2>
      </div>
    </div>
  );
}
