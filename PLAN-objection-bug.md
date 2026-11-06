# Objection bug: investigation and plan (Gate 1)

Written 6 Nov 2026, 10:15 IST, against commit `abcff49`. No code has been changed. Part 2 (the redesign) has not started.

**Status:** approved at 10:20 IST, with the mismatch flag derived on read. It's fixed in the commit that adds this line, and every case in section 5 passed locally.

## 1. Repro result

**The crash as reported (a name mismatch crashes the page): not reproduced.** An objection signed "Mira", against the approver on record "Meera Iyer", saved normally both locally and on production. The page showed its confirmation, and there were no browser or server errors.

**The reported symptoms (page crashes, nothing saved, status stays awaiting acceptance): reproduced, but not caused by the name.** They happen whenever the submit request fails before the server answers. I stopped the local server with the review page open, then submitted:

```
Uncaught TypeError: Failed to fetch
    at fetchInternal (http://localhost:3000/_next/static/chunks/node_modules_next_dist_client_1165-soo5tfpf._.js:11602:12)
    at fetchServerAction (http://localhost:3000/_next/static/chunks/node_modules_next_dist_client_1165-soo5tfpf._.js:7452:38)
```

Next then replaced the whole page with "This page couldn't load. Reload to try again, or go back." No objection was saved.

**A second, real bug turned up:** a double submit on a deemed-accepted milestone saves two identical late objections.

Each case was run through the review page in a browser, on throwaway records under a fictional client with approver Meera Iyer. For the empty and overlong names, the browser's own checks were removed so that the server's checks were tested.

| Case | Where | Result today |
|---|---|---|
| Mismatched name "Mira" | local and production | Saved as "Mira". Banner: "You raised an objection on (b) and (e)…" |
| Matching "Meera Iyer" | local | Saved |
| "meera iyer " (case and space) | local | Saved as "meera iyer", trimmed |
| Unicode "मीरा अय्यर · Mîra Iyér" | local | Saved unchanged |
| Empty name | local | Refused inline: "Type your full name to raise the objection." Nothing saved |
| 101-character name | local | Refused inline with the same message, which is misleading for a name that's too long. Nothing saved |
| Double submit, inside the window | local | One objection. The second submit is refused, because the first one opened the objection |
| Double submit, deemed accepted (late) | local | **Two identical late objections saved** |
| Request fails in transit (server stopped) | local | **Page crash** (error above). Nothing saved |

What I couldn't establish:
- Which failure you hit. The database holds your run from 04:12 to 04:50 IST: Acme created, M2 submitted and accepted. It has no objection from that run.
- What production logged at the time. I didn't check Vercel's logs, which are probably no longer kept from that long ago.

The likely triggers are a dropped mobile connection or a page opened before a deploy. There were deploys at about 03:40 and 04:03 IST, and the action IDs change with each one.

## 2. Root cause

**Crash: there's no error boundary, and nothing catches a failed action call.**
- `components/action-form.tsx:17` hands the server action to `useActionState(action, null)`.
- When the call itself rejects, React throws the rejection to the nearest error boundary. The call rejects when the network fails, when the server returns a 5xx, or when a page from an older deploy uses an action ID that no longer exists.
- There's no boundary to catch it: no `app/r/[token]/error.tsx`, no `app/error.tsx` and no `app/global-error.tsx`. So Next's default error screen replaces the page.
- `attempt()` in `lib/action.ts:6-15` only catches errors thrown inside the action on the server. It can't see a request that never arrived or a reply that never came back.

**The name isn't part of it.** It's never compared with the approver:
- `app/r/[token]/actions.ts:9` trims it.
- `app/r/[token]/actions.ts:23` checks that it's 1 to 100 characters.
- `lib/milestones.ts:369` stores it as `raised_by`.
- The approver's name only appears as the field's `defaultValue` (`app/r/[token]/page.tsx:123,153`).

Any objection whose request fails crashes the same way, whatever the name.

**Duplicate late objections:**
- `lib/milestones.ts:356` lets the client respond while the milestone is deemed accepted (`clientCanRespond`, `lib/rules.ts:66`). A late objection is saved but doesn't change the status, so the gate stays open.
- `components/action-form.tsx` doesn't disable the button while a submit is pending. A double tap queues two submissions, and both reach the insert at `lib/milestones.ts:363`.

**Misleading error:** `app/r/[token]/actions.ts:23` uses one message for an empty name and for one that's too long. The message isn't tied to the field either, so screen readers don't announce which input is wrong.

## 3. Proposed name rule (needs your approval)

