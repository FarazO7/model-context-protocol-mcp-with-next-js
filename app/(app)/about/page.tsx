import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requireSession } from "@/lib/auth";
import { resetDemo } from "./actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">{children}</ul>
    </section>
  );
}

export default async function PrototypeNotesPage() {
  const { workspace: ws } = await requireSession();
  const window = ws.objection_window_days;
  const paymentDays = ws.written_agreement ? Math.min(ws.agreed_payment_days, 45) : 15;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Prototype notes</h1>
        <p className="mt-1 text-sm text-neutral-700">
          ProofFlow is a prototype. Every company and person in the demo data is fictional. The dates follow a simplified
          reading of the MSMED Act and are not legal advice.
        </p>
      </div>

      <Section title="What is real">
        <li>Login, the database and the audit trail. Every change is logged with who made it: you, the client, Claude or the system.</li>
        <li>The Claude connector and its seven tools. ProofFlow has no AI of its own. Your Claude does the reading and writing.</li>
        <li>Milestones and acceptance criteria, which you can edit.</li>
        <li>The client review page, where the client accepts or raises a written objection.</li>
        <li>The clock: objection deadline, deemed acceptance, payment due date and overdue.</li>
      </Section>

      <Section title="What is simulated">
        <li>Sending: you copy the review link and send it yourself. There is no email or WhatsApp.</li>
        <li>Evidence: links only. There are no file uploads.</li>
        <li>Connector security: a secret URL stands in for OAuth.</li>
        <li>The client&apos;s identity: the review link is the only check, and the client types their own name.</li>
      </Section>

      <Section title="Not built">
        <li>Invoices and payments. ProofFlow records the dates you give it and moves no money.</li>
        <li>Multiple users and roles.</li>
        <li>Jira, Tally and Zoho sync.</li>
        <li>Business-day calendars.</li>
        <li>Late-payment interest.</li>
      </Section>

      <Section title="How the rules are simplified">
        <li>It assumes a Udyam-registered micro or small supplier.</li>
        <li>Dates are calendar days in India time. Weekends and public holidays count.</li>
        <li>
          If the client raises no written objection within {window} days of delivery, the milestone counts as accepted from the
          delivery date.
        </li>
        <li>
          Payment falls due {paymentDays} days after the acceptance date. An agreed period can&apos;t exceed 45 days, and with no
          written agreement it is 15 days.
        </li>
        <li>
          Resolving an objection clears the client&apos;s acceptance and restarts the {window}-day window from the resolution date.
          This is ProofFlow&apos;s simplification, not the Act&apos;s wording.
        </li>
        <li>An objection raised after the window closes is recorded and flagged, but doesn&apos;t change the acceptance.</li>
      </Section>

      {ws.demo && (
        <section className="rounded-lg border border-red-200 p-4">
          <h2 className="font-semibold">Reset demo data</h2>
          <p className="mt-1 text-sm text-neutral-700">
            Deletes every client, engagement, milestone, objection and event in this workspace, including anything you or
            Claude created. Then restores the fictional Lotus Health and Monsoon Logistics data, dated from today. Your login
            and connector URL stay the same. Review links sent before the reset stop working.
          </p>
          <ActionForm action={resetDemo} className="mt-3 space-y-3">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 h-5 w-5 shrink-0" />
              <span>I understand this deletes everything in this workspace.</span>
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
                Reset demo data
              </button>
              <Link href="/dashboard" className="text-sm underline">
                Go to the dashboard
              </Link>
            </div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
