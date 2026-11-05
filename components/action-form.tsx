"use client";

import { useActionState } from "react";

export type FormState = { ok?: string; error?: string } | null;

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
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {children}
      {state?.error && (
        <p role="alert" className="col-span-full text-sm text-red-700">
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
