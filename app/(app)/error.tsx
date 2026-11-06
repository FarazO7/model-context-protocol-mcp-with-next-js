"use client";

import { useEffect } from "react";

// Keeps the header and nav on screen when a page fails, and says what to do next.
export default function AppError({ error }: { error: unknown }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-neutral-700">Your last change may not have been saved. Reload the page to check.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Reload the page
      </button>
    </div>
  );
}
