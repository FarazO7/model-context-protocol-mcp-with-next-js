import type { Actor } from "@/lib/db/schema";
import { ACTOR_LABEL } from "@/lib/format";

// Who made a change, as a labelled badge: You, Client, Claude or System.
const STYLE: Record<Actor, string> = {
  supplier: "bg-charcoal text-white ring-charcoal",
  client: "bg-sky-50 text-sky-800 ring-sky-200",
  claude: "bg-amber-50 text-amber-900 ring-amber-200",
  system: "bg-neutral-100 text-neutral-700 ring-neutral-300/70",
};

export function ActorBadge({ actor }: { actor: Actor }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLE[actor]}`}>
      {ACTOR_LABEL[actor]}
    </span>
  );
}
