# Glassmorphism redesign: plan (Gate 2)

Written 6 Nov 2026, 10:45 IST, on commit `d5a3cae`, after the objection fix was approved and merged. No code has been changed for the redesign. This plan waits for your approval.

**Status:** approved at 10:50 IST, with the deadline moved to 14:00, and built in the commit that adds this line. Where you didn't decide, I used the recommended options: the accessible colour steps, inline SVG icons and all four new screens.

## 1. What exists today

**Routes**

| Route | File | What it does |
|---|---|---|
| `/login` | `app/login/page.tsx` | Email and password form with an inline server action |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Six status columns with rupee totals, chips and Next deadlines |
| `/milestones/[id]` | `app/(app)/milestones/[id]/page.tsx` | Edit details, criteria, pack and evidence. Clock card with Mark invoiced, Mark paid and the name check. Objections and timeline |
| `/connect` | `app/(app)/connect/page.tsx` | Connector URL with copy, steps, sample prompts, tools |
| `/about` | `app/(app)/about/page.tsx` | Prototype notes and Reset demo data |
| `/r/[token]` | `app/r/[token]/page.tsx` | Public client review: accept or object |
| `/api/w/[key]/mcp` | `app/api/w/[key]/mcp/route.ts` | MCP endpoint, no UI |

**Layouts:**
- `app/layout.tsx` loads the Geist fonts.
- `app/(app)/layout.tsx` has the header nav and the footer.
- There are error boundaries at `app/(app)/error.tsx` and `app/r/[token]/error.tsx`.

**Components:** `ActionForm` (server action results, pending state, field errors), `CopyButton` and `Markdown`.

**Styling:**
- Tailwind 4 is configured in `app/globals.css` with `@theme`. There is no `tailwind.config`.
- Classes are written inline, with small per-page constants such as `input`, `primary` and `card`.
- **shadcn/ui is not installed**, though the SPEC lists it. There's no icon library.
- There are no dropdowns or modals today.

**Auth, database and MCP** live in `lib/auth.ts`, `lib/milestones.ts` and `lib/mcp/tools.ts`. The redesign doesn't touch them.

**Screens the brief describes that don't exist:**
- an Engagements list
- an Activity log
- Settings
- an MCP connection status

See section 5.

## 2. Design system

**Tokens in `app/globals.css` (`@theme`):**
- the brief's palette: charcoal `#25272C`, background `#F4F5F7`, electric blue `#477BEB`, white, text `#20232B`, muted `#737987`, glass border and glass surface
- two darker steps for accessible small text (see risk 2): blue `#3366DD` and grey `#5F6573`

**Utilities (Tailwind 4 `@utility`, no component code):**
- `glass`: white at 65%, a 20px backdrop blur, a white border at 75%, a soft shadow and 16 to 20px radius
- `glass-solid`: a more opaque variant for forms and long reading
- `btn-primary`, `btn-secondary` and `btn-danger`
- `field`: inputs, with a blue focus ring

**Background:** the light grey-blue base, plus two or three soft radial blue glows fixed behind the content. They're `aria-hidden`, use no images, and never sit behind body text at full strength.

**Motion:**
- a hover lift on cards and buttons, 1 to 2px with a slightly deeper shadow
- a 150ms fade-in for page content
- a drawer slide on mobile

All of it uses `motion-safe:` variants, so `prefers-reduced-motion` turns it off.

**Type:** keep Geist, already loaded. Pages get one strong heading, medium section headings, 14 to 16px body text and the muted colour for secondary text.

**Status badges (tinted pills with a dot and the label text, so colour is never the only signal):**

| Status | Tone |
|---|---|
| Accepted, deemed accepted, paid | green. Deemed adds the word "Deemed" |
| Awaiting acceptance | blue |
| Objection open | red |
| Draft | grey |
| Invoiced | indigo |
| Overdue | orange-red, as a second badge |

## 3. New shared components

