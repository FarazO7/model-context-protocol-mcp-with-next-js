# Demo inputs and prompts (fictional)

## What the client types on the review page (step 4)

Name: Meera Iyer
Criteria not met: (b) and (e)
Note: The in-stock badge is missing for many of our Bengaluru stores. At the largest text size, store opening hours are cut off.

## Prompts to paste into Claude (with the ProofFlow connector switched on)

1. **Set up:** attach `sample-sow.md`, then:
   "Here's our SOW with Acme Retail. Set up this engagement in ProofFlow with its milestones and acceptance criteria."

2. **Submit:** attach `delivery-notes-m2.md`, then:
   "Milestone 2, the store finder, shipped today. Build the acceptance pack from these delivery notes, be honest about anything not fully met, and send it to Acme for acceptance."

3. **Resolve:**
   "Acme has raised an objection on the store finder milestone. Read it, check it against the SOW and the delivery notes, and send a resolution. Build 1.4.1 with the BF-388 fix is on TestFlight: https://example.com/testflight/acme-1-4-1"

4. **Summary:**
   "What's stuck in ProofFlow, which milestones were deemed accepted, and what payments fall due this month?"

5. **Follow-ups (optional):**
   "Draft a polite nudge for every client whose objection window closes in the next 3 days."

## What a good answer looks like (for testing)

- **Prompt 1:** four milestones totalling ₹12,00,000, with criteria (a) to (e) for M2 copied faithfully.
- **Prompt 2:**
  - (a), (c) and (d) are met; (d) is 99.71% against the 99.5% target.
  - (b) is only partly met because of Acme's API issue ACME-API-212, which SOW clause 5 covers.
  - (e) is not yet met because of bug BF-388, with the fix due in 1.4.1.
- **Prompt 3:**
  - (b): cites SOW clause 5 and ACME-API-212 politely.
  - (e): points to the 1.4.1 fix.
  - Then calls resolve_objection.
