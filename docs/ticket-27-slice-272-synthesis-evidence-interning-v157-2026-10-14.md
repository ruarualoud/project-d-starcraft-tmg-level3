# T27 / S272 — Recover the oversized Teach synthesis without dropping evidence

2026-10-14, Asia/Shanghai. T27 5/6, T23 33/36; remaining main slices
248/272/249/250 = 4. Accepted complete experimental games: 0/12.

## Outcome

B's original offline workspace resumed from its failed synthesis and returned a
real completed Provider result at 15:36. No Room was created, no Plan applied,
and no completed investigation model turns were regenerated. This fixes the
HTTP400 context-size stop, not the remaining strategic evidence gaps.

The preceding network work is documented in
`ticket-27-slice-272-network-resilience-v155-v156-2026-10-14.md`.
Both transport outages and a non-network context-limit failure occurred. They
must not share an indiscriminate retry policy.

## Concrete failure and change

The actual retained B synthesis input had 4,157,419 UTF-8 bytes. Full probability
outcomes and named-model loss distributions appeared both in scenario receipts
and nested follow-up receipts, then again in three investigation rounds. Some
identical 185,876-character outcome objects occurred six times. Removing unique
outcomes, casualty identities, Supply effects or scenario conditions would lose
strategy evidence and was not used.

`projectRosterTeachSynthesisPromptV1` first uses the existing evidence projection,
then keeps the first full occurrence of each large identical object and replaces
subsequent occurrences with an explicit JSON Pointer to that same prompt.
References do not require a tool, external archive or hidden context. Every
unique field remains available. Both synthesis request identity and its submitted
nodes use this projection; other Teach roles retain their existing projection.

The safe resume launcher recognizes the concrete terminal synthesis HTTP400
`contextLengthExceeded` stop after this repair. It does not classify a general
HTTP400, schema error or authentication failure as recoverable network traffic.

## Targeted proof — do not rerun passed checks

Artifacts in `build/ticket-23-three-arm-performance-baseline-20261010-v1/`:

- `common-v157-synthesis-duplication-red.private.json`: actual saved B input
  reproduces the 4,157,419-byte duplication before the source change.
- `common-v157-synthesis-duplication-green.private.json`: 1,590,087 bytes,
  **61.753% reduction**. Expanding every same-prompt reference is deeply equal
  to the full prior projected input, including questions, probabilities, named
  casualty states and conditions. Non-synthesis projection remains unchanged.
- The concrete test uses zero Provider/Native/Room calls and never writes the
  source workspace draft. Only this new bug's RED then one GREEN was run.

Those sizes are the saved-input comparison, not an estimate of every future
prompt. The live continuation refreshes the descriptor of the same frozen scene.

## Real continuation and accounting

`common-v157-B-teach-fix-resume-progress.private.json` is terminal completed,
updated 07:36:46Z. Observer45862 exited; host45988 remains idle at
`http://127.0.0.1:61502`. Inspect current state before a future restart.

- New paid calls: **1**, synthesis only.
- Usage: input499143/output10421, total509564 Provider units; latency71053ms.
- Cumulative B: **215 calls / 25,219,879 units**. Earlier unknown fees retained.
- Original Plan19/hash unchanged; old framework and paid evidence retained.
- Network policy is persisted: standingConsent true, at most one ambiguous
  retry per exact request, preserveUnknownCost true. This host loads v156+v157.
- A's completed v155 invocation remains128 calls /21326447units, Plan9 unchanged;
  its idle old host7389 must load final source at its next safe continuation.

The real success demonstrates current connectivity and accepted synthesis size.
Injected network recovery tests demonstrate the bounded recovery path. Neither
claim guarantees that the external network can never fail again.

## What remains — not network

A has six unresolved questions Q2–Q7: opponent scenario/side binding; selected
roster opportunity-cost access; attack scenario formation; post-loss control;
formation/control follow-up contract; hero/Medic timing and geometry.

B has three unresolved answers:

1. Opponent scenario triggers: the model distinguishes a conditional scenario
   from a future opponent choice. Audit the actual question and evidence:
   uncertainty about a future choice is not itself an engineering failure or
   a reason to claim that choice is known. Omega-branch evidence still needs
   separate inspection.
2. Post-loss control: a hypothetical formation packing miss was followed by an
   unchanged request. The tool explicitly says a bounded packing miss does not
   prove impossibility. No named casualty/control conclusion is certified.
3. Raynor enabling order: delivered evidence does not bind CP payment and phase
   order; the answer also cites an advisory Skill uncertainty. Inspect current
   authoritative tools and frozen rules rather than asking network retries to
   answer it or treating Skill uncertainty as rule truth.

Additional observed engineering work: the framework restores/re-queries saved
scenario branches before a synthesis-only continuation despite retained branch
support. B spent several minutes doing this before its sole model call. It is
not a network stall and remains an unmodified restoration/performance item.

Order remains: source-contract fixes and genuine A/B Teach closure -> accepted
final Plans -> audit the same tools through planning/live decisions/Plan memory
revision/replay and relevant live performance -> four same-code new games.
No tests of unrelated behavior, Skill promotion, rule/data refresh, cleanup,
subagent, commit or push in this change.

## Diff summary for v157 only

- Product: `packages/roster-strategist/roster-teach-framework-v1.mjs` — lossless
  same-prompt interning, used only by synthesis.
- Existing launcher: `scripts/run-slice272-current-plan-teach-v149.mjs` — exact
  repaired synthesis-stop continuation.
- Concrete bug test: `scripts/verify-slice272-synthesis-duplication-v157.mjs`.
- This report, task/memory and current-work recovery entries.

Harness loop used: true. Routes: offline Teach synthesis only. Existing Skills
are inputs, not edited or promoted. UI/Room actions0; new training truth0. Roll
back if unique evidence is lost, references do not resolve in the same prompt,
or a different request is incorrectly treated as the old paid request.
