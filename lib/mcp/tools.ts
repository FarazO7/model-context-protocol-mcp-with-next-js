import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Workspace } from "@/lib/db/schema";
import { day } from "@/lib/format";
import {
  createEngagement,
  dashboardUrl,
  getMilestone,
  listMilestones,
  milestoneUrl,
  resolveObjection,
  reviewUrl,
  submitForAcceptance,
  UserError,
  type MilestoneRow,
} from "@/lib/milestones";
import { istTimestamp, STATUSES, todayIST, type Clock } from "@/lib/rules";

export const instructions = (ws: Workspace) =>
  [
    `ProofFlow is ${ws.name}'s record of client milestones: acceptance criteria, client review links,`,
    `the ${ws.objection_window_days}-day objection window and payment due dates.`,
    "You do the reading and writing. ProofFlow stores the result and runs the clock; it has no AI of its own.",
    "Amounts are whole rupees. Dates are calendar dates in India (IST).",
    "The dates follow a simplified reading of the MSMED Act and are not legal advice.",
    "Always give the user the ProofFlow links that tools return.",
  ].join(" ");

const reply = (text: string, isError = false) => ({ content: [{ type: "text" as const, text }], isError });

// Known problems reach Claude as written. Anything else is logged and replaced, so internals never leak.
async function run(tool: string, work: () => Promise<unknown>) {
  try {
    return reply(JSON.stringify(await work(), null, 2));
  } catch (e) {
    if (e instanceof UserError) return reply(e.message, true);
    console.error(`MCP tool ${tool} failed`, e);
    return reply(
      "ProofFlow hit an unexpected error and could not finish. Tell the user, and check the dashboard before trying again.",
      true,
    );
  }
}

const text = (max: number) => z.string().trim().min(1).max(max);

const milestoneId = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{24}$/i, { error: "milestone_id is the 24-character id that list_milestones returns." })
  .describe("The id from list_milestones.");

const evidenceInput = z
  .array(
    z.object({
      label: text(200).describe("What the link shows, for example TestFlight build 1.4.0."),
      url: z.url({ protocol: /^https?$/, error: "Evidence links must start with https:// or http://." }).max(2000),
    }),
  )
  .max(30, { error: "Send at most 30 evidence links." });

const markdown = (what: string) =>
  z.string().trim().min(1, { error: `Write the ${what} first.` }).max(20_000, { error: `Keep the ${what} under 20,000 characters.` });

/** The sentence the client sees as a banner, for Claude to pass on. */
const acceptedFrom = (c: Clock) =>
  c.window_end && c.anchor_date
    ? `If no written objection is raised by ${day(c.window_end)}, the milestone counts as accepted from ${day(c.anchor_date)}.`
    : "";

const summary = (r: MilestoneRow) => ({
  id: r.milestone._id.toHexString(),
  client: r.client.name,
  engagement: r.engagement.title,
  milestone: `M${r.milestone.seq}: ${r.milestone.title}`,
  amount_inr: r.milestone.amount_inr,
  status: r.clock.status,
  overdue: r.clock.overdue,
  delivered_on: r.milestone.delivered_on,
  objection_deadline: r.clock.window_end,
  legal_acceptance_date: r.clock.legal_acceptance_date,
  payment_due: r.clock.payment_due,
  url: milestoneUrl(r.milestone._id),
});

