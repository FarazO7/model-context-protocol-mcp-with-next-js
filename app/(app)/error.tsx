"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/icons";

// Keeps the navigation on screen when a page fails, and says what to do next.
export default function AppError({ error }: { error: unknown }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="glass-solid max-w-xl p-6">
      <AlertIcon className="h-6 w-6 text-orange-600" />
      <h1 className="mt-3 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">Your last change may not have been saved. Reload the page to check.</p>
      <button type="button" onClick={() => window.location.reload()} className="btn btn-primary mt-5">
        Reload the page
      </button>
    </div>
  );
}
