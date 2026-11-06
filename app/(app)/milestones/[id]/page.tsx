import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import { requireSession } from "@/lib/auth";
import { ACTOR_LABEL, STATUS_LABEL, chip, dateTime, day, describeEvent, inr, letters } from "@/lib/format";
import { getMilestone, reviewUrl } from "@/lib/milestones";
import { signedNameMatches, todayIST } from "@/lib/rules";
import { mark, saveCriteria, saveDetails, savePack } from "./actions";

const input = "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";
const primary = "rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700";
const small = "rounded border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-40 sm:py-0.5";
const card = "rounded-lg border border-neutral-200 p-4";

const ACTOR_STYLE = {
  supplier: "bg-neutral-900 text-white",
  client: "bg-sky-100 text-sky-900",
  claude: "bg-amber-100 text-amber-900",
  system: "bg-neutral-200 text-neutral-800",
} as const;

export default async function MilestonePage({ params }: PageProps<"/milestones/[id]">) {
  const { id } = await params;
  const { workspace } = await requireSession();
  const found = await getMilestone(workspace, id);
  if (!found) notFound();
  const { milestone: m, engagement, client, objections, events, clock } = found;
  const label = chip(clock, todayIST());
  const textOf = (cid: string) => m.criteria.find((c) => c.id === cid)?.text ?? "(removed)";

  return (
    <>
      <p className="text-sm text-neutral-600">
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>{" "}
        / {client.name} / {engagement.title} ({engagement.contract_ref})
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">
          M{m.seq}: {m.title}
        </h1>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-sm">{STATUS_LABEL[clock.status]}</span>
        {clock.overdue && <span className="rounded bg-red-100 px-2 py-0.5 text-sm text-red-800">Overdue</span>}
        <span className="text-lg">{inr(m.amount_inr)}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={card}>
            <h2 className="font-semibold">Details</h2>
            <ActionForm action={saveDetails.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium sm:col-span-2">
                Title
                <input name="title" defaultValue={m.title} required className={input} />
              </label>
              <label className="text-sm font-medium">
                Amount in ₹, excluding GST
                <input name="amount_inr" defaultValue={m.amount_inr} inputMode="numeric" required className={input} />
              </label>
              <label className="text-sm font-medium sm:col-span-3">
                Description
                <textarea name="description" defaultValue={m.description} rows={2} className={input} />
              </label>
              <div>
                <button className={primary}>Save details</button>
              </div>
            </ActionForm>
          </section>

          <section className={card}>
            <h2 className="font-semibold">Acceptance criteria</h2>
            <p className="text-sm text-neutral-600">Keep each one short, objective and testable. Letters stay fixed when you edit or reorder.</p>
            <ActionForm action={saveCriteria.bind(null, id)} className="mt-3 space-y-3">
              <ol className="space-y-2">
                {m.criteria.map((c, i) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className="mt-2 w-7 shrink-0 text-sm font-medium">({c.id})</span>
                    <textarea
                      name={`text_${c.id}`}
                      defaultValue={c.text}
                      rows={2}
                      aria-label={`Criterion (${c.id})`}
                      className={`${input} mt-0`}
                    />
                    <div className="flex shrink-0 flex-col gap-1">
                      <button name="op" value={`up:${c.id}`} disabled={i === 0} aria-label={`Move (${c.id}) up`} className={small}>
                        Up
                      </button>
                      <button
                        name="op"
                        value={`down:${c.id}`}
                        disabled={i === m.criteria.length - 1}
                        aria-label={`Move (${c.id}) down`}
                        className={small}
                      >
                        Down
                      </button>
                      <button name="op" value={`remove:${c.id}`} aria-label={`Remove (${c.id})`} className={small}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <label className="block text-sm font-medium">
                Add a criterion
                <textarea name="add" rows={2} placeholder="For example: Search results load within 2 seconds on 4G." className={input} />
              </label>
              <button name="op" value="save" className={primary}>
                Save criteria
              </button>
            </ActionForm>
          </section>

          <section className={card}>
            <h2 className="font-semibold">Acceptance pack</h2>
            {m.pack_md ? (
              <div className="mt-3">
                <Markdown>{m.pack_md}</Markdown>
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-600">No pack yet. Claude writes it when the milestone is submitted for acceptance.</p>
            )}
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
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Edit the pack and evidence</summary>
              <ActionForm action={savePack.bind(null, id)} className="mt-3 space-y-3">
                <label className="block text-sm font-medium">
                  Pack, in markdown
                  <textarea name="pack_md" defaultValue={m.pack_md} rows={12} className={`${input} font-mono`} />
                </label>
                <label className="block text-sm font-medium">
                  Evidence, one link per line as: Label | https://link
                  <textarea
                    name="evidence"
                    defaultValue={m.evidence.map((e) => `${e.label} | ${e.url}`).join("\n")}
                    rows={4}
                    className={`${input} font-mono`}
                  />
                </label>
                <button className={primary}>Save pack</button>
              </ActionForm>
            </details>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={card}>
            <h2 className="font-semibold">Clock</h2>
            {label && <p className={`mt-1 text-sm ${clock.overdue ? "text-red-700" : "text-neutral-700"}`}>{label}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-neutral-600">Delivered</dt>
              <dd>{m.delivered_on ? day(m.delivered_on) : "Not yet"}</dd>
              <dt className="text-neutral-600">Objection deadline</dt>
              <dd>{clock.window_end ? day(clock.window_end) : "Not yet"}</dd>
              <dt className="text-neutral-600">Legal acceptance</dt>
              <dd>{clock.legal_acceptance_date ? day(clock.legal_acceptance_date) : "Not yet"}</dd>
              <dt className="text-neutral-600">Payment due</dt>
              <dd>{clock.payment_due ? day(clock.payment_due) : "Not yet"}</dd>
              {m.client_accepted_at && m.client_accepted_by && (
                <>
                  <dt className="text-neutral-600">Accepted by</dt>
                  <dd>
                    {m.client_accepted_by}, {dateTime(m.client_accepted_at)}
                  </dd>
                </>
              )}
              {m.invoiced_on && (
                <>
                  <dt className="text-neutral-600">Invoiced</dt>
                  <dd>{day(m.invoiced_on)}</dd>
                </>
              )}
              {m.paid_on && (
                <>
                  <dt className="text-neutral-600">Paid</dt>
                  <dd>{day(m.paid_on)}</dd>
                </>
              )}
            </dl>
            {m.client_accepted_at && m.client_accepted_by && (
              <SignedAs name={m.client_accepted_by} approver={client.approver_name} />
            )}
            <div className="mt-4 flex flex-wrap items-start gap-2">
              {m.review_token ? (
                <CopyButton text={reviewUrl(m.review_token)} label="Copy client link" className={primary} />
              ) : (
                <p className="text-xs text-neutral-600">The client link appears once the milestone is submitted.</p>
              )}
              {(clock.status === "accepted" || clock.status === "deemed_accepted") && (
                <ActionForm action={mark.bind(null, id, "invoiced")}>
                  <button className={primary}>Mark invoiced</button>
                </ActionForm>
              )}
              {clock.status === "invoiced" && (
                <ActionForm action={mark.bind(null, id, "paid")}>
                  <button className={primary}>Mark paid</button>
                </ActionForm>
              )}
            </div>
            <p className="mt-3 text-xs text-neutral-500">Dates follow a simplified reading of the MSMED Act. Not legal advice.</p>
          </section>

          <section className={card}>
            <h2 className="font-semibold">Objections</h2>
            {objections.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600">No objections.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {objections.map((o) => (
                  <li key={o._id.toHexString()} className="space-y-2 text-sm">
                    <p className="font-medium">
                      {o.raised_by} on {letters(o.criteria_ids)}, {dateTime(o.raised_at)}
                    </p>
                    <SignedAs name={o.raised_by} approver={client.approver_name} />
                    <ul className="list-disc pl-5 text-neutral-700">
                      {o.criteria_ids.map((cid) => (
                        <li key={cid}>
                          ({cid}) {textOf(cid)}
                        </li>
                      ))}
                    </ul>
                    {o.outside_window && (
                      <p className="text-amber-800">Raised outside the {workspace.objection_window_days}-day window.</p>
                    )}
                    <Markdown>{o.note}</Markdown>
                    {o.resolved_at ? (
                      <div className="rounded-md bg-green-50 p-2">
                        <p className="font-medium text-green-900">Resolved {dateTime(o.resolved_at)}</p>
                        {o.resolution_md && <Markdown>{o.resolution_md}</Markdown>}
                      </div>
                    ) : (
                      <p className="font-medium text-red-700">Open</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e._id.toHexString()} className="text-sm">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${ACTOR_STYLE[e.actor]}`}>{ACTOR_LABEL[e.actor]}</span>
                  {describeEvent(e)}
                  <div className="text-xs text-neutral-500">{dateTime(e.at)}</div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}

/** A typed name is a signature. When it differs from the approver on record, say so in words, not only colour. */
function SignedAs({ name, approver }: { name: string; approver: string }) {
  if (signedNameMatches(name, approver)) return null;
  return (
    <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-900">
      Name check: signed as {name}. The approver on record is {approver}.
    </p>
  );
}