export function registerTools(server: McpServer, ws: Workspace) {
  server.registerTool(
    "create_engagement",
    {
      title: "Create engagement",
      description:
        "Use after reading a statement of work, contract or proposal. Create one milestone per billable stage. " +
        "Write acceptance criteria as short, objective, testable statements. Use the contract's amounts; never invent them. " +
        "Show the user the returned links.",
      inputSchema: z.object({
        client: z.object({
          name: text(200).describe("Client company name as written in the contract."),
          approver_name: text(200).describe("The person at the client who accepts deliverables."),
          approver_email: z.email({ error: "approver_email must be an email address." }).describe("That person's email."),
        }),
        title: text(200).describe("Engagement name, such as the project title in the contract."),
        contract_ref: text(100).describe("The contract or SOW reference, for example BFD-ACME-SOW-07."),
        summary: z.string().trim().max(5000).describe("Two or three sentences on scope. Markdown is fine."),
        milestones: z
          .array(
            z.object({
              title: text(200).describe(
                "Milestone name without its number, for example Store finder (iOS and Android). ProofFlow numbers milestones itself.",
              ),
              description: z.string().trim().max(2000).describe("The deliverables for this stage, in a sentence or two."),
              amount_inr: z
                .number({ error: "amount_inr must be a number of rupees." })
                .int({ error: "amount_inr must be whole rupees, with no paise." })
                .positive({ error: "amount_inr must be more than zero." })
                .max(1_000_000_000)
                .describe("Fee in whole rupees excluding GST, exactly as in the contract. ₹2,40,000 is 240000."),
              acceptance_criteria: z
                .array(text(500))
                .min(1, { error: "Each milestone needs at least one acceptance criterion." })
                .max(26)
                .describe("Short, objective, testable statements in the contract's order. ProofFlow letters them (a), (b), (c)."),
            }),
          )
          .min(1, { error: "Add at least one milestone." })
          .max(20)
          .describe("One per billable stage, in contract order."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (input) =>
      run("create_engagement", async () => {
        const { engagement, client, milestones } = await createEngagement(ws, input, "claude");
        return {
          engagement: {
            id: engagement._id.toHexString(),
            title: engagement.title,
            contract_ref: engagement.contract_ref,
            client: client.name,
            approver: `${client.approver_name} <${client.approver_email}>`,
          },
          total_inr: milestones.reduce((sum, m) => sum + m.amount_inr, 0),
          milestones: milestones.map((m) => ({
            id: m._id.toHexString(),
            milestone: `M${m.seq}: ${m.title}`,
            amount_inr: m.amount_inr,
            criteria: m.criteria.map((c) => `(${c.id}) ${c.text}`),
            url: milestoneUrl(m._id),
          })),
          dashboard_url: dashboardUrl(),
        };
      }),
  );

  server.registerTool(
    "list_milestones",
    {
      title: "List milestones",
      description:
        "Use to see where milestones stand before answering questions about clients, deadlines or payments. " +
        "Filter by status or by part of a client's name. Each item has its status, amount, key dates " +
        "(calendar dates in India) and ProofFlow link. Give the link when you mention a milestone.",
      inputSchema: z.object({
        status: z
          .enum(STATUSES)
          .optional()
          .describe("Only milestones in this status. deemed_accepted means no written objection arrived within the window."),
        client_name: text(200).optional().describe("Only this client's milestones. Part of the name is enough, for example Acme."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, client_name }) =>
      run("list_milestones", async () => {
        const name = client_name?.toLowerCase();
        const rows = (await listMilestones(ws)).filter(
          (r) => (!status || r.clock.status === status) && (!name || r.client.name.toLowerCase().includes(name)),
        );
        return { today: todayIST(), count: rows.length, milestones: rows.map(summary), dashboard_url: dashboardUrl() };
      }),
  );

  server.registerTool(
    "get_milestone",
    {
      title: "Get milestone",
      description:
        "Use before writing an acceptance pack, replying to an objection or answering detailed questions about one milestone. " +
        "Returns its criteria with their letters, the acceptance pack, evidence, objections, the last 20 events, " +
        "the computed dates and the client review link. Get the id from list_milestones.",
      inputSchema: z.object({ milestone_id: milestoneId }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ milestone_id }) =>
      run("get_milestone", async () => {
        const found = await getMilestone(ws, milestone_id);
        if (!found) {
          throw new UserError(`There is no milestone ${milestone_id} in this workspace. Call list_milestones to find the right id.`);
        }
        const { milestone: m, engagement, client, objections, events } = found;
        return {
          today: todayIST(),
          ...summary(found),
          description: m.description,
          contract_ref: engagement.contract_ref,
          engagement_summary: engagement.summary_md,
          client_approver: { name: client.approver_name, email: client.approver_email },
          criteria: m.criteria,
          client_accepted: m.client_accepted_at
            ? { by: m.client_accepted_by, at: istTimestamp(m.client_accepted_at) }
            : null,
          invoiced_on: m.invoiced_on,
          paid_on: m.paid_on,
          acceptance_pack_markdown: m.pack_md || null,
          evidence: m.evidence,
          client_review_url: m.review_token ? reviewUrl(m.review_token) : null,
          objections: objections.map((o) => ({
            criteria: o.criteria_ids,
            note: o.note,
            raised_by: o.raised_by,
            raised_at: istTimestamp(o.raised_at),
            outside_window: o.outside_window,
            resolved_at: o.resolved_at ? istTimestamp(o.resolved_at) : null,
            resolution_markdown: o.resolution_md,
          })),
          recent_events: events.map((e) => ({ at: istTimestamp(e.at), actor: e.actor, type: e.type, data: e.data })),
        };
      }),
  );

  server.registerTool(
    "submit_for_acceptance",
    {
      title: "Submit for acceptance",
      description:
        "Before calling, write the acceptance pack: one section per acceptance criterion saying how it is met, with evidence links. " +
        "If a criterion is not fully met, or depends on the client, say so plainly. Never claim a criterion is met without evidence. " +
        "Give the user the review link to send to the client.",
      inputSchema: z.object({
        milestone_id: milestoneId,
        delivered_on: z.iso
          .date({ error: "delivered_on must be a date like 2026-11-06." })
          .describe("The date the work was handed over, in India time (YYYY-MM-DD)."),
        acceptance_pack_markdown: markdown("acceptance pack").describe(
          "Markdown with one section per criterion, headed by its letter, for example ### (b) In-stock badge.",
        ),
        evidence: evidenceInput.describe("Links that back up the pack: builds, test reports, checklists."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ milestone_id, delivered_on, acceptance_pack_markdown, evidence }) =>
      run("submit_for_acceptance", async () => {
        const { milestone: m, clock } = await submitForAcceptance(
          ws,
          milestone_id,
          { delivered_on, pack_md: acceptance_pack_markdown, evidence },
          "claude",
        );
        return {
          milestone: `M${m.seq}: ${m.title}`,
          status: clock.status,
          delivered_on,
          objection_deadline: clock.window_end,
          client_review_url: reviewUrl(m.review_token),
          url: milestoneUrl(m._id),
          message: `Send the client this review link. ${acceptedFrom(clock)}`,
        };
      }),
  );

  server.registerTool(
    "resolve_objection",
    {
      title: "Resolve objection",
      description:
        "First read the objection, the criteria and the contract. Address each criterion raised. " +
        "If the cause sits with the client, such as a client-side dependency, say so politely and cite the contract.",
      inputSchema: z.object({
        milestone_id: milestoneId,
        resolution_markdown: markdown("resolution").describe(
          "Markdown addressed to the client, with one section per criterion they raised.",
        ),
        evidence: evidenceInput.optional().describe("New links that back up the resolution, for example a fixed build."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ milestone_id, resolution_markdown, evidence }) =>
      run("resolve_objection", async () => {
        const { milestone: m, clock } = await resolveObjection(
          ws,
          milestone_id,
          { resolution_md: resolution_markdown, evidence: evidence ?? [] },
          "claude",
        );
        return {
          milestone: `M${m.seq}: ${m.title}`,
          status: clock.status,
          objection_deadline: clock.window_end,
          client_review_url: m.review_token ? reviewUrl(m.review_token) : null,
          url: milestoneUrl(m._id),
          message: `The objection is resolved and the window restarts today. Send the client the same review link. ${acceptedFrom(clock)}`,
        };
      }),
  );
}
