import Link from "next/link";
import { requireSession } from "@/lib/auth";

// Read-only: the prototype has one workspace and its rules are fixed.

export default async function SettingsPage() {
  const { workspace: ws, user } = await requireSession();
  const paymentDays = ws.written_agreement ? Math.min(ws.agreed_payment_days, 45) : 15;

  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: "Workspace",
      rows: [
        ["Supplier", ws.name],
        ["Udyam registration", `${ws.udyam_number} (fictional)`],
      ],
    },
    {
      title: "Acceptance and payment rules",
      rows: [
        ["Objection window", `${ws.objection_window_days} days from delivery`],
        ["Agreed payment period", `${ws.agreed_payment_days} days`],
        ["Written agreement", ws.written_agreement ? "Yes" : "No"],
        ["Payment falls due", `${paymentDays} days after the acceptance date`],
      ],
    },
    {
      title: "Your account",
      rows: [
        ["Name", user.name],
        ["Email", user.email],
      ],
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          These are fixed in the prototype. The rules follow a simplified reading of the MSMED Act and are not legal advice.
        </p>
      </div>

      {groups.map(({ title, rows }) => (
        <section key={title} className="glass p-5 sm:p-6">
          <h2 className="font-semibold">{title}</h2>
          <dl className="mt-3 divide-y divide-ink/5 text-sm">
            {rows.map(([term, value]) => (
              <div key={term} className="grid gap-1 py-2.5 sm:grid-cols-[14rem_minmax(0,1fr)]">
                <dt className="text-muted">{term}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="text-sm text-muted">
        The Claude connector has its own page:{" "}
        <Link href="/connect" className="font-medium text-brand-strong hover:underline">
          Connect Claude
        </Link>
        .
      </p>
    </div>
  );
}
