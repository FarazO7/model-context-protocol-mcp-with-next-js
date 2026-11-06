import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AlertIcon, CheckIcon, ClockIcon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { dateTime, day, inr, letters } from "@/lib/format";
import { getReview } from "@/lib/milestones";
import { clientCanRespond } from "@/lib/rules";
import { acceptMilestone, raiseObjection } from "./actions";

// Public and mobile-first: no login, no session read, and only this one milestone (CLAUDE.md rule 6).
// Glass is kept to the header; everything the client reads or fills in sits on solid panels.

export const metadata: Metadata = { title: "Acceptance review", robots: { index: false, follow: false } };

const panel = "glass-solid p-5 sm:p-6";
const big = "btn w-full py-3 text-base";
const d = (date: string | null) => (date ? day(date) : "");

export default async function ReviewPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const review = await getReview(token);
  if (!review) notFound();
  const { supplier, windowDays, milestone: m, engagement, client, objections, clock } = review;
  const open = objections.find((o) => !o.resolved_at && !o.outside_window);
  const canRespond = clientCanRespond(clock.status);

  let banner: string;
  let tone = "bg-blue-50 text-blue-950 ring-blue-200";
  let Icon = ClockIcon;
  if (clock.status === "draft") {
    banner = "This milestone hasn't been submitted for acceptance yet.";
  } else if (clock.status === "objection_open" && open) {
    banner = `You raised an objection on ${letters(open.criteria_ids)} on ${dateTime(open.raised_at)} IST. ${supplier} will reply on this page.`;
    tone = "bg-amber-50 text-amber-950 ring-amber-200";
    Icon = AlertIcon;
  } else if (clock.status === "awaiting_acceptance") {
    banner = `If no written objection is raised by ${d(clock.window_end)}, this milestone counts as accepted from ${d(clock.anchor_date)}.`;
  } else if (m.client_accepted_at && m.client_accepted_by) {
    banner = `Accepted by ${m.client_accepted_by} on ${dateTime(m.client_accepted_at)} IST. Thank you.`;
    tone = "bg-green-50 text-green-950 ring-green-200";
    Icon = CheckIcon;
  } else {
    banner = `No written objection was raised by ${d(clock.window_end)}, so this milestone counts as accepted from ${d(clock.legal_acceptance_date)}.`;
    tone = "bg-green-50 text-green-950 ring-green-200";
    Icon = CheckIcon;
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 sm:py-10">
      <header className="glass p-5 sm:p-6">
        <p className="eyebrow">Acceptance review from {supplier}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          M{m.seq}: {m.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          For {client.name}: {engagement.title} ({engagement.contract_ref})
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <StatusBadge status={clock.status} />
          <p className="text-xl font-semibold tabular-nums">
            {inr(m.amount_inr)} <span className="text-sm font-normal text-muted">excluding GST</span>
          </p>
        </div>
        {m.description && <p className="mt-3 text-sm text-muted">{m.description}</p>}
      </header>

      <p role="status" className={`flex gap-3 rounded-2xl p-4 text-sm font-medium ring-1 ring-inset ${tone}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{banner}</span>
      </p>

      <section className={panel}>
        <h2 className="text-lg font-semibold">Acceptance criteria</h2>
        <ul className="mt-3 space-y-2.5 text-sm">
          {m.criteria.map((c) => (
            <li key={c.id} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/10 text-xs font-semibold text-brand-strong">
                {c.id}
              </span>
              <span className="pt-0.5">{c.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={panel}>
        <h2 className="text-lg font-semibold">Acceptance pack</h2>
        <div className="mt-3">{m.pack_md ? <Markdown>{m.pack_md}</Markdown> : <p className="text-sm text-muted">No pack yet.</p>}</div>
        {m.evidence.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">Evidence</h3>
            <ul className="mt-2 space-y-2">
              {m.evidence.map((e, i) => (
                <li key={i}>
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl bg-canvas px-3.5 py-2.5 text-sm font-medium text-brand-strong underline-offset-2 hover:underline"
                  >
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {objections.length > 0 && (
        <section className={panel}>
          <h2 className="text-lg font-semibold">Objections and replies</h2>
          {objections.map((o) => (
            <article key={o._id.toHexString()} className="mt-3 space-y-2 rounded-xl bg-canvas p-4 text-sm">
              <p className="font-medium">
                {o.raised_by} objected on {letters(o.criteria_ids)}, {dateTime(o.raised_at)} IST
              </p>
              {o.outside_window && (
                <p className="text-amber-800">Raised after the {windowDays}-day window closed, so it doesn&apos;t change the acceptance.</p>
              )}
              <Markdown>{o.note}</Markdown>
              {o.resolved_at && (
                <div className="rounded-lg bg-white p-3 ring-1 ring-green-200">
                  <p className="font-medium text-green-900">
                    {supplier} replied, {dateTime(o.resolved_at)} IST
                  </p>
                  {o.resolution_md && <Markdown>{o.resolution_md}</Markdown>}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {canRespond && (
        <>
          <section className={panel}>
            <h2 className="text-lg font-semibold">Accept this milestone</h2>
            <p className="mt-1 text-sm text-muted">Accept if every criterion is met.</p>
            <ActionForm action={acceptMilestone.bind(null, token)} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Your full name
                <input name="name" defaultValue={client.approver_name} required maxLength={100} autoComplete="name" className="field py-3 text-base" />
              </label>
              <button className={`${big} btn-primary`}>Accept milestone</button>
            </ActionForm>
          </section>

          <section className={panel}>
            <h2 className="text-lg font-semibold">Raise an objection</h2>
            <p className="mt-1 text-sm text-muted">
              Tick each criterion that isn&apos;t met and say why. This is your written objection.
              {clock.status === "deemed_accepted" && " The window has closed, so it will be recorded as late and won't change the acceptance."}
            </p>
            <ActionForm action={raiseObjection.bind(null, token)} className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-sm font-medium">Criteria not met</legend>
                <div className="mt-2 space-y-2">
                  {m.criteria.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl bg-canvas p-3 text-sm ring-1 ring-transparent transition-colors has-[:checked]:bg-red-50 has-[:checked]:ring-red-200"
                    >
                      <input type="checkbox" name="criteria" value={c.id} className="mt-0.5 h-5 w-5 shrink-0 accent-red-700" />
                      <span>
                        ({c.id}) {c.text}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-medium">
                What isn&apos;t met
                <textarea name="note" required rows={4} maxLength={2000} className="field text-base" />
              </label>
              <label className="block text-sm font-medium">
                Your full name
                <input name="name" defaultValue={client.approver_name} required maxLength={100} autoComplete="name" className="field py-3 text-base" />
              </label>
              <button className={`${big} btn-danger`}>Raise objection</button>
            </ActionForm>
          </section>
        </>
      )}

      <p className="px-1 pt-4 text-xs text-muted">
        Prototype. All demo data is fictional. Dates follow a simplified reading of the MSMED Act and are not legal advice.
      </p>
    </main>
  );
}
