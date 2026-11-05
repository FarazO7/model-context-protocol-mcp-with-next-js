import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Markdown } from "@/components/markdown";
import { dateTime, day, inr, letters } from "@/lib/format";
import { getReview } from "@/lib/milestones";
import { clientCanRespond } from "@/lib/rules";
import { acceptMilestone, raiseObjection } from "./actions";

// Public and mobile-first: no login, no session read, and only this one milestone (CLAUDE.md rule 6).

export const metadata: Metadata = { title: "Acceptance review", robots: { index: false, follow: false } };

const field = "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2.5 text-base focus:border-neutral-900 focus:outline-none";
const big = "w-full rounded-md px-4 py-3 text-base font-medium";
const d = (date: string | null) => (date ? day(date) : "");

export default async function ReviewPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const review = await getReview(token);
  if (!review) notFound();
  const { supplier, windowDays, milestone: m, engagement, client, objections, clock } = review;
  const open = objections.find((o) => !o.resolved_at && !o.outside_window);
  const canRespond = clientCanRespond(clock.status);

  let banner: string;
  let tone = "bg-amber-50 text-amber-950";
  if (clock.status === "draft") {
    banner = "This milestone hasn't been submitted for acceptance yet.";
  } else if (clock.status === "objection_open" && open) {
    banner = `You raised an objection on ${letters(open.criteria_ids)} on ${dateTime(open.raised_at)} IST. ${supplier} will reply on this page.`;
  } else if (clock.status === "awaiting_acceptance") {
    banner = `If no written objection is raised by ${d(clock.window_end)}, this milestone counts as accepted from ${d(clock.anchor_date)}.`;
  } else if (m.client_accepted_at && m.client_accepted_by) {
    banner = `Accepted by ${m.client_accepted_by} on ${dateTime(m.client_accepted_at)} IST. Thank you.`;
    tone = "bg-green-50 text-green-950";
  } else {
    banner = `No written objection was raised by ${d(clock.window_end)}, so this milestone counts as accepted from ${d(clock.legal_acceptance_date)}.`;
    tone = "bg-green-50 text-green-950";
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <p className="text-sm text-neutral-600">Acceptance review from {supplier}</p>
      <h1 className="mt-1 text-2xl font-semibold">
        M{m.seq}: {m.title}
      </h1>
      <p className="mt-1 text-sm text-neutral-700">
        For {client.name}: {engagement.title} ({engagement.contract_ref})
      </p>
      <p className="mt-2 text-lg">
        {inr(m.amount_inr)} <span className="text-sm text-neutral-600">excluding GST</span>
      </p>
      {m.description && <p className="mt-2 text-sm text-neutral-700">{m.description}</p>}

      <p role="status" className={`mt-5 rounded-lg p-4 text-sm font-medium ${tone}`}>
        {banner}
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Acceptance criteria</h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          {m.criteria.map((c) => (
            <li key={c.id}>
              <span className="font-medium">({c.id})</span> {c.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Acceptance pack</h2>
        <div className="mt-2">{m.pack_md ? <Markdown>{m.pack_md}</Markdown> : <p className="text-sm">No pack yet.</p>}</div>
        {m.evidence.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold">Evidence</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {m.evidence.map((e, i) => (
                <li key={i}>
                  <a href={e.url} target="_blank" rel="noreferrer" className="underline">
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {objections.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Objections and replies</h2>
          {objections.map((o) => (
            <article key={o._id.toHexString()} className="mt-3 space-y-2 rounded-lg border border-neutral-200 p-3 text-sm">
              <p className="font-medium">
                {o.raised_by} objected on {letters(o.criteria_ids)}, {dateTime(o.raised_at)} IST
              </p>
              {o.outside_window && (
                <p className="text-amber-800">Raised after the {windowDays}-day window closed, so it doesn&apos;t change the acceptance.</p>
              )}
              <Markdown>{o.note}</Markdown>
              {o.resolved_at && (
                <div className="rounded-md bg-green-50 p-3">
                  <p className="font-medium">
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
          <section className="mt-8 rounded-lg border border-neutral-200 p-4">
            <h2 className="text-lg font-semibold">Accept this milestone</h2>
            <p className="mt-1 text-sm text-neutral-600">Accept if every criterion is met.</p>
            <ActionForm action={acceptMilestone.bind(null, token)} className="mt-3 space-y-3">
              <label className="block text-sm font-medium">
                Your full name
                <input name="name" defaultValue={client.approver_name} required maxLength={100} autoComplete="name" className={field} />
              </label>
              <button className={`${big} bg-green-700 text-white hover:bg-green-800`}>Accept milestone</button>
            </ActionForm>
          </section>

          <section className="mt-6 rounded-lg border border-neutral-200 p-4">
            <h2 className="text-lg font-semibold">Raise an objection</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Tick each criterion that isn&apos;t met and say why. This is your written objection.
              {clock.status === "deemed_accepted" && " The window has closed, so it will be recorded as late and won't change the acceptance."}
            </p>
            <ActionForm action={raiseObjection.bind(null, token)} className="mt-3 space-y-3">
              <fieldset>
                <legend className="text-sm font-medium">Criteria not met</legend>
                {m.criteria.map((c) => (
                  <label key={c.id} className="flex items-start gap-3 py-2 text-sm">
                    <input type="checkbox" name="criteria" value={c.id} className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>
                      ({c.id}) {c.text}
                    </span>
                  </label>
                ))}
              </fieldset>
              <label className="block text-sm font-medium">
                What isn&apos;t met
                <textarea name="note" required rows={4} maxLength={2000} className={field} />
              </label>
              <label className="block text-sm font-medium">
                Your full name
                <input name="name" defaultValue={client.approver_name} required maxLength={100} autoComplete="name" className={field} />
              </label>
              <button className={`${big} border border-red-700 text-red-800 hover:bg-red-50`}>Raise objection</button>
            </ActionForm>
          </section>
        </>
      )}

      <p className="mt-10 text-xs text-neutral-500">
        Prototype. All demo data is fictional. Dates follow a simplified reading of the MSMED Act and are not legal advice.
      </p>
    </main>
  );
}
