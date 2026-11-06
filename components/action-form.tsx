"use client";

import { startTransition, useActionState, useEffect, useId, useRef } from "react";

export type FormState = { ok?: string; error?: string; field?: string } | null;

// When the call itself fails (no network, a server error, or a page from an older deploy), the action never ran or
// its reply was lost. Say so, instead of letting the error replace the page.
const UNSURE = "Something went wrong, so this may not have been saved. Reload the page to check before trying again.";

// Next's redirect and not-found signals travel as errors and must reach Next.
const isNextSignal = (e: unknown) => String((e as { digest?: unknown } | null)?.digest ?? "").startsWith("NEXT_");

/** A form for a server action that shows the action's plain-sentence result underneath. */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  className?: string;
  children: React.ReactNode;
}) {
  const busy = useRef(false);
  const [state, formAction, pending] = useActionState(async (prev: FormState, form: FormData): Promise<FormState> => {
    try {
      return await action(prev, form);
    } catch (e) {
      if (isNextSignal(e)) throw e;
      console.error("Form action failed", e);
      return { error: UNSURE };
    } finally {
      busy.current = false;
    }
  }, null);

  // Point focus and screen readers at the field the server rejected. Clear the form only after a success:
  // after an error, the client's note and ticks stay so they can fix one thing and send again.
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = useId();
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (state?.ok) form.reset();
    for (const el of form.querySelectorAll(`[aria-describedby="${errorId}"]`)) {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    }
    const field = state?.field && form.querySelector<HTMLElement>(`[name="${state.field}"]`);
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", errorId);
      field.focus();
    }
  }, [state, errorId]);

  return (
    <form
      ref={formRef}
      // Before hydration the browser posts the form itself. After it, submits go through here instead of React's
      // form handling, which would reset the form even when the action returns an error.
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        if (busy.current) return; // a second submit while one is in flight is dropped
        busy.current = true;
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(data));
      }}
      className={className}
      aria-busy={pending}
    >
      {children}
      {pending && (
        <p role="status" className="col-span-full text-sm text-muted">
          Sending…
        </p>
      )}
      {state?.error && !pending && (
        <p id={errorId} role="alert" className="col-span-full text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p role="status" className="col-span-full text-sm text-green-700">
          {state.ok}
        </p>
      )}
    </form>
  );
}
