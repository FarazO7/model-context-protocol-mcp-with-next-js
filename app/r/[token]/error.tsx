"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/icons";

// If anything on the review page fails, the client gets a way forward instead of a blank error screen.
export default function ReviewError({ error }: { error: unknown }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="glass-solid p-6">
        <AlertIcon className="h-6 w-6 text-orange-600" />
        <h1 className="mt-3 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          Your response may not have been saved. Reload the page to check before trying again.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary mt-5 w-full py-3 text-base sm:w-auto">
          Reload the page
        </button>
      </div>
    </main>
  );
}