| Component | Purpose |
|---|---|
| `components/icons.tsx` | About 12 inline SVG icons: dashboard, engagements, activity, connect, notes, settings, menu, close, copy, check, alert and clock. No dependency |
| `components/status-badge.tsx` | One badge for a status and the overdue flag, used everywhere a status shows |
| `components/app-nav.tsx` (client) | A charcoal sidebar on desktop and a drawer on mobile. Marks the active item with `usePathname`. Escape closes the drawer, and focus returns to the menu button |
| `components/kpi-card.tsx` | A glass card with a label, value, rupee total and icon |
| `components/status-bar.tsx` | The status distribution as a stacked bar, CSS only. The legend shows counts as text, so the bar doesn't rely on colour |
| `app/(app)/loading.tsx`, `app/r/[token]/loading.tsx` | Glass skeletons while a page loads |

The existing components keep their props and behaviour:
- `ActionForm` gets message styling only.
- `CopyButton` gets a "Copied" tick.
- `Markdown` gets retuned spacing.

## 4. Screens

- **Login:** a charcoal-to-blue gradient, a floating glass panel, the ProofFlow wordmark, restyled fields and a blue button. The same form, action and error text.
- **App shell:**
  - the sidebar holds Dashboard, Engagements, Activity, Connect Claude, Prototype notes and Settings, then the workspace and user, then Log out
  - on mobile, a top bar with a menu button opens the drawer
  - the fictional-data footer stays
- **Dashboard:**
  - **KPI row:** total milestones, awaiting acceptance, open objections and payments due (within 30 days or overdue), with counts and rupee totals from the existing `listMilestones` and `pipeline()`
  - the status bar
  - **milestone table:** client, milestone, amount, status badge, the next-deadline chip and a link. It replaces the six columns, and on phones the rows stack as cards
  - **Upcoming payment deadlines:** today's Next deadlines, restyled
  - **Recent activity:** see section 5
- **Milestone page:**
  - **header:** title, client and engagement, amount, status badges
  - **summary strip:** delivered, objection deadline, legal acceptance, payment due, accepted by (with the name check), invoiced and paid
  - **sections:** Acceptance criteria, Pack and evidence, Objections and resolutions, Invoice and payment (the two buttons), and the Audit trail
  - a short in-page section nav replaces tabs, so everything stays server-rendered and printable
  - every form and action stays as it is
- **Client review page:** glass only for the header card and the decision panel. The pack, criteria and forms sit on solid white for readability. It keeps:
  - large touch targets
  - the same forms and actions
  - the Part 1 inline errors, the "Sending…" state, the error boundary and the repeat guard
- **Connect Claude:**
  - an endpoint card with copy
  - the steps as numbered cards
  - the prompts and a tools grid
  - a status line (see section 5)
- **Prototype notes:** glass sections, with Reset demo data styled as a danger zone.

## 5. New screens (need your decision)

These are new features, not restyles, and some need a new database read. The brief rules out query changes, so each one needs your OK:

1. **Engagements (`/engagements`):**
   - a table of client, contract reference, total value, milestone count and a status summary
   - built from the existing `listMilestones`, so no new query
   - search and sort through the URL (`?q=` and `?sort=`), rendered on the server
   - **Create engagement** links to Connect Claude's prompts, because engagements are created by Claude and there's no form to add without a new write path
2. **Activity log (`/activity`)** and **Recent activity on the dashboard:**
   - workspace events, newest first, with time, actor badge and description, filtered by actor through `?actor=`
   - **This needs a new read** (`listEvents(ws)`), which uses the existing `{workspace_id, at}` index. No schema change
3. **Settings (`/settings`):** the workspace name, Udyam number, objection window, payment days and written agreement, read-only. No new query, because the data is already in the session.
4. **Connection status on Connect:** the MCP route is stateless and records no connections, so a live status isn't possible. The honest version is "Last change by Claude: 6 Nov 2026, 10:16", from the same new events read. Or leave it out.

## 6. Files

