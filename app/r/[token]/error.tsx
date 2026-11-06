"use client";

import { useEffect } from "react";

// If anything on the review page fails, the client gets a way forward instead of a blank error screen.
export default function ReviewError({ error }: { error: unknown }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-neutral-700">
        Your response may not have been saved. Reload the page to check before trying again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 w-full rounded-md bg-neutral-900 px-4 py-3 text-base font-medium text-white hover:bg-neutral-700 sm:w-auto"
      >
        Reload the page
      </button>
    </main>
  );
}
