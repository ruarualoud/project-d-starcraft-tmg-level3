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

Actual source-first run `guide-repair-1190b257ffa5d310e4e0` is active at this
checkpoint; do not restart it. Results and costs must be appended after its
terminal report. Project16/22; Ticket18 1/8; first-five formal acceptance0/5.
Remaining: finish this overall dependency, two faction Skills, both matchups,
actual Room use, real replay/reflection/versioned update/regression/rollback,
and scheduler/store conformance. The long goal remains active.
