# CLAUDE.md: ProofFlow

Read SPEC.md before doing anything. It is the source of truth. Ask before changing scope.

## The product in one line

The customer's own Claude reads contracts and delivery notes and writes acceptance packs. ProofFlow stores milestones, hosts the client review link, runs the acceptance and payment clock and keeps the audit trail. No AI runs inside this app.

## Hard rules

1. **No AI inside.** Never add OpenAI, Anthropic, the Vercel AI SDK (`ai`), LangChain, LlamaIndex or any model API, SDK or key. `npm run check:no-ai` must pass before every commit.
2. **Rules in one place.** Business rules live only in `lib/rules.ts`, as pure functions with Vitest tests. Status and dates are derived on read and never stored.
3. **Every change is logged.** Each state change writes an `events` row with its actor (`supplier`, `client`, `claude`, `system`). Changes made through MCP use `claude`.
4. **MCP tools:**
   - named verb_noun as in SPEC section 7
   - descriptions written as instructions to Claude
   - inputs validated with zod; errors returned as plain sentences
   - every response includes the relevant app URL
   - never return secrets, session data or another workspace's data
5. **MCP library.** Use `mcp-handler` 2.x with `@modelcontextprotocol/server` 2.x (MCP SDK v2) and zod 4. Streamable HTTP only, stateless: 2.x has no SSE and no Redis.
6. **Review links.** Client review links use 32 random bytes (base64url). The review page needs no login and shows only that milestone.
7. **Markdown.** Render packs, objections and resolutions with react-markdown and no raw HTML.
8. **Money and dates.** Money is whole rupees in integer columns. Dates are calendar dates in Asia/Kolkata.
9. **UI copy.** British English, short sentences, no em dashes. Label demo data as fictional.
10. **Dependencies.** Keep them minimal; ask before adding one.

## Workflow

- Build one slice at a time from SPEC section 10. Start each slice in Plan Mode, show the plan, wait for approval, then build.
- After each slice: tests pass, deploy, smoke-test (MCP Inspector, then claude.ai), commit with a clear message.
- When something breaks, find the root cause, fix it, and add a test or guard so it can't happen again. Don't cover up errors.
- If a slice runs long, stop and say what to cut. Never cut the core loop.

## Layout

```
app/(app)/dashboard, milestones/[id], connect, about
app/login
app/r/[token]                         public client review page
app/api/w/[key]/mcp/route.ts          MCP endpoint; workspace chosen by key
lib/db/schema.ts, lib/db/index.ts
lib/rules.ts, lib/rules.test.ts
lib/milestones.ts                     workspace-scoped reads and writes shared by MCP tools and pages
lib/format.ts, lib/edits.ts           display formatting and chips; pure checks for edited input
lib/auth.ts, lib/crypto.ts, lib/events.ts, lib/mcp/tools.ts, lib/action.ts (server action results)
components/                           ActionForm, CopyButton, Markdown
scripts/seed.ts, scripts/check-no-ai.sh
demo/                                 sample inputs for testing and the video; not used by the app
```

## Commands

```
npm run dev
npm test
npm run db:push                       # create MongoDB indexes (safe to rerun)
npm run db:seed                       # reset the fictional demo workspace
npm run check:no-ai
npx @modelcontextprotocol/inspector --cli --transport http --server-url http://localhost:3000/api/w/<key>/mcp --method tools/list
```

The Inspector CLI also takes `--method tools/call --tool-name <name> --tool-args-json '<json>'` and `--protocol-era modern|legacy`.

Deploy by pushing to main (Vercel Git integration) or with `vercel --prod`.
Repo: `FarazO7/model-context-protocol-mcp-with-next-js` (private). Production: https://model-context-protocol-mcp-with-nex-eight-blush.vercel.app

Next.js 16 runs with Cache Components off (`next.config.ts`): every page renders per request, so don't add `use cache`. Scripts in `scripts/` run on Node 24's built-in TypeScript support and import lib files with `.ts` extensions.

## Environment

`MONGO_URI`, `SESSION_SECRET`, `APP_URL`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_MCP_KEY`

## MCP route

`app/api/w/[key]/mcp/route.ts` (mcp-handler 2.x ignores the path, so there is no `basePath` or `[transport]` segment):

1. Read `key` from params and look up the workspace; return 401 if there is none.
2. Build a handler per request: `createMcpHandler((server) => registerTools(server, workspace), { serverInfo, instructions })(req)`.
3. Export it as GET, POST and DELETE.

Tools throw `UserError` (from `lib/milestones.ts`) for problems Claude can fix; its message is shown as written. Any other error is logged and replaced with a generic sentence.
