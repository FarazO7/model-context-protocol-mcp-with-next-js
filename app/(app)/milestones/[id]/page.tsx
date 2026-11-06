import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ActorBadge } from "@/components/actor-badge";
import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import { chip, dateTime, day, describeEvent, inr, letters } from "@/lib/format";
import { getMilestone, reviewUrl } from "@/lib/milestones";
import { signedNameMatches, todayIST } from "@/lib/rules";
import { mark, saveCriteria, saveDetails, savePack } from "./actions";

const small = "btn btn-secondary px-2.5 py-1.5 text-xs sm:py-1";
const section = "glass-solid scroll-mt-24 p-5 sm:p-6";

const SECTIONS = [
  ["details", "Details"],
  ["criteria", "Criteria"],
  ["pack", "Pack and evidence"],
  ["billing", "Invoice and payment"],
  ["objections", "Objections"],
  ["audit", "Audit trail"],
] as const;

export default async function MilestonePage({ params }: PageProps<"/milestones/[id]">) {
  const { id } = await params;
  const { workspace } = await requireSession();
  const found = await getMilestone(workspace, id);
  if (!found) notFound();
  const { milestone: m, engagement, client, objections, events, clock } = found;
  const label = chip(clock, todayIST());
  const textOf = (cid: string) => m.criteria.find((c) => c.id === cid)?.text ?? "(removed)";
  const accepted = m.client_accepted_at && m.client_accepted_by ? { by: m.client_accepted_by, at: m.client_accepted_at } : null;

  const facts = [
    ["Delivered", m.delivered_on ? day(m.delivered_on) : "Not yet"],
    ["Objection deadline", clock.window_end ? day(clock.window_end) : "Not yet"],
    ["Legal acceptance", clock.legal_acceptance_date ? day(clock.legal_acceptance_date) : "Not yet"],
    ["Payment due", clock.payment_due ? day(clock.payment_due) : "Not yet"],
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/dashboard" className="hover:text-ink hover:underline">
          Dashboard
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/engagements" className="hover:text-ink hover:underline">
          {client.name}
        </Link>
        <span aria-hidden="true"> / </span>
        {engagement.title} ({engagement.contract_ref})
      </nav>

      <header className="glass p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              M{m.seq}: {m.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {client.name} · {engagement.title}
            </p>
            <div className="mt-3">
              <StatusBadge status={clock.status} overdue={clock.overdue} />
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="eyebrow">Contract value</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{inr(m.amount_inr)}</p>
            <p className="text-xs text-muted">excluding GST</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {facts.map(([term, value]) => (
            <div key={term} className="rounded-xl bg-white/70 px-3.5 py-3 ring-1 ring-ink/5">
              <dt className="eyebrow">{term}</dt>
              <dd className="mt-1 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {label && (
          <p className={`mt-4 text-sm font-medium ${clock.overdue ? "text-orange-800" : "text-brand-strong"}`}>{label}</p>
        )}
      </header>

      <nav aria-label="Sections" className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm">
        {SECTIONS.map(([anchor, title]) => (
          <a
            key={anchor}
            href={`#${anchor}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-white/70 hover:text-ink"
          >
            {title}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section id="details" className={section}>
            <h2 className="font-semibold">Details</h2>
            <ActionForm action={saveDetails.bind(null, id)} className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium sm:col-span-2">
                Title
                <input name="title" defaultValue={m.title} required className="field" />
              </label>
              <label className="text-sm font-medium">
                Amount in ₹, excluding GST
                <input name="amount_inr" defaultValue={m.amount_inr} inputMode="numeric" required className="field" />
              </label>
              <label className="text-sm font-medium sm:col-span-3">
                Description
                <textarea name="description" defaultValue={m.description} rows={2} className="field" />
              </label>
              <div>
                <button className="btn btn-primary">Save details</button>
              </div>
            </ActionForm>
          </section>

          <section id="criteria" className={section}>
            <h2 className="font-semibold">Acceptance criteria</h2>
            <p className="mt-1 text-sm text-muted">Keep each one short, objective and testable. Letters stay fixed when you edit or reorder.</p>
            <ActionForm action={saveCriteria.bind(null, id)} className="mt-4 space-y-4">
              <ol className="space-y-3">
                {m.criteria.map((c, i) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <span className="mt-2.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-sm font-semibold text-brand-strong">
                      {c.id}
                    </span>
                    <textarea
                      name={`text_${c.id}`}
                      defaultValue={c.text}
                      rows={2}
                      aria-label={`Criterion (${c.id})`}
                      className="field mt-0"
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
                <textarea name="add" rows={2} placeholder="For example: Search results load within 2 seconds on 4G." className="field" />
              </label>
              <button name="op" value="save" className="btn btn-primary">
                Save criteria
              </button>
            </ActionForm>
          </section>

          <section id="pack" className={section}>
            <h2 className="font-semibold">Acceptance pack</h2>
            {m.pack_md ? (
              <div className="mt-3">
                <Markdown>{m.pack_md}</Markdown>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No pack yet. Claude writes it when the milestone is submitted for acceptance.</p>
            )}
            <h3 className="mt-6 text-sm font-semibold">Delivery evidence</h3>
            {m.evidence.length > 0 ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {m.evidence.map((e, i) => (
                  <li key={i}>
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="lift block truncate rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-brand-strong ring-1 ring-ink/5"
                    >
                      {e.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">No evidence links yet.</p>
            )}
            <details className="mt-5 rounded-xl bg-white/60 p-4 ring-1 ring-ink/5">
              <summary className="cursor-pointer text-sm font-medium">Edit the pack and evidence</summary>
              <ActionForm action={savePack.bind(null, id)} className="mt-4 space-y-4">
                <label className="block text-sm font-medium">
                  Pack, in markdown
                  <textarea name="pack_md" defaultValue={m.pack_md} rows={12} className="field font-mono" />
                </label>
                <label className="block text-sm font-medium">
                  Evidence, one link per line as: Label | https://link
                  <textarea
                    name="evidence"
                    defaultValue={m.evidence.map((e) => `${e.label} | ${e.url}`).join("\n")}
                    rows={4}
                    className="field font-mono"
                  />
                </label>
                <button className="btn btn-primary">Save pack</button>
              </ActionForm>
            </details>
          </section>
        </div>

        <aside className="space-y-6">
          <section id="billing" className={section}>
            <h2 className="font-semibold">Invoice and payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Client acceptance</dt>
                <dd className="text-right">{accepted ? `${accepted.by}, ${dateTime(accepted.at)}` : "Not yet"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Invoiced</dt>
                <dd>{m.invoiced_on ? day(m.invoiced_on) : "Not yet"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Paid</dt>
                <dd>{m.paid_on ? day(m.paid_on) : "Not yet"}</dd>
              </div>
            </dl>
            {accepted && <SignedAs name={accepted.by} approver={client.approver_name} />}
            <div className="mt-5 flex flex-wrap items-start gap-2">
              {m.review_token ? (
                <CopyButton text={reviewUrl(m.review_token)} label="Copy client link" className="btn btn-secondary" />
              ) : (
                <p className="text-xs text-muted">The client link appears once the milestone is submitted.</p>
              )}
              {(clock.status === "accepted" || clock.status === "deemed_accepted") && (
                <ActionForm action={mark.bind(null, id, "invoiced")}>
                  <button className="btn btn-primary">Mark invoiced</button>
                </ActionForm>
              )}
              {clock.status === "invoiced" && (
                <ActionForm action={mark.bind(null, id, "paid")}>
                  <button className="btn btn-primary">Mark paid</button>
                </ActionForm>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">Dates follow a simplified reading of the MSMED Act. Not legal advice.</p>
          </section>

          <section id="objections" className={section}>
            <h2 className="font-semibold">Objections</h2>
            {objections.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No objections.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {objections.map((o) => (
                  <li key={o._id.toHexString()} className="space-y-2 rounded-xl bg-white/70 p-3.5 text-sm ring-1 ring-ink/5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {o.raised_by} on {letters(o.criteria_ids)}, {dateTime(o.raised_at)}
                      </p>
                      {o.resolved_at ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
                          Resolved
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          Open
                        </span>
                      )}
                    </div>
                    <SignedAs name={o.raised_by} approver={client.approver_name} />
                    <ul className="list-disc pl-5 text-muted">
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
                    {o.resolved_at && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="font-medium text-green-900">Resolved {dateTime(o.resolved_at)}</p>
                        {o.resolution_md && <Markdown>{o.resolution_md}</Markdown>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="audit" className={section}>
            <h2 className="font-semibold">Audit trail</h2>
            <ol className="mt-4 space-y-4 border-l border-ink/10 pl-4">
              {events.map((e) => (
                <li key={e._id.toHexString()} className="relative text-sm">
                  <span aria-hidden="true" className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-brand ring-4 ring-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <ActorBadge actor={e.actor} />
                    <span>{describeEvent(e)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{dateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** A typed name is a signature. When it differs from the approver on record, say so in words, not only colour. */
function SignedAs({ name, approver }: { name: string; approver: string }) {
  if (signedNameMatches(name, approver)) return null;
  return (
    <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
      Name check: signed as {name}. The approver on record is {approver}.
    </p>
  );
}
