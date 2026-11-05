import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { chip, day, inr } from "@/lib/format";
import { listMilestones, type MilestoneRow } from "@/lib/milestones";
import { todayIST, type Status } from "@/lib/rules";

const COLUMNS: { title: string; statuses: Status[] }[] = [
  { title: "Draft", statuses: ["draft"] },
  { title: "Awaiting acceptance", statuses: ["awaiting_acceptance"] },
  { title: "Objection open", statuses: ["objection_open"] },
  { title: "Accepted", statuses: ["accepted", "deemed_accepted"] },
  { title: "Invoiced", statuses: ["invoiced"] },
  { title: "Paid", statuses: ["paid"] },
];

const href = (r: MilestoneRow) => `/milestones/${r.milestone._id.toHexString()}`;
const name = (r: MilestoneRow) => `M${r.milestone.seq}: ${r.milestone.title}`;

export default async function DashboardPage() {
  const { workspace } = await requireSession();
  const rows = await listMilestones(workspace);
  const today = todayIST();

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
    .slice(0, 8);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-600">Today is {day(today)} (India time).</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = rows.filter((r) => col.statuses.includes(r.clock.status));
          const total = items.reduce((sum, r) => sum + r.milestone.amount_inr, 0);
          return (
            // Empty columns only take up room on a phone.
            <section key={col.title} className={`rounded-lg bg-neutral-50 p-3 ${items.length ? "" : "hidden sm:block"}`}>
              <h2 className="text-sm font-semibold">
                {col.title} <span className="font-normal text-neutral-500">({items.length})</span>
              </h2>
              <p className="text-xs text-neutral-600">{inr(total)}</p>
              {items.length === 0 ? (
                <p className="mt-3 text-xs text-neutral-400">None</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((r) => (
                    <li key={r.milestone._id.toHexString()}>
                      <Card r={r} today={today} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Next deadlines</h2>
        {deadlines.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No upcoming deadlines.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {deadlines.map(({ r, date, what }) => (
              <li key={`${what}-${r.milestone._id.toHexString()}`} className="flex flex-wrap gap-x-4 px-3 py-2 text-sm">
                <span className="w-28 font-medium">{day(date)}</span>
                <span className="flex-1">
                  {what}:{" "}
                  <Link href={href(r)} className="underline">
                    {r.client.name}, {name(r)}
                  </Link>
                </span>
                <span className={r.clock.overdue ? "text-red-700" : "text-neutral-600"}>{chip(r.clock, today)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Card({ r, today }: { r: MilestoneRow; today: string }) {
  const label = chip(r.clock, today);
  return (
    <Link href={href(r)} className="block rounded-md border border-neutral-200 bg-white p-3 hover:border-neutral-400">
      <p className="text-xs text-neutral-500">{r.client.name}</p>
      <p className="text-sm font-medium">{name(r)}</p>
      <p className="text-sm">{inr(r.milestone.amount_inr)}</p>
      <div className="mt-1 flex flex-wrap gap-1 text-xs">
        {r.clock.status === "deemed_accepted" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Deemed</span>}
        {label && (
          <span className={`rounded px-1.5 py-0.5 ${r.clock.overdue ? "bg-red-100 text-red-800" : "bg-neutral-100 text-neutral-700"}`}>
            {label}
          </span>
        )}
        {r.milestone.paid_on && <span className="text-neutral-600">Paid {day(r.milestone.paid_on)}</span>}
      </div>
    </Link>
  );
}
