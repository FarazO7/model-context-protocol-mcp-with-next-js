"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

/** Copies text; if the browser blocks the clipboard, shows the text selected so it can be copied by hand. */
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  if (state === "manual") {
    return (
      <input
        readOnly
        autoFocus
        value={text}
        aria-label="Link to copy"
        onFocus={(e) => e.currentTarget.select()}
        className="field mt-0 font-mono text-xs"
      />
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
          setTimeout(() => setState("idle"), 2000);
        } catch {
          setState("manual");
        }
      }}
    >
      {state === "copied" ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : label}</span>
    </button>
  );
}
