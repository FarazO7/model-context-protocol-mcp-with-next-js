# ProofFlow: build spec v1 (for approval)

Owner: Faraz. Status: awaiting approval. Nothing gets built until this is approved.
Deadline: submit by 12:10 IST, 6 Nov 2026. Build budget: about 6 hours.
Every company and person in the demo data is fictional.

## 1. What it is

ProofFlow takes a milestone from "we delivered it" to "the client accepted it, and payment falls due on this date". It is for Indian IT services firms and digital agencies that bill by milestone.

The firm's own Claude does the thinking: it reads the contract, writes the acceptance pack from messy delivery notes, and drafts replies to objections. ProofFlow keeps the record: milestones, the client's review link, the acceptance deadline, payment due dates and an audit trail. There is no AI inside ProofFlow, and it moves no money.

## 2. Users

- **Customer (pays):** delivery or finance lead at a 10 to 200 person IT services firm or agency in India that bills by milestone and already uses Claude.
- **Client approver (second party):** opens a review link with no login, then accepts or raises a written objection against specific criteria.
- **Claude (the customer's own plan):** reads, writes and checks through ProofFlow's MCP tools.

## 3. The legal hook (simplified, not legal advice)

For a Udyam-registered micro or small supplier, the MSMED Act works like this. If the buyer raises no written objection within 15 days of the service being rendered, the service counts as accepted from the day it was rendered. The agreed payment period, which can never exceed 45 days, runs from that day. ProofFlow's "Raise objection" button is the written objection, and its timestamps are the record.

## 4. Who does what

| Claude (customer's plan) | ProofFlow |
|---|---|
| Reads the SOW and proposes milestones, amounts and testable acceptance criteria | Stores engagements, milestones and criteria, and lets the user edit them |
| Turns delivery notes (chat threads, ticket exports, links) into an acceptance pack, criterion by criterion, saying plainly what is not met | Hosts the client review link and records each accept or objection with a name and time |
| Reads an objection against the criteria and the contract, then drafts the resolution | Runs the clock: objection deadline, deemed acceptance, payment due date, overdue |
| Summarises the pipeline and drafts follow-ups | Dashboard, audit trail, Connect Claude page |

## 5. Rules (pure functions in `lib/rules.ts`, unit-tested)

Workspace settings: objection window 15 days; agreed payment days 30; written agreement yes. Dates are calendar days in Asia/Kolkata.

- **Anchor date** = date of the latest resolved objection, otherwise `delivered_on`.
- **Window end** = anchor date + 15 days.
- **Status** is derived on every read and never stored. First match wins:
  1. `paid` if `paid_on` is set.
  2. `invoiced` if `invoiced_on` is set, with an `overdue` flag if today is after the payment due date.
  3. `draft` if not yet delivered.
  4. `objection_open` if an objection raised inside the window is unresolved.
  5. `accepted` if the client accepted on or after the anchor date.
  6. `deemed_accepted` if today is after the window end.
  7. Otherwise `awaiting_acceptance`.
- **Legal acceptance date** (for `accepted` and `deemed_accepted`) = anchor date.
- **Payment due** = legal acceptance date + min(agreed days, 45). With no written agreement: + 15 days.
- An objection raised after the window end is saved, marked "outside the 15-day window", and does not change the status.
- Resolving an objection clears the client's acceptance and restarts the window from the resolution date. This is a simplification; say so on the Prototype notes page.
- Every change writes an `events` row with its actor: `supplier`, `client`, `claude` or `system`.

Minimum unit tests:

1. Delivered 1 Nov, no action, today 17 Nov: `deemed_accepted`, legal date 1 Nov, due 1 Dec.
2. Delivered 1 Nov, client accepts 5 Nov: `accepted`, legal date 1 Nov, due 1 Dec.
3. Objection 10 Nov, resolved 14 Nov, client accepts 15 Nov: `accepted`, legal date 14 Nov, due 14 Dec.
4. Agreed days 60: capped at 45.
5. No written agreement: due = legal date + 15.
6. Objection raised 17 Nov on a 1 Nov delivery: saved, flagged outside the window, status stays `deemed_accepted`.
7. Invoiced, today past due, not paid: `invoiced` with `overdue`.

## 6. Data model (MongoDB; ids are ObjectIds, dates are `YYYY-MM-DD` strings)

- `workspaces`: id, name, udyam_number, objection_window_days (15), agreed_payment_days (30), written_agreement (true), mcp_key (unique)
- `users`: id, workspace_id, email, password_hash, name
- `clients`: id, workspace_id, name, approver_name, approver_email
- `engagements`: id, workspace_id, client_id, title, contract_ref, summary_md, created_at
- `milestones`: id, workspace_id, engagement_id, seq, title, description, amount_inr (integer rupees), criteria (array `[{id, text}]`), delivered_on (date), pack_md, evidence (array `[{label, url}]`), review_token (unique where set), client_accepted_at, client_accepted_by, invoiced_on, paid_on, created_at, updated_at
- `objections`: id, workspace_id, milestone_id, criteria_ids (array), note, raised_by, raised_at, outside_window, resolved_at, resolution_md
- `events`: id, workspace_id, milestone_id, actor, type, data (object), at

## 7. MCP tools

Endpoint: `https://<app>/api/w/<mcp_key>/mcp` (Streamable HTTP). The key in the path selects the workspace. Every response includes the relevant ProofFlow URL. Inputs are validated with zod, and errors are plain sentences Claude can act on.

1. **`create_engagement`**: client {name, approver_name, approver_email}, title, contract_ref, summary, milestones [{title, description, amount_inr, acceptance_criteria: string[]}]. Returns engagement and milestone URLs.
   Description to Claude: "Use after reading a statement of work, contract or proposal. Create one milestone per billable stage. Write acceptance criteria as short, objective, testable statements. Use the contract's amounts; never invent them. Show the user the returned links."
2. **`list_milestones`**: optional status and client_name. Returns milestones with status, amount, key dates and URL.
3. **`get_milestone`**: milestone_id. Returns everything: criteria, pack, evidence, objections, the last 20 events, computed dates and the client review URL.
4. **`submit_for_acceptance`**: milestone_id, delivered_on, acceptance_pack_markdown, evidence [{label, url}]. Returns the client review URL and the objection deadline.
   Description: "Before calling, write the acceptance pack: one section per acceptance criterion saying how it is met, with evidence links. If a criterion is not fully met, or depends on the client, say so plainly. Never claim a criterion is met without evidence. Give the user the review link to send to the client."
5. **`resolve_objection`**: milestone_id, resolution_markdown, optional evidence. Marks the open objection resolved, restarts the window and returns the review URL.
   Description: "First read the objection, the criteria and the contract. Address each criterion raised. If the cause sits with the client, such as a client-side dependency, say so politely and cite the contract."
6. **`update_milestone`**: milestone_id, changes {title, description, amount_inr, acceptance_criteria, invoiced_on, paid_on}. Returns the URL.
7. **`get_pipeline_summary`**: no input. Returns counts and rupee totals by status, objection deadlines in the next 7 days, open objections with notes, deemed acceptances in the last 14 days, and payments due in the next 30 days or overdue. Every item has a URL.

## 8. Screens

1. **Login:** email and password, one seeded account, no sign-up.
2. **Dashboard:** columns for Awaiting acceptance, Objection open, Accepted (with a badge if deemed), Invoiced and Paid, each with a rupee total. Chips such as "Objection window closes in 3 days", "Due in 5 days" and "Overdue 4 days". A "Next deadlines" list.
3. **Milestone page (the editing experience):**
   - edit title, amount and description
   - add, edit, remove and reorder criteria
   - acceptance pack editor (markdown with preview) and evidence links
   - clock card: delivered, objection deadline, legal acceptance date, payment due
   - objection panel
   - buttons: Copy client link, Mark invoiced, Mark paid
   - event timeline with actor badges (You, Client, Claude, System)
4. **Client review page `/r/<token>`:**
   - public and mobile-first
   - shows supplier, client, milestone, amount, acceptance pack, evidence links and a criteria checklist
   - banner: "If no written objection is raised by {date}, this milestone counts as accepted from {delivered date}."
   - buttons: Accept (name required) and Raise objection (tick the unmet criteria, write a note, name required)
   - confirmation with timestamp; if already decided, shows the history
5. **Connect Claude:**
   - the workspace MCP URL with a copy button
   - three steps to add it in Claude
   - note: on Team and Enterprise plans an Owner must add it; Free plans allow one custom connector
   - sample prompts and the tool list
6. **Prototype notes:** what is real, what is simulated and what is not built. Says the rules are simplified, it is not legal advice, and the data is fictional.
7. **Stretch:** engagement page; "Reset demo data" button.

## 9. Stack

- Next.js (App Router) and TypeScript
- Tailwind and shadcn/ui
- MongoDB Atlas with the official `mongodb` driver (no ORM)
- `mcp-handler` 2.x with `@modelcontextprotocol/server` 2.x (MCP SDK v2), plus zod 4
- Node scrypt password hashes with a signed session cookie
- react-markdown with no raw HTML
- Vitest
- Hosting on Vercel

No AI SDKs or keys anywhere.

## 10. Build order and time boxes

0. **30 min, now:** deploy Vercel's "MCP with Next.js" template untouched and add it to Claude as a custom connector. Call its sample tool, then confirm that a URL with a secret path segment still connects.
1. **60 min:** scaffold, MongoDB, indexes, seed (dates relative to today), login.
2. **30 min:** `lib/rules.ts` and the seven tests.
3. **60 min:** MCP route with key lookup; `create_engagement`, `list_milestones`, `get_milestone`. Test in MCP Inspector, then in claude.ai with `demo/sample-sow.md`.
4. **60 min:** dashboard and milestone page with editing.
5. **75 min:** `submit_for_acceptance`, client review page, accept and objection, `resolve_objection`, events.
6. **45 min:** `get_pipeline_summary`, `update_milestone`, Connect Claude and Prototype notes pages, mobile polish, deploy.

Total about 6 hours. If you are behind at 03:30, cut slice 6 polish, never the core loop.

## 11. Seed data (fictional)

Supplier: Brightfield Digital Pvt Ltd, a Udyam-registered micro enterprise (dummy number).

- **Lotus Health, "Patient portal":**
  - M1: paid
  - M2: deemed accepted (delivered 20 days ago, no response), so due in 10 days
  - M3: awaiting acceptance (delivered 3 days ago)
- **Monsoon Logistics, "Fleet tracking dashboard":**
  - M1: objection open (delivered 6 days ago, objection raised 2 days ago, note filled)
  - M2: accepted 35 days ago, invoiced, overdue by 5 days

Acme Retail is created live in the demo from `demo/sample-sow.md`. The test login goes in the README and the submission notes.

## 12. Definition of done (test as a stranger)

- [ ] Log in with the test account in a private window.
- [ ] Add the MCP URL in a fresh Claude account; the tools load.
- [ ] Prompt 1 with the sample SOW creates Acme's engagement with four milestones and their criteria; the links open.
- [ ] Edit an amount and a criterion in the app; the change and an event appear.
- [ ] Prompt 2 with the delivery notes submits M2. The pack covers every criterion and flags both gaps, and the review link opens on a phone.
- [ ] Raise an objection on the phone; the dashboard shows Objection open.
- [ ] Prompt 3 resolves it, the client accepts, and the payment due date shows.
- [ ] Seeded Lotus M2 shows Deemed accepted with correct dates.
- [ ] Prompt 4 returns a correct pipeline summary.
- [ ] `npm run check:no-ai` passes: no AI packages or keys anywhere.
- [ ] The review page works logged out and on mobile.

## 13. Not built (say so on Prototype notes)

- Email and WhatsApp sending: links are copied by hand (simulated).
- File uploads: evidence is links.
- Invoices and payments.
- OAuth for the connector: a secret URL is used instead.
- Multiple users and roles.
- Jira, Tally and Zoho sync.
- Business-day calendars.
- Late-payment interest.

## 14. Demo script (about 2 minutes)

1. Claude, with the SOW: prompt 1. Open the link to show four milestones with criteria.
2. In ProofFlow: change an amount and tighten a criterion (the editing experience).
3. Claude, with the delivery notes: prompt 2. The pack flags the stock-badge dependency and the font-size bug, and returns the review link.
4. Phone: the client raises an objection on criteria (b) and (e).
5. Claude: prompt 3. The resolution cites contract clause 5 for (b) and the 1.4.1 fix for (e).
6. Phone: the client accepts. The dashboard shows Accepted with a payment due date, and Lotus M2 shows Deemed accepted.
7. Claude: prompt 4 asks what is stuck and what is due.

## 15. How this feeds the submission

- **Strategy doc, page 1:** sections 1 to 3, plus competitors, pricing and the plan (your numbers).
- **Strategy doc, page 2:** live links, connect steps, screenshots of demo steps 1, 3, 4 and 6, and the real-versus-simulated box.
- **Architecture notes:** sections 4 to 9 and 13, the responsibilities table, and built versus proposed.
- **Supporting ZIP:** this spec, the demo inputs and the unit-economics sheet.