1. **Accept any name of 1 to 100 characters after trimming, and store it as typed.** This is already today's behaviour, and the fix keeps it.
2. **Flag a mismatch for the supplier.** A pure function, `signedNameMatches(typed, approver)` in `lib/rules.ts`, compares the two after Unicode normalisation (NFKC), case folding and collapsing spaces. For example:
   - "meera iyer " and "Meera  Iyer" match "Meera Iyer".
   - "Mira" doesn't.
   - A name in another script doesn't. It's still saved, and gets flagged.
3. **Show the flag where the supplier reads the signature:**
   - on the milestone page, beside each objection and the acceptance: "Signed as Mira. The approver on record is Meera Iyer."
   - optionally in `get_milestone` for Claude
4. **Apply the same flag to acceptances** (`client_accepted_by`), since that's a signature too.

**Schema:** the flag is derived on read, as CLAUDE.md rule 2 prefers, so **the MongoDB schema doesn't change**.

The trade-off: `create_engagement` can update a client's approver name later (`lib/milestones.ts:116-119`), and old flags would then be recomputed against the new name. If the flag must be fixed at the moment of signing, store the approver's name with each objection and acceptance instead. That adds `approver_name_at_signing` to `objections` and to `milestones`. **It is a schema change**, so it would have to land in Part 1, because Part 2 forbids schema changes.

## 4. Planned guards

1. **Error boundary** at `app/r/[token]/error.tsx`, plus `app/(app)/error.tsx` for the supplier pages:
   - a plain message: "Something went wrong and your response may not have been saved. Reload the page to check before trying again."
   - a Reload button
   - no stack trace
2. **Catch transport failures in `ActionForm`.** A rejected action call becomes an inline error with the same wording, and the page stays as it was. Next's own redirect and not-found signals are re-thrown, not swallowed.
3. **Show progress:** disable the submit button and show "Sending…" while a submit is pending.
4. **Idempotent objections.** Before inserting, `clientObject` looks for an objection on the same milestone with the same name, note and criteria from the last two minutes. If it finds one, it reports success without inserting. This needs no schema change.

   One race remains: two requests arriving within milliseconds can both pass. Closing that needs a stored submission ID or a unique index, which is a schema or index change. I'd leave it out unless you want it.
5. **Field-specific server errors.** For example: "Type your full name.", "Your name is too long. Use up to 100 characters." and "Tick at least one criterion." `FormState` gains an optional `field`, so `ActionForm` can set `aria-invalid` and `aria-describedby` on that input. The trim, required check and length limits stay as they are.

## 5. Planned tests

**Unit tests (Vitest), on pure functions:**
- `signedNameMatches`:
  - exact match
  - "Mira" is a mismatch
  - "meera iyer " matches
  - extra inner spaces match
  - composed and decomposed accents match
  - another script is a mismatch
- Name validation:
  - empty and whitespace-only names are refused
  - 100 characters is accepted
  - 101 characters gets the length message
  - a Unicode name is accepted and kept unchanged
- Repeat detection:
  - the same content within two minutes is a repeat
  - a different note isn't
  - the same content after two minutes isn't

**In the browser,** locally and then on production against throwaway records, which are deleted afterwards:
- the seven cases from the brief: matching, "Mira", "meera iyer ", empty, overlong, Unicode and double submit
- a submit with the server stopped: an inline error, no crash, nothing saved twice
- a double submit on a deemed-accepted milestone: one late objection
- the supplier page flags "Mira" and doesn't flag "meera iyer "

Then the usual checks: `npm test`, TypeScript, `npm run build`, `npm run check:no-ai`, MCP `tools/list` and login.

## 6. Risks and open questions

1. **The name-specific crash isn't reproduced.** This plan fixes the failure that matches the symptoms. Do you remember the exact screen or message, the device, and whether the review page had been open a while?
2. **Should titles and initials count as a match**, for example "Dr Ananya Sen" against "Ananya Sen"? I propose no: flag it and let the supplier judge.
3. **Derived or stored flag?** See section 3. Stored means a schema change in Part 1.
4. **Should Claude see the flag** in `get_milestone`? That adds a field to the tool's output. The input schemas stay the same.
5. **Time.** It's 10:15 IST and the deadline is 12:10. The fix, with tests and a deploy, should take about 45 to 60 minutes. Part 2, with its own approval gate, won't fit before the deadline as written.
6. **Test traces.**
   - The browser logged a hydration warning about `required` and `maxLength`. My test script caused it by removing those attributes before the page finished loading, so it isn't an app bug.
   - All test records were deleted by ID: 8 objections, 16 events, 2 milestones, 1 engagement and 1 client.
   - Your Acme run and the seeded data are untouched.
