# Ticket18 / Slice173 — versioned procedural-guide repair

Scope: one overall-rules candidate, not additional atomic Skills. No official
refresh, Codex subagents, rule mutation, runtime promotion or training authority.
Uses the offline Skill-evolution, Ctx2Skill, Harness-evolution and diagnosis loops.

## Actual starting evidence

Base `11a025d1267c99a985471ca6479f7bee5719fc5cc13f4b35a63627b746bec2bd`
has522 claims/37 sections. Teacher `9d25fda9…` added four operational lessons.
Actual evaluation `guided-rules-9299efdcb03d2e803b7f` reached22/22 source controls,
103/105 development answers,30/30 separately frozen independent inputs. A
read-only replay reconstructed24 actual requests and rescored157 answers,
evidence `6341fd1134be1ea176d178bb7802e1c71db5933778d2fbb7aa0c8c508748f026`.
These positive transport checks do not change its failed quality result.

Remaining failures `production-heldout.enemy_link.4/.8` both incorrectly deny a
placement when `linkCrossesEnemy=false`, `landingOpen=true` and
`landingCoherent=true`; the engagement flag differs. Rules/source are unchanged.
Ranked hypotheses: missing explicit non-crossing input binding; presuppositional
question wording; reader application error despite explicit correct guidance.
Only the first variable is changed. Questions and expected answers stay frozen.

## Local repair contract

`guide-local-repair-v1.mjs` rebuilds a105-case development-only book from raw
predictions and rescoring, never trusting saved `passed` flags to select failures.
It resolves actual frozen source/Rules counterexamples, and permits procedure
changes only to existing lessons referencing those failed source entries.
For the actual parent, exactly `enemy-link-placement` is writable. The other
three lessons, all sourceRefs and522 base claims are preserved. Unknown paths,
duplicate/missing edits, source changes, exact no-ops and literal test-ID
memorization fail closed. The30 independent cases/predictions/verdicts are absent
from repair prompts; reusing that suite later is explicitly reported as repeated
independent evaluation, not a newly unseen suite.

A successful actual edit produces a separately versioned guide artifact and
requires two fresh full-source reviews,22 source controls,105 development cases
and30 independent inputs. The CLI uses existing Keychain/isolated Worker, SQLite
attempt accounting, explicit finish-only reader protocol and global402 stop.
Maximum3 semantic guide revisions; a valid wrong evaluation is not retried.
Read-only inspection reconstructs both edit and evaluation requests from real
Provider responses, then rebuilds output hashes and all157 answer scores.

## First actual local edit: no progress, blocked

`guide-repair-c4905903f7fb25dc45b1` returned the original six steps byte-for-byte.
The host rejected `GUIDE_PATCH_NO_PROGRESS`; no source-review/evaluation calls
were spent. This is a real production failure, not a successful correction.
Report `1076d646652f56c3dc15a836e5fe4b30f77b81d549eab1f2946f56d26889c6a6`.
One call/245,711 Provider tokens/estimated¥0.432625; cumulative34,298,973
known tokens/estimated¥45.033756 including historical reserve. No402.

## Source-first recovery

The existing external-source repair workflow already demonstrated a useful
bounded recovery from copying known-bad text: reconstruct from full sources
without the erroneous draft as a copy target. The guide adapter now applies
that same distinction, not a blind reissue of the local-edit request.

The recovery requires the actual terminal no-progress run. A read-only replay
reconstructs its complete original request, validates the paid receipt and
requires its raw output to fail the same exact no-progress check. No new call
is made for that proof. The new source-first prompt retains full official
context, the complete base Skill, all development case inputs, untouched guides
and exact Rules counterexamples, but omits the failed procedure and previous
wrong predictions. A final task reminder reinforces scope and field binding.
Only one source-first call is allowed by this recovery route, with ordinary
fresh source/evaluation gates afterward. The original run/output/cost remains.

Fourteen engineering checks cover actual failure selection, exact patch scope,
no-op rejection, parent drift, complete context, restart reuse and the
source-first projection. Eight existing guided-evaluation groups remain green.
Injected correction answers are engineering evidence only. Preflight validated
the actual old request without a new Provider call.

## Actual recovery: new procedure, redundant metadata, no new generation

`guide-repair-1190b257ffa5d310e4e0` produced eight new Chinese steps, explicitly
binding `linkCrossesEnemy=false` to no need for crossing permission. However,
it repeated the unchanged `sourceRefs` field, outside the old exact patch shape.
The original `OUTPUT_SCHEMA_INVALID` result and report
`0f0da46bee92fff12717f515074f54386ff50c238215589dce64caac2b389d0a` remain.
One call/237,139 tokens/estimated¥0.418351; no evaluation was attempted then.

