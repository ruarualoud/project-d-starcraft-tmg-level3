# Ticket18 / Slice173 — answer checking with an external Rules boundary

This round uses the Ctx2Skill, offline Skill-evolution, Harness-evolution and diagnosis loops. Previous-turn classification: progress (two actual source omissions corrected and127 raw answers independently rechecked). No subagents, source refresh, room mutation, Skill promotion or training authority.

## Retained actual input

Complete Skill `11a025d1267c99a985471ca6479f7bee5719fc5cc13f4b35a63627b746bec2bd`,522 claims in37 sections. Its source checks passed14/14+8/8, while raw comprehension was96/105. The nine failures and original inputs remain in `overall-repair-05a5ac464028e464918e`. Source corrections and raw answer accuracy are different measurements.

The ranked hypotheses were: missing input-by-input checking; misuse of mandatory/limit/exception operators despite retrieving correct text; and possibly overbroad individual claims. These are tested against retained actual answers and the frozen Rules kernels, not invented fixtures or a moved oracle.

## Actual model-only internal check: insufficient

Added a bounded critic→local editor→fresh critic workflow. Every role receives the complete Skill, all105 original cases and all current answers, not just the cases known by the host to be wrong. It has no judge/kernel/expected-answer tool. Findings must identify existing input keys and claim IDs; the host materializes exact evidence. Patches are restricted to flagged cases, reject no-ops and preserve unflagged answers. At most two semantic edits are allowed. A critic's agreement never grants acceptance; the host scores separately afterward.

Actual run `answer-review-13d5e917b2c3eb106d2d`: the critic reported zero findings and zero uncertainty for all105 cases. **All nine real errors escaped this model check.** Host scoring remained96/105; no editor call occurred and nothing was promoted. Terminal `ANSWER_REVIEW_EVALUATION_NOT_PASSED`. This is negative evidence about relying on an additional model opinion, not a working accuracy fix.

One physical call /91,906 Provider tokens /estimated¥0.162164. Report `5f5deebfce20ef30844d54cf01f93ba2191e1cb730c1ef7372b956f520536984`. Cumulative after it31,760,602 known Provider tokens /estimate including historical reserve¥42.815790. No402 or ambiguous attempt was observed.

## Deterministic feedback is a separate Teach stage

Added an explicit Rules-backed development-feedback path. It executes the original independent oracles and frozen Rules kernels for every case and retains the actual nine mismatches, exact inputs, full official source entries and Rules receipts. These old cases are now explicitly **development regressions**, not unseen held-out tests: their authoritative corrections may be supplied to Teach. The earlier raw grades are never overwritten.

The bounded editor receives all frozen Core/FAQ/product context, the entire Skill, all old cases/answers and exact Rules counterexamples. It may correct only those nine answers and propose short general procedural lessons with valid source IDs. Literal old test IDs in a lesson are rejected; source-reference validity alone is not semantic or generalization approval. Lessons remain candidates for source review, proper Skill materialization and separate evaluation. This is not a claim to have created the first five formal Skills, nor a substitute for DSH-backed Skill production or actual Room/strategy evidence.

The full input is790,463 conservative request bytes including allowance in the transport-bound engineering fixture. This mode explicitly binds a1,000,000-byte cap rather than trimming full context to the prior786,432-byte limit. Shared usage accounting, safe Keychain ingress, one physical attempt per request, conservative failure accounting and global402 stop remain in force.

## Independent inputs frozen before Rules-feedback generation

Manifest `b374b94ee5bff6f2dbf69734be1eb49e5c6afc40980be891e63ea82d87aa9548` defines30 checks:26 new numeric/multi-card inputs and4 explicitly labelled identity-metamorphic self-range controls. They exercise clearance, mandatory movement distance, target-number arithmetic/clamping, resource/type/readiness payment and self-range exclusions. Expectations were authored independently and checked against two deterministic executions of the actual kernels. No exact source+input duplicates from the old69+36 cases are allowed.

The enemy-link four-boolean space was already exhausted by the16 old cases. Renaming those inputs does not make them fresh held-out evidence, so they stay in development regression rather than inflating the new denominator. The4 identity controls likewise are not advertised as four new rule families. These30 inputs and their answers are absent from Teach/lesson-generation prompts. Their manifest hash is bound before that generation, and later scoring must remain independent.

## Engineering and current status

- Answer-loop13 checks reproduce the actual96/105 baseline and test full-context delivery, no expected-answer leakage, exact host evidence, bounded edits, false-consensus non-acceptance, no-op rejection, restart reuse and402 propagation. Correction fixtures are explicitly injected, not model-quality proof.
- Independent-drill8 checks exercise all30 actual source-bound kernels, wrong predictions, input isolation and output projection. No Provider call.
- Rules-feedback10 checks exercise the actual nine mismatches, no unrelated answer changes, no-op/case-memorization/fabricated-source rejection, full-source transport sizing, saved-answer reuse and separation from the independent suite. The correction model is injected; no quality claim.

## Actual Rules-backed Teach result

