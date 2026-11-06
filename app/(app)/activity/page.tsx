import Link from "next/link";
import { ActorBadge } from "@/components/actor-badge";
import { requireSession } from "@/lib/auth";
import type { Actor } from "@/lib/db/schema";
import { ACTOR_LABEL, dateTime, describeEvent } from "@/lib/format";
import { listEvents } from "@/lib/milestones";

// The workspace's audit trail, newest first. The actor filter lives in the URL.

const ACTORS = Object.keys(ACTOR_LABEL) as Actor[];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requireSession();
  const params = await searchParams;
  const actor = ACTORS.find((a) => a === params.actor);
  const items = await listEvents(workspace, { actor, limit: 100 });

  const filters: [string, string][] = [["", "Everyone"], ...ACTORS.map((a): [string, string] => [a, ACTOR_LABEL[a]])];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted">Every change in this workspace, with who made it. Times are India time.</p>
      </div>

      <nav aria-label="Filter by actor" className="flex flex-wrap gap-2">
        {filters.map(([key, title]) => {
          const active = (actor ?? "") === key;
          return (
            <Link
              key={key || "all"}
              href={key ? `/activity?actor=${key}` : "/activity"}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                active ? "bg-charcoal font-medium text-white" : "bg-white/70 text-muted ring-1 ring-ink/5 hover:bg-white hover:text-ink"
              }`}
            >
              {title}
            </Link>
          );
        })}
      </nav>

      <section className="glass overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted">No activity{actor ? ` from ${ACTOR_LABEL[actor]}` : ""} yet.</p>
        ) : (
          <ol className="divide-y divide-ink/5">
            {items.map(({ event: e, milestone }) => (
              <li key={e._id.toHexString()} className="grid gap-x-4 gap-y-1 px-5 py-3.5 text-sm sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                <time dateTime={e.at.toISOString()} className="text-xs text-muted sm:pt-0.5 sm:text-sm">
                  {dateTime(e.at)}
                </time>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <ActorBadge actor={e.actor} />
                  <span>{describeEvent(e)}</span>
                  {milestone && (
                    <Link href={`/milestones/${milestone._id.toHexString()}`} className="font-medium text-brand-strong hover:underline">
                      M{milestone.seq}: {milestone.title}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      {items.length === 100 && <p className="text-xs text-muted">Showing the latest 100 changes.</p>}
    </div>
  );
}