A narrow lossless projection now tolerates only this extra field when its
ordered value exactly matches the host-owned original. It cannot change a
source, accept any other extra field, alter procedure text or relax source
review. The raw Provider response remains intact, and the new artifact records
the projection and raw-output hash. The actual response reaches this path in
16 engineering checks. Its exact paid request was reconstructed read-only and
reused under a distinct continuation, not regenerated or copied into a new
billing attempt. Reuse proof
`10c947a31fb55f22e63843348f87e51be267a91db662761fc1ea7f64938fa452`.

## Actual full evaluation passed

`guide-repair-bab46109030e9073f739` reused that one real reconstruction and made
23 fresh review/evaluation calls:

| Evidence | Actual result |
| --- | --- |
| Supportive/adversarial source reviews |26/26 steps each|
| Source controls |22/22|
| Development original/legacy |69/69 +36/36 =105/105|
| Repeated independent input suite, absent from repair |30/30|

The enemy-link group is now16/16, including both previous failures. Other three
guides and all522 base claims are byte-identical. This is a genuine improvement
on the retained103/105 result, but one successful model evaluation is not proof
of universal reliability, gameplay skill or complete-game strategy.

- Repaired teacher: `126964b447b0d08eda656cc0c6c2d1bd37c0645a90b7a84b6c822979174e2407`.
- Guide: `28c109c3ef1e894c1d30a396664e0b687565bc6fe48c313fd76e998195e12601`.
- Actual evaluation: `bbd61e715096c1128a66a1f3292f738c2814e52ca789b63ff9c8822c9556f82e`.
- Terminal report: `c36ca911a46bbc2aae71542a4cc154d87e5c2506f8388a240a3daab11331f811`.
- Read-only delivery/regrading evidence: `669ffc236810b5a2327c329f0f0ccaaaa2d447926baac866883b05f09db74316`.

The inspector matched all23 new requests plus the original reconstruction,
rebuilt the guide/evaluation artifact hashes and rescored157 answers. It also
rechecked the preceding real no-progress request. No new Provider call was
needed for these proofs. Source-only reviews are still model opinions; actual
Rules grading supplies the distinct application check.

The subsequent qualifier also independently rebuilt the complete base Skill's
production evidence. The composed overall dependency is
`d086ae7f69e48716b9bae7a8adb4db2d1f013b98e02b17c314b10cbe95e14292`,
qualification receipt `648cbd2c9ef5cfc4fe11651da29da54077e084ae2054b82e95b06cfdb18f395e`.
Eight contract checks reject missing actual-delivery proof, stale binding,
non-perfect source/development/independent scores, forged positive summaries
and confusion with runtime authority. Qualification means **offline faction and
matchup generation may depend on this complete composition**, not runtime
publication, human review, Rules truth or proven strategy. Old base96/105,
teacher development105/105 and previous reader103/105 remain separate records.

The human-readable full artifact is
`build/ticket-18-production-v3/guide-repair-bab46109030e9073f739/overall-rules-with-guide.md`;
its companion `overall-production-dependency.json` retains all522 claims and
the four lessons. The small source-bound guide is not four additional Skills.

## Accounting and closure

All three paid processes are terminal:25 calls/2,530,054 tokens/estimated¥1.097323
added this round, including both failed calls. Cumulative36,583,316 known
Provider tokens/estimated¥45.698454 including historical reserve;0 open intents,
0 payment-required outcomes. Not a billing invoice or Codex goal-token count.

Slice173 is complete at its declared source/repair/independent-rule-evaluation
boundary. Project16/22; Ticket18 **2/8 complete, six slices remaining**; overall
offline dependency1/5, first-five formal/runtime acceptance0/5. Slice174 is next:
two faction Skills, then175 directed matchups,176 actual Room and registry,
177 replay/reflection,178 versioned regression/rollback,179 store conformance.
The long goal remains active until those actual gameplay/evolution gates pass.

Round fields: `ctx2skillLoopUsed=true`, `harnessLoopUsed=true`, targetGames=
`[starcraft-tmg]`, roles=`[rule_skill_builder,independent_source_review,external_rules_judge]`,
judgeTestsRun=157, crossTimeReplayResult=105/105 development+30/30 independent,
promotions=`[]`, blocks=`[runtime_publication,complete_game_strategy_claim]`.
No room tools, UI trace, memory promotion or training candidate were produced.
