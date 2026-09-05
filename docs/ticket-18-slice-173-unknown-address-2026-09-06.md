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

## Actual recovery checkpoint

Commit `99f55b2` was pushed. Continuation `overall-v3-cdf99e843cad9297a084` (recipe `cdf99e843cad9297a084b992405570624371feaa52ed3231f704f8c3ef868397`) reused 001–017 without new Provider calls. The dedicated address-selection role selected the actual Movement Passing source `.items.4.subItems.1/p1` with a source-specific rationale. Host inspection confirms all 12 original texts and the original Generator artifact were preserved. Address receipt: `3f296948dda4ff19a3d2a5fe4ef93a4ab6a2f0c7cf006803e421ca095dc7079b`.

Fresh reviews then found a distinct missing Assault Phase citation, which was locally added to claim 6 without prose changes. Two further actual reviews passed with zero open issues:

- candidate 018: `a34640408ed103e13b5a93e17a1d17e34f6eb34c701bab71e8e4e43c88d4c2b8`;
- reviews: `3665b3d9291726706ba38928d002563619bffd56490d9809371c65c43ee827f4`, `50283347e6796fd79e5886b35923d81f2a148cb494714a92d16d5d0d953fe367`;
- candidate 019: `ef3702d8500efcb6befa51ff266b3b727783a6b2995cc013cccc699031858a7d`;
- candidate 020: `10350b9d780ad9dadb91188dafe0535fcbbd52347244ec9c1b2a7ecb2e0bec81`. The general lossless packing mechanism also handled its 25 claims without a repeated Generator call, then both actual reviews passed.

Checkpoint **20/37, 17 remaining**, 021 in progress. At 14 settled new calls: 1,805,027 new Provider tokens / ¥0.352627, cumulative known 19,820,904 / ¥40.101746 estimated cost plus historical reserve. An in-flight request temporarily adds its own conservative reserve; do not confuse that higher figure with settled charges. No payment-required outcome. The running process must not be restarted.

## Additional independent known-risk controls

Eight supplementary probes are now source-bound in `packages/skill-evaluation/supplemental-source-probes-v1.mjs`: Flying endpoint versus path distance, Ground passage through Flying bases, every base point's Speed limit, timed effects while in Reserves, no extra same-phase activation from returning to Reserves, sticky control on ties, and the two partial-visibility Indirect Fire exceptions. These were written after early-packet inspection and are explicitly **development/known-risk regressions, not fresh held-out cases**. They do not assert that the complete Skill has already failed or passed them.

`verify-ticket-18-supplemental-source-probes-v1.mjs` passes 10 engineering checks, with the full 37-section synthetic input, no source/expected-answer leakage to the reader, persisted reuse, negative results retained without repeated answer attempts, and source/expected-answer drift rejection. Manifest `79bdf24b66a2c4c2ba1f4acc214dd70cb7852e60246fcc3efbbd15d4cac74ca7`; readiness `fc71a055a66af30f9d346570635b40eb942787f2c2dc6eb036285b2302256cda`. Zero Provider calls; actual complete-Skill evaluation remains pending. Run these in addition to—not in place of—the existing 14 + 105 cases after complete assembly. No running-production code or recipe was changed to add this separate preparation.

## Latest live checkpoint: 23/37

The same `overall-v3-cdf99e843cad9297a084` process continues. Packets 021–023 all passed their first two actual source reviews, without a schema or semantic repair:

- 021: `29d4d32ed3ef9b33d695d3bc4687dba75609040a06fccb5972b72c7400c3e1a0`;
- 022: `6d33183b7242745d1543c34696e5df780cc952f856103980c54f7fb5d3e2d54a`;
- 023: `d9723f6e2f39d6c52e804f2c9a14708cf2a67c978f2624545a024bc77ff07abc`.

**23/37 complete, 14 remaining; 024 Tutor in progress.** At 25 settled new calls: 3,187,850 new tokens / ¥0.554828; global known Provider tokens **21,203,727**, estimated cost plus historical reserve **¥40.303947**, no payment-required outcome. This is a live checkpoint, not the terminal run report. Original ancestry and six-hour start remain unchanged. Supplementary-probe code and earlier 20/37 checkpoint were pushed in `982758e`; no other game files were committed.

Ticket 18 remains 1/8, project16/22, first-five formal acceptance0/5. Complete assembly and actual 14 + 105 + 8 evaluation results, faction/matchup production, Room use and reflection/regression/rollback are still pending.
