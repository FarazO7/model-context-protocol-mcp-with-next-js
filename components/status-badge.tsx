import { STATUS_LABEL } from "@/lib/format";
import type { Status } from "@/lib/rules";

// Tinted pills with a dot and the label text, so a status never relies on colour alone.
const TONE: Record<Status, string> = {
  draft: "bg-neutral-100 text-neutral-700 ring-neutral-300/70",
  awaiting_acceptance: "bg-blue-50 text-blue-800 ring-blue-200",
  objection_open: "bg-red-50 text-red-800 ring-red-200",
  accepted: "bg-green-50 text-green-800 ring-green-200",
  deemed_accepted: "bg-green-50 text-green-800 ring-green-200",
  invoiced: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

export function StatusBadge({ status, overdue = false }: { status: Status; overdue?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`${pill} ${TONE[status]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {STATUS_LABEL[status]}
      </span>
      {overdue && (
        <span className={`${pill} bg-orange-50 text-orange-800 ring-orange-200`}>
          <span className="h-1.5 w-1.5 rotate-45 bg-current" aria-hidden="true" />
          Payment overdue
        </span>
      )}
    </span>
  );
}

/** The colour of a status, for the dashboard's distribution bar and its legend. */
export const STATUS_BAR: Record<Status, string> = {
  draft: "bg-neutral-300",
  awaiting_acceptance: "bg-brand",
  objection_open: "bg-red-500",
  accepted: "bg-green-500",
  deemed_accepted: "bg-green-300",
  invoiced: "bg-indigo-500",
  paid: "bg-emerald-600",
};