**Changed:**
- `app/globals.css`
- `app/layout.tsx`
- `app/(app)/layout.tsx`
- `app/login/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/milestones/[id]/page.tsx`
- `app/r/[token]/page.tsx`
- `app/(app)/connect/page.tsx`
- `app/(app)/about/page.tsx`
- both `error.tsx` files
- `components/action-form.tsx`, `components/copy-button.tsx` and `components/markdown.tsx`, restyled only
- `lib/format.ts`, a status tone map next to `STATUS_LABEL`

**New:** the components in section 3, plus the section 5 pages if you approve them. Those include `listEvents` in `lib/milestones.ts`.

**Not touched:**
- `lib/rules.ts`
- `lib/db/*`, `lib/auth.ts` and `lib/crypto.ts`
- `lib/mcp/*` and `app/api/*`
- every server action's logic
- `scripts/*`

## 7. Verification (after approval)

1. `npm test`, TypeScript, lint, `npm run build` and `npm run check:no-ai`.
2. Every route at 1440, 1024, 768 and 375px wide, checked for sideways scrolling and overflowing panels, with screenshots.
3. **Flows:**
   - login and logout
   - editing details, criteria and the pack
   - Mark invoiced and Mark paid
   - Copy client link and copying the connector URL
   - the review page: accept, an objection signed "Mira", an empty name, a double submit, and a failed request
   - Reset demo data
   - MCP `tools/list` on production
4. Contrast of every text colour against its surface, computed, all at least 4.5:1.
5. Reduced motion: no movement with `prefers-reduced-motion: reduce`.

## 8. Risks

1. **Time.**
   - It's 10:45 IST and the deadline is 12:10.
   - The full plan is about 3 to 4 hours of work. Sections 2 to 4 alone are about 2 hours.
   - A redesign landing in the last hour risks breaking the demo and leaving the submission screenshots inconsistent.
   - **Recommendation:** submit on the current design and build the redesign after the deadline. If you want something before it, limit it to the tokens, the shell, the login and the dashboard KPIs, with a hard stop at 11:45 and `git revert` if any check fails.
2. **Contrast.** I computed these against the brief's colours, where WCAG AA needs 4.5:1 for normal text:

   | Pair | Contrast |
   |---|---|
   | Muted `#737987` on glass | 4.24:1 |
   | Muted on the background | 4.00:1 |
   | White text on `#477BEB` | 3.96:1 |
   | `#477BEB` links on white | 3.96:1 |
   | Primary text on glass | 15.3:1 |

   The proposal: keep `#477BEB` and `#737987` for icons, large text, borders and accents. Use `#3366DD` (5.14:1) for button fills and small links, and `#5F6573` (5.68:1) for small secondary text.
3. **Glass and readability.**
   - Contrast on glass depends on what's behind it, so the glows stay faint.
   - Forms and long text use `glass-solid`.
   - The review page keeps its content on solid panels.
4. **Performance.** `backdrop-filter` is costly on low-end phones. Blur stays on a few large panels, never on lists or table rows.
5. **The new read for Activity.** It's an added query, which the brief's "don't change queries" rule may exclude. Engagements and Settings need none.
6. **Create engagement** can't be a form without a new write path, so it links to Connect Claude.
7. **Live connection status** isn't possible with a stateless MCP route (see section 5).
8. **Dependencies.**
   - Inline SVG icons avoid a dependency. `lucide-react` would need your OK.
   - shadcn/ui would add several dependencies and replace working components, so the plan doesn't use it.
9. **Shared-database testing.**
   - Flow checks write to the database that production uses, so they run on throwaway records that are deleted afterwards, as in Part 1.
   - Your Acme run stays untouched.

## 9. Decisions needed

1. **Timing:** after the deadline (recommended), or the limited pass with a cut-off at 11:45.
2. **New screens:** Engagements, Activity (with the new events read), Settings and the connection line. All, some or none.
3. **Accessible colour steps:** `#3366DD` and `#5F6573` for small text and button fills.
4. **Icons:** inline SVG (recommended) or `lucide-react`.
