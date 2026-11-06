import { CopyButton } from "@/components/copy-button";
import { CheckIcon, ClockIcon, PlugIcon } from "@/components/icons";
import { requireSession } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { connectorUrl, listEvents } from "@/lib/milestones";

const PROMPTS = [
  {
    when: "Attach the statement of work, then:",
    text: "Here's our SOW with Acme Retail. Set up this engagement in ProofFlow with its milestones and acceptance criteria.",
  },
  {
    when: "Attach the delivery notes, then:",
    text: "Milestone 2, the store finder, shipped today. Build the acceptance pack from these delivery notes, be honest about anything not fully met, and send it to Acme for acceptance.",
  },
  {
    when: "After the client objects:",
    text: "Acme has raised an objection on the store finder milestone. Read it, check it against the SOW and the delivery notes, and send a resolution.",
  },
  {
    when: "Any time:",
    text: "What's stuck in ProofFlow, which milestones were deemed accepted, and what payments fall due this month?",
  },
];

const TOOLS = [
  ["create_engagement", "Sets up a client, an engagement and its milestones from a contract."],
  ["list_milestones", "Lists milestones with their status, amount, key dates and links."],
  ["get_milestone", "Everything about one milestone: criteria, pack, evidence, objections and recent events."],
  ["submit_for_acceptance", "Records the delivery with its acceptance pack and creates the client review link."],
  ["resolve_objection", "Answers an open objection and restarts the objection window."],
  ["update_milestone", "Changes the title, description, amount or criteria, or records the invoice and payment dates."],
  ["get_pipeline_summary", "Totals by status, windows closing soon, open objections, deemed acceptances and payments due."],
];

const STEPS = [
  "In Claude, open Settings, then Connectors, and choose Add custom connector.",
  "Name it ProofFlow, paste the URL and choose Add. Leave the advanced settings empty.",
  "In a chat, open the tools menu and switch ProofFlow on.",
];

export default async function ConnectPage() {
  const { workspace } = await requireSession();
  const url = connectorUrl(workspace);
  // The MCP endpoint is stateless and records no connections, so the honest signal is Claude's last change.
  const [last] = await listEvents(workspace, { actor: "claude", limit: 1 });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect Claude</h1>
        <p className="mt-1 text-sm text-muted">
          ProofFlow has no AI of its own. Your own Claude reads contracts and delivery notes, then works in ProofFlow through this
          connector.
        </p>
      </div>

      <section className="glass p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <PlugIcon className="h-5 w-5 text-brand" /> Your connector URL
          </h2>
          <p className="flex items-center gap-2 text-sm text-muted">
            {last ? (
              <>
                <CheckIcon className="h-4 w-4 text-green-700" />
                Last change by Claude: {dateTime(last.event.at)}
              </>
            ) : (
              <>
                <ClockIcon className="h-4 w-4" />
                Claude hasn&apos;t made any changes here yet.
              </>
            )}
          </p>
        </div>
        <p className="mt-4 break-all rounded-xl bg-charcoal px-4 py-3 font-mono text-sm text-white">{url}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <CopyButton text={url} label="Copy URL" className="btn btn-primary" />
          <p className="text-sm text-muted">
            Treat it like a password. Anyone with this URL can read and change this workspace&apos;s milestones.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Add it to Claude</h2>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step} className="glass p-4 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-strong text-sm font-semibold text-white">{i + 1}</span>
              <p className="mt-3">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          On Team and Enterprise plans, an Owner has to add the connector for the organisation first. Free plans allow one custom
          connector.
        </p>
      </section>

      <section id="prompts" className="scroll-mt-24">
        <h2 className="font-semibold">Try these prompts</h2>
        <ul className="mt-3 space-y-3">
          {PROMPTS.map((p) => (
            <li key={p.text} className="glass-solid p-4 text-sm">
              <p className="eyebrow">{p.when}</p>
              <p className="mt-1.5">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Tools Claude gets</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {TOOLS.map(([name, what]) => (
            <div key={name} className="glass p-4">
              <dt className="font-mono text-xs font-semibold text-brand-strong">{name}</dt>
              <dd className="mt-1 text-sm text-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
