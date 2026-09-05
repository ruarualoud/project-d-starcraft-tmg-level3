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

Live Rules-feedback preflight passed for recipe `48ec57ad20532aa343ce74ecc7442b0c99b843b757e476ffe32d60b7ca58f95d`: complete522 claims,105 development cases,9 targeted corrections,30 separately frozen checks. At this checkpoint the actual Rules-backed Teach call has not yet run. Do not report105/105 or accepted lessons based on engineering fixtures.

Project16/22 Tickets; Ticket18 1/8, Slice173 active; formal first-five acceptance0/5. Required afterward: source-checked operational lessons and independent evaluation, two faction Skills, directed matchups, actual Room loading/play, real replay→reflection→versioned local update→regression/rollback, scheduler/store conformance. Goal remains active.
