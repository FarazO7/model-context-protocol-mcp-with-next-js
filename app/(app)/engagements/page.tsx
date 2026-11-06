import Link from "next/link";
import { ArrowRightIcon, BriefcaseIcon, SearchIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import { day, inr } from "@/lib/format";
import { listMilestones, type MilestoneRow } from "@/lib/milestones";

// Built from the same milestone list as the dashboard; search and sort live in the URL, so it works without JavaScript.

const SORTS = { client: "Client name", value: "Contract value", recent: "Newest first" } as const;
type Sort = keyof typeof SORTS;
type Group = { engagement: MilestoneRow["engagement"]; client: MilestoneRow["client"]; milestones: MilestoneRow[] };

const value = (g: Group) => g.milestones.reduce((sum, r) => sum + r.milestone.amount_inr, 0);
const ORDER: Record<Sort, (a: Group, b: Group) => number> = {
  client: (a, b) => a.client.name.localeCompare(b.client.name) || a.engagement.title.localeCompare(b.engagement.title),
  value: (a, b) => value(b) - value(a),
  recent: (a, b) => b.engagement.created_at.getTime() - a.engagement.created_at.getTime(),
};

export default async function EngagementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requireSession();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const sort: Sort = typeof params.sort === "string" && params.sort in SORTS ? (params.sort as Sort) : "client";

  const groups = new Map<string, Group>();
  for (const r of await listMilestones(workspace)) {
    const key = r.engagement._id.toHexString();
    const group = groups.get(key) ?? { engagement: r.engagement, client: r.client, milestones: [] };
    group.milestones.push(r);
    groups.set(key, group);
  }
  const needle = q.toLowerCase();
  const list = [...groups.values()]
    .filter((g) => !needle || [g.client.name, g.engagement.title, g.engagement.contract_ref].some((t) => t.toLowerCase().includes(needle)))
    .sort(ORDER[sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engagements</h1>
          <p className="mt-1 text-sm text-muted">Every contract, its value and where each milestone stands.</p>
        </div>
        <Link href="/connect#prompts" className="btn btn-primary">
          <BriefcaseIcon className="h-4 w-4" />
          Create engagement
        </Link>
      </div>
      <p className="-mt-3 text-xs text-muted">Claude creates engagements from your contract. The link shows the prompt to use.</p>

      <form role="search" className="glass flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[12rem] flex-1 text-sm font-medium">
          Search
          <span className="relative block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-subtle" />
            <input name="q" defaultValue={q} placeholder="Client, engagement or contract reference" className="field pl-9" />
          </span>
        </label>
        <label className="text-sm font-medium">
          Sort by
          <select name="sort" defaultValue={sort} className="field">
            {Object.entries(SORTS).map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary">Apply</button>
        {(q || sort !== "client") && (
          <Link href="/engagements" className="pb-2 text-sm text-muted hover:text-ink hover:underline">
            Clear
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <p className="glass p-6 text-sm text-muted">
          {q ? `No engagement matches "${q}".` : "No engagements yet. Ask Claude to set one up from a contract."}
        </p>
      ) : (
        <ul className="space-y-4">
          {list.map((g) => {
            const paid = g.milestones.filter((r) => r.clock.status === "paid").length;
            return (
              <li key={g.engagement._id.toHexString()} className="glass overflow-hidden">
                <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="eyebrow">{g.client.name}</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">{g.engagement.title}</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {g.engagement.contract_ref} · approver {g.client.approver_name} · added {day(g.engagement.created_at.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <dl className="flex gap-6 text-sm sm:text-right">
                    <div>
                      <dt className="eyebrow">Contract value</dt>
                      <dd className="mt-1 font-semibold tabular-nums">{inr(value(g))}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Milestones</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {g.milestones.length} <span className="font-normal text-muted">({paid} paid)</span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <ul className="divide-y divide-ink/5 border-t border-ink/5 bg-white/40">
                  {g.milestones.map((r) => (
                    <li key={r.milestone._id.toHexString()}>
                      <Link
                        href={`/milestones/${r.milestone._id.toHexString()}`}
                        className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 transition-colors hover:bg-white/70"
                      >
                        <span className="min-w-0 flex-1 text-sm font-medium">
                          M{r.milestone.seq}: {r.milestone.title}
                        </span>
                        <span className="text-sm tabular-nums text-muted">{inr(r.milestone.amount_inr)}</span>
                        <StatusBadge status={r.clock.status} overdue={r.clock.overdue} />
                        <ArrowRightIcon className="hidden h-4 w-4 text-subtle transition-colors group-hover:text-brand sm:block" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
