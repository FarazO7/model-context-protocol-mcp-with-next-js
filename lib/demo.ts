// The fictional demo data (SPEC section 11), dated from today in Asia/Kolkata.
// Used by `npm run db:seed` and the Reset demo data button. The .ts imports let Node load it as well as Next.
import { ObjectId } from "mongodb";
import { db } from "./db/index.ts";
import type { Actor, AppEvent, Milestone } from "./db/schema.ts";
import { newToken } from "./crypto.ts";
import { addDays, todayIST } from "./rules.ts";

/**
 * Deletes the workspace's clients, engagements, milestones, objections and events, then inserts the fictional
 * Lotus Health and Monsoon Logistics data. Only for a demo workspace: callers check `workspace.demo` first.
 */
// shortcut: not atomic, so two resets at the same moment can double the data; resetting again fixes it.
// Wrap it in a transaction if it ever runs somewhere busier than a shared demo.
export async function resetDemoData(ws: ObjectId, actor: Actor) {
  const today = todayIST(); // read on each call: a server process outlives a day
  const day = (offset: number) => addDays(today, offset);
  const at = (offset: number, time = "11:00") => new Date(`${day(offset)}T${time}:00+05:30`);
  const c = db();

  await Promise.all(
    ["clients", "engagements", "milestones", "objections", "events"].map((name) =>
      c.raw.collection(name).deleteMany({ workspace_id: ws }),
    ),
  );

  const lotus = new ObjectId();
  const monsoon = new ObjectId();
  await c.clients.insertMany([
    { _id: lotus, workspace_id: ws, name: "Lotus Health Pvt Ltd", approver_name: "Dr Ananya Sen", approver_email: "ananya.sen@lotus-health.example" },
    { _id: monsoon, workspace_id: ws, name: "Monsoon Logistics Pvt Ltd", approver_name: "Rohan Desai", approver_email: "rohan.desai@monsoon-logistics.example" },
  ]);

  const portal = new ObjectId();
  const fleet = new ObjectId();
  await c.engagements.insertMany([
    {
      _id: portal, workspace_id: ws, client_id: lotus, title: "Patient portal", contract_ref: "BFD-LOT-SOW-03",
      summary_md: "Web and mobile patient portal: appointments, lab records and payments. Three milestones.",
      created_at: at(-90),
    },
    {
      _id: fleet, workspace_id: ws, client_id: monsoon, title: "Fleet tracking dashboard", contract_ref: "BFD-MON-SOW-05",
      summary_md: "Live fleet map with geofence alerts, plus daily reports and exports. Two milestones.",
      created_at: at(-60),
    },
  ]);

  type SeedMilestone = {
    engagement: ObjectId; created: number; seq: number; title: string; description: string;
    amount_inr: number; criteria: string[]; evidence: string;
    delivered: number; accepted?: { day: number; time: string; by: string }; invoiced?: number; paid?: number;
  };

  const plan: SeedMilestone[] = [
    {
      engagement: portal, created: -90, seq: 1, title: "Discovery and design", amount_inr: 300000,
      description: "Patient research, clickable prototype and design system.",
      criteria: [
        "Research summary covers at least 12 patient interviews.",
        "Clickable prototype covers booking, records and payments.",
        "Design system includes colour, type and form components.",
      ],
      evidence: "lotus/portal/m1", delivered: -75, accepted: { day: -73, time: "15:10", by: "Dr Ananya Sen" }, invoiced: -70, paid: -50,
    },
    {
      engagement: portal, created: -90, seq: 2, title: "Appointments and records", amount_inr: 450000,
      description: "Booking, rescheduling and lab report viewing on web and mobile.",
      criteria: [
        "Patients can book, move and cancel appointments.",
        "Lab reports open as PDFs within 3 seconds on 4G.",
        "All screens pass WCAG 2.1 AA automated checks.",
      ],
      evidence: "lotus/portal/m2", delivered: -20,
    },
    {
      engagement: portal, created: -90, seq: 3, title: "Payments and launch", amount_inr: 250000,
      description: "UPI and card payments, receipts and store release.",
      criteria: [
        "UPI and card payments succeed in the payment gateway's test mode.",
        "Receipts are emailed within one minute of payment.",
        "The app is live on the App Store and Google Play.",
      ],
      evidence: "lotus/portal/m3", delivered: -3,
    },
    {
      engagement: fleet, created: -60, seq: 1, title: "Live map and alerts", amount_inr: 350000,
      description: "Real-time vehicle map with geofence alerts for dispatchers.",
      criteria: [
        "The map shows every active vehicle, refreshed at least every 30 seconds.",
        "Geofence alerts reach the dispatcher within 60 seconds.",
        "Dispatchers can filter vehicles by depot and status.",
      ],
      evidence: "monsoon/fleet/m1", delivered: -6,
    },
    {
      engagement: fleet, created: -60, seq: 2, title: "Reports and exports", amount_inr: 280000,
      description: "Daily distance and idle-time reports with CSV and PDF export.",
      criteria: [
        "Daily distance and idle-time report for each vehicle.",
        "Reports export to CSV and PDF.",
        "Reports for 500 vehicles load within 5 seconds.",
      ],
      evidence: "monsoon/fleet/m2", delivered: -35, accepted: { day: -35, time: "17:30", by: "Rohan Desai" }, invoiced: -34,
    },
  ];

  const milestones: Milestone[] = [];
  const events: AppEvent[] = [];
  const event = (milestone_id: ObjectId | null, by: Actor, type: string, when: Date, data: Record<string, unknown> = {}) =>
    events.push({ _id: new ObjectId(), workspace_id: ws, milestone_id, actor: by, type, data, at: when });

  for (const p of plan) {
    const _id = new ObjectId();
    const criteria = p.criteria.map((text, i) => ({ id: String.fromCharCode(97 + i), text }));
    const evidence = [
      { label: "Staging build", url: `https://example.com/${p.evidence}/staging` },
      { label: "Test report", url: `https://example.com/${p.evidence}/tests` },
    ];
    const pack_md = [
      `Acceptance pack for **${p.title}** (fictional demo data).`,
      ...criteria.map((cr) => `### (${cr.id}) ${cr.text}\n\nMet. See the staging build and test report linked below.`),
    ].join("\n\n");

    milestones.push({
      _id, workspace_id: ws, engagement_id: p.engagement, seq: p.seq, title: p.title, description: p.description,
      amount_inr: p.amount_inr, criteria, delivered_on: day(p.delivered), pack_md, evidence, review_token: newToken(),
      client_accepted_at: p.accepted ? at(p.accepted.day, p.accepted.time) : null,
      client_accepted_by: p.accepted?.by ?? null,
      invoiced_on: p.invoiced === undefined ? null : day(p.invoiced),
      paid_on: p.paid === undefined ? null : day(p.paid),
      created_at: at(p.created, "10:00"),
      updated_at: at(p.paid ?? p.invoiced ?? p.accepted?.day ?? p.delivered, "18:00"),
    });

    event(_id, "supplier", "milestone_created", at(p.created, "10:00"), { title: p.title, amount_inr: p.amount_inr });
    event(_id, "supplier", "submitted_for_acceptance", at(p.delivered, "10:30"), { delivered_on: day(p.delivered) });
    if (p.accepted) event(_id, "client", "client_accepted", at(p.accepted.day, p.accepted.time), { by: p.accepted.by });
    if (p.invoiced !== undefined) event(_id, "supplier", "marked_invoiced", at(p.invoiced, "12:00"), { invoiced_on: day(p.invoiced) });
    if (p.paid !== undefined) event(_id, "supplier", "marked_paid", at(p.paid, "12:00"), { paid_on: day(p.paid) });
  }

  // Monsoon M1: objection raised 2 days ago, inside the 15-day window, still open.
  const liveMap = milestones[3];
  await c.objections.insertOne({
    _id: new ObjectId(), workspace_id: ws, milestone_id: liveMap._id, criteria_ids: ["b"],
    note: "Geofence alerts reached our dispatchers up to 4 minutes late on the Pune routes. The criterion says within 60 seconds.",
    raised_by: "Rohan Desai", raised_at: at(-2, "16:20"), outside_window: false, resolved_at: null, resolution_md: null,
  });
  event(liveMap._id, "client", "objection_raised", at(-2, "16:20"), { by: "Rohan Desai", criteria_ids: ["b"], outside_window: false });

  event(null, actor, "demo_reset", new Date());

  await c.milestones.insertMany(milestones);
  await c.events.insertMany(events.sort((a, b) => a.at.getTime() - b.at.getTime()));
}
