# Ticket 18 / Slice 173 — unknown source address repair

## Actual checkpoint

`overall-v3-c904482236da37da200f` completed packet 017 after lossless 25→24 claim packing and two fresh actual source reviews. Candidate `461bb860194db7b16e23039473e48c58a8912ba9e5da05fda5ca62e83f1a675f` has no open issues. This proves the packing path reached fresh review, not that the complete Skill or strategy is accepted.

Packet 018 then stopped: its Generator and format retry were byte-identical, with one unknown source address in `claims.7.evidence.0`: `core.iuUyObNTQ2M8xK4IUqzC.items.4.subItems.2/p1`. The full frozen source contains Movement Passing at `.items.4.subItems.1/p1`; the host must not infer that a neighboring ID is automatically the intended source.

The stopped run made 6 calls / 756,919 tokens / estimated ¥0.120281. Across all recorded production attempts, known Provider tokens are at least **18,015,877**, with **¥39.749119** estimated settled cost plus historical unknown-use reserve, not an invoice. Earlier failed attempts remain charged and preserved. The overall-production ancestry now consumes 66 calls / 8,321,604 tokens / ¥1.274291 against the original 600-call / 30M-token / ¥20 / 6-hour limits; restart does not reset time or budget.

Reading progress: **17/37 complete, 20 remaining**. Ticket 18 **1/8**, project **16/22**, formal first-five **0/5**.

## Change

- `address-repair.mjs` identifies exact invalid fields and builds a sealed choice table from all 497 actual frozen source spans. No fuzzy ID correction or newly invented source.
- A dedicated DSH role sees the full original source background, unchanged draft and exact invalid fields. It returns only a source-table index and rationale for each flagged field.
- Host validation rejects out-of-table indices, wrong/duplicate paths, changed parent/context, extra prose fields and duplicate resulting citations. A no-source answer stops as source uncertainty, not a lucky-retry opportunity.
- Applying the selection changes only those invalid addresses. Every claim's prose/kind/order and all valid citations stay byte-identical. Original Generator output, source-selection output and host-resolved source quotes/hashes are separately retained.
- The entire candidate then requires fresh source reviews. A structurally valid source choice is **not** a factual acceptance or publication.
- Continuation reuses exact-input raw roles, never copies a final candidate or resets paid-attempt accounting. Existing valid packets retain their old hashes.

This is narrower than semantic correction: any incorrect movement, deployment or strategy text in packet 018 still has to pass the independent source/replay gates. It cannot be repaired by merely making its address valid.

## Verification before live continuation

`verify-ticket-18-address-repair-v3.mjs`: 14 checks using actual saved 018 outputs, exact unchanged-text/citation checks, invalid-address selection boundaries and injected full runtime up to the fresh-review boundary; zero Provider calls, no candidate accepted. Full source + entire address table + original draft is 447,543 bytes, within the unchanged 786,432-byte input limit.

Production-v3: 10 groups, `845ea4bdb50bae60fdb70abae55ce2bdea83f9cbeda57f12f2f2b65563cba82e`. Overall continuation: 12 checks. Claim-packing: 12 checks. DSH full-source delivery: two isolated Sessions, injected transport, zero Provider calls, `6112a69d46a047c517982d8c7900dd452af00c40c6fe4f166487cabe6270a932`. All pass on the changed runtime. Read-only production ledger check finds no running steps, ambiguous intents or payment-required outcomes before resumption.

Actual whole-Skill 14 source probes + 105 rule cases, two faction Skills, directed matchups, actual Room use, reflection/versioned improvement and rollback remain incomplete. No official data refresh or Codex subagent was used.
