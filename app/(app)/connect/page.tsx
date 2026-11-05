import { CopyButton } from "@/components/copy-button";
import { requireSession } from "@/lib/auth";
import { connectorUrl } from "@/lib/milestones";

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

const primary = "rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700";

export default async function ConnectPage() {
  const { workspace } = await requireSession();
  const url = connectorUrl(workspace);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Connect Claude</h1>
        <p className="mt-1 text-sm text-neutral-700">
          ProofFlow has no AI of its own. Your own Claude reads contracts and delivery notes, then works in ProofFlow through this
          connector.
        </p>
      </div>

      <section>
        <h2 className="font-semibold">Your connector URL</h2>
        <p className="mt-2 break-all rounded-md bg-neutral-100 p-3 font-mono text-sm">{url}</p>
        <div className="mt-2">
          <CopyButton text={url} label="Copy URL" className={primary} />
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Treat it like a password. Anyone with this URL can read and change this workspace&apos;s milestones.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Add it to Claude</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>In Claude, open Settings, then Connectors, and choose Add custom connector.</li>
          <li>Name it ProofFlow, paste the URL and choose Add. Leave the advanced settings empty.</li>
          <li>In a chat, open the tools menu and switch ProofFlow on.</li>
        </ol>
        <p className="mt-2 text-sm text-neutral-700">
          On Team and Enterprise plans, an Owner has to add the connector for the organisation first. Free plans allow one custom
          connector.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Try these prompts</h2>
        <ul className="mt-2 space-y-3 text-sm">
          {PROMPTS.map((p) => (
            <li key={p.text}>
              <p className="text-neutral-600">{p.when}</p>
              <p className="mt-1 rounded-md border border-neutral-200 p-3">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Tools Claude gets</h2>
        <dl className="mt-2 space-y-2 text-sm">
          {TOOLS.map(([name, what]) => (
            <div key={name}>
              <dt className="font-mono text-xs font-medium">{name}</dt>
              <dd className="text-neutral-700">{what}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