`answer-review-48ec57ad20532aa343ce` completed one real call with all frozen sources and522 claims. The editor changed precisely the9 flagged answers, preserved the other96, and the independent host rescored the corrected development set at **105/105**. Four procedural lesson candidates were produced: enemy-link placement, mandatory maximum distance, target-number arithmetic/clamping, and explicit self-range exclusion. This is a development correction, not unseen evaluation or formal Skill acceptance.

Teacher artifact `9d25fda96f6758d165da57b86f247467efdf3ba6113dd652f7b5e98ca96d41c9`; paid receipt `2a15f64d24a8110235834126cd574c013ddf5e05b71ccc25a1ceff53f2c12663`; report `bc5ad074ab9b11b3cc1eeadaca7939bb8b899d30c5b560a798c3a57e0d40dbfb`. Usage250,565 tokens /estimated¥0.443744. The30 separately frozen inputs were not exposed to this call.

## Actual guide evaluation, with no prior answers in the reader

`guided-rules-9299efdcb03d2e803b7f` evaluated the four lessons alongside all522 unchanged base claims. No old answer vectors, kernel verdicts or expected test answers entered these reader requests. Source-review requests had complete official sources but no test questions; answer requests had the complete Skill/guide and current questions but no original source corpus or previous answers.

| Evidence | Actual result |
| --- | --- |
| Two independent guide-source reviews |24/24 steps supported in each|
| Original14 + additional8 source controls with guide present |22/22|
| Old development cases freshly answered from Skill+guide |103/105 =67/69+36/36|
| Independent inputs not used in Teach |30/30 =26 numeric/resource +4 labelled identity controls|

The original raw96/105 remains unchanged in its own run. The new103/105 is a fresh reader result using the taught guide, not the explicitly corrected answer vector scored105/105 in Teach. It demonstrates improvement on seven old errors and successful application to the independent input set, but **does not yet pass the full gate**. Model-only consensus previously missed9/9 errors; the Rules-backed feedback and separate evaluation must remain distinct.

Two old cases still fail: `production-heldout.enemy_link.4` and `.8`, both predictedfalse where the bound Rules receipt says true. Both have `linkCrossesEnemy=false`, `landingOpen=true`, `landingCoherent=true`; the engagement flag differs. The current enemy-link lesson says crossing must be permitted “or not needed”, but does not bind that branch explicitly to the `linkCrossesEnemy` input. The source/kernel already handles non-crossing correctly. Next scoped correction is the first guide's input-condition binding, not a rewrite of the37 packets, the other three lessons, the sources or the oracle. Keep the independent inputs out of that correction feedback.

Actual guide hash `caa853e1c1b5d4a2e29361db1c4172ef48e2bda67a9240c16ae25c51f07a0fdd`; evaluation `aa1cdfaa77f2fd8f22614504e5c3709614c768a8b9f7231c2b5adfaf6a0ccedc`; terminal report `03ee1e365b01eca707eb250944d936d9df177828581703f7d35f20143f0e5eab`, failure `GUIDED_RULES_EVALUATION_NOT_PASSED`. Usage23 calls /2,042,095 tokens /estimated¥1.341597. The guide is an unaccepted advisory supplement to the one overall Skill, not four additional formal Skills.

## Actual request reconstruction and negative controls

The new read-only production-replay port opens SQLite with `readOnly:true`, reconstructs each exact request through the same Model adapter, compares the entire request hash with its paid attempt, validates Provider profile/receipt/response fingerprints, and re-executes the pure normalization/scoring program against cached raw responses. No credential or live-egress capability exists on this path. Missing attempts, altered source/guide inputs and settlement attempts are rejected.

Actual replay matched the Teach request and all23 guide-review/evaluation requests, rebuilt the exact Teacher/evaluation artifact hashes, and independently rescored all157 evaluation answers. Evidence `6341fd1134be1ea176d178bb7802e1c71db5933778d2fbb7aa0c8c508748f026`: `evidenceVerified=true`, **`qualityPassed=false`**, zero new Provider calls. This verifies actual context delivery instead of trusting an `answersExposed=false` flag. Three negative lineage/mutation checks passed against the same real read-only store. The guide-evaluation workflow also passed8 engineering groups using explicitly injected answers; those injected scores are not presented as real performance.

All paid handles are terminal. Final ledger check:0 open intents,0 payment-required outcomes, **34,053,262 known Provider tokens; estimated cumulative cost including historical reserve¥44.601131**. This round added25 paid calls /2,384,566 tokens /estimated¥1.947505. These are Provider estimates, not Codex goal-token accounting or a billing invoice. Code commits `a728298` and `db234b8` were pushed; the remaining targeted guide repair is not started at this checkpoint.

Project16/22 Tickets; Ticket18 1/8, Slice173 active; formal first-five acceptance0/5. Required afterward: source-checked operational lessons and independent evaluation, two faction Skills, directed matchups, actual Room loading/play, real replay→reflection→versioned local update→regression/rollback, scheduler/store conformance. Goal remains active.
