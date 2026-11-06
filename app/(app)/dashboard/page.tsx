import Link from "next/link";
import { ActorBadge } from "@/components/actor-badge";
import { AlertIcon, ArrowRightIcon, ClockIcon, LayersIcon, WalletIcon } from "@/components/icons";
import { STATUS_BAR, StatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import { STATUS_LABEL, chip, dateTime, day, describeEvent, inr } from "@/lib/format";
import { listEvents, listMilestones, type MilestoneRow } from "@/lib/milestones";
import { pipeline, STATUSES, todayIST } from "@/lib/rules";

const href = (r: MilestoneRow) => `/milestones/${r.milestone._id.toHexString()}`;
const name = (r: MilestoneRow) => `M${r.milestone.seq}: ${r.milestone.title}`;
const sum = (rows: MilestoneRow[]) => rows.reduce((total, r) => total + r.milestone.amount_inr, 0);

export default async function DashboardPage() {
  const { workspace } = await requireSession();
  const [rows, activity] = await Promise.all([listMilestones(workspace), listEvents(workspace, { limit: 6 })]);
  const today = todayIST();
  const p = pipeline(rows, today);
  const overdue = rows.filter((r) => r.clock.overdue).length;

  const deadlines = rows
    .flatMap((r) => {
      const { status, window_end, payment_due } = r.clock;
      if (status === "awaiting_acceptance" && window_end) return [{ r, date: window_end, what: "Objection window closes" }];
      if ((status === "accepted" || status === "deemed_accepted" || status === "invoiced") && payment_due) {
        return [{ r, date: payment_due, what: "Payment due" }];
      }
      return [];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const kpis = [
    { label: "Total milestones", value: rows.length, note: inr(sum(rows)), Icon: LayersIcon, alert: false },
    {
      label: "Awaiting acceptance",
      value: p.totals.awaiting_acceptance.count,
      note: inr(p.totals.awaiting_acceptance.total_inr),
      Icon: ClockIcon,
      alert: false,
    },
    {
      label: "Open objections",
      value: p.totals.objection_open.count,
      note: inr(p.totals.objection_open.total_inr),
      Icon: AlertIcon,
      alert: p.totals.objection_open.count > 0,
    },
    {
      label: "Payments due",
      value: p.paymentsDue.length,
      note: `${inr(sum(p.paymentsDue))} within 30 days${overdue ? `, ${overdue} overdue` : ""}`,
      Icon: WalletIcon,
      alert: overdue > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Delivery and payment across every client. Today is {day(today)} (India time).</p>
        </div>
      </div>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, note, Icon, alert }) => (
          <div key={label} className="glass p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted">{label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${alert ? "bg-red-50 text-red-600" : "bg-brand/10 text-brand"}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-sm text-muted">{note}</p>
          </div>
        ))}
      </section>

      <section className="glass p-5">
        <h2 className="font-semibold">Status distribution</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No milestones yet. Ask Claude to set up an engagement from a contract.</p>
        ) : (
          <>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-neutral-200/70" aria-hidden="true">
              {STATUSES.filter((s) => p.totals[s].count > 0).map((s) => (
                <div key={s} className={STATUS_BAR[s]} style={{ width: `${(p.totals[s].count / rows.length) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 2xl:grid-cols-3">
              {STATUSES.map((s) => (
                <li key={s} className="flex items-center gap-2.5 rounded-lg px-1 py-0.5">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_BAR[s]}`} />
                  <span className="min-w-0 flex-1 truncate">{STATUS_LABEL[s]}</span>
                  <span className="font-medium tabular-nums">{p.totals[s].count}</span>
                  <span className="min-w-[6.5rem] text-right text-muted tabular-nums">{inr(p.totals[s].total_inr)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="glass overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 className="font-semibold">Milestones</h2>
          <Link href="/engagements" className="text-sm font-medium text-brand-strong hover:underline">
            By engagement
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-sm text-muted">Nothing here yet.</p>
        ) : (
          <div className="mt-3">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)] gap-4 border-y border-ink/5 bg-white/40 px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted md:grid">
              <span>Milestone</span>
              <span className="text-right">Amount</span>
              <span>Status</span>
              <span>Next deadline</span>
            </div>
            <ul className="divide-y divide-ink/5">
              {rows.map((r) => {
                const next = chip(r.clock, today);
                return (
                  <li key={r.milestone._id.toHexString()}>
                    <Link
                      href={href(r)}
                      className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-white/60 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)] md:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{name(r)}</span>
                        <span className="block truncate text-xs text-muted">
                          {r.client.name} · {r.engagement.title}
                        </span>
                      </span>
                      <span className="text-sm tabular-nums md:text-right">{inr(r.milestone.amount_inr)}</span>
                      <span>
                        <StatusBadge status={r.clock.status} overdue={r.clock.overdue} />
                      </span>
                      <span className={`text-sm ${r.clock.overdue ? "font-medium text-orange-800" : "text-muted"}`}>
                        {next ?? (r.milestone.paid_on ? `Paid ${day(r.milestone.paid_on)}` : "Nothing due")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass p-5">
          <h2 className="font-semibold">Next deadlines</h2>
          {deadlines.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No upcoming deadlines.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {deadlines.map(({ r, date, what }) => (
                <li key={`${what}-${r.milestone._id.toHexString()}`}>
                  <Link href={href(r)} className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/60">
                    <span className="w-16 shrink-0 rounded-lg bg-white/80 py-1.5 text-center text-xs font-medium leading-tight ring-1 ring-ink/5">
                      {day(date).split(" ").slice(0, 2).join(" ")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {what}: {name(r)}
                      </span>
                      <span className="block text-xs text-muted">
                        {r.client.name} ·{" "}
                        <span className={r.clock.overdue ? "font-medium text-orange-800" : ""}>{chip(r.clock, today)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/activity" className="flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline">
              All activity <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing has happened yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {activity.map(({ event: e, milestone }) => (
                <li key={e._id.toHexString()} className="flex items-start gap-3 text-sm">
                  <ActorBadge actor={e.actor} />
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      {describeEvent(e)}
                      {milestone && (
                        <>
                          {" "}
                          on{" "}
                          <Link href={`/milestones/${milestone._id.toHexString()}`} className="font-medium hover:underline">
                            M{milestone.seq}: {milestone.title}
                          </Link>
                        </>
                      )}
                    </span>
                    <span className="block text-xs text-muted">{dateTime(e.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
