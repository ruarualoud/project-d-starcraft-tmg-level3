# S272 v285 — Teach scene handoff and current stops

## Delivered

The roster selector could read saved Teach evidence but could not query its
hypothetical scene: `selectedScene` restored only selector-created observations.
The actual D receipt with branch `453c56d7…16600` reproduced
`PREGAME_LAB_BRANCH_UNKNOWN` through the ordinary tool port.

The selector now restores matching Teach scenes lazily through the existing
Native evidence port. Candidate and frozen-context filters apply first; the
original source/runtime/spec/parent/positions checks still apply. Private aliases
use saved branch hashes, so reused question names cannot select another scene.
No historical actions, formation searches or follow-ups are replayed.

Input contract16 exposes saved scene handles and explicit unresolved-placement
units to the selecting model. Contract15 retains its old projection for paid
reply recovery; upgrade occurs only between settled decisions. No history,
ledger, roster or Plan is hand-edited. A native branch creation status `ok` is
not a claim that every model placement succeeded.

Changed production files:

- `packages/roster-strategist/iterative-roster-tool-port-v1.mjs`
- `packages/roster-strategist/iterative-roster-plan-session-v1.mjs`

## Verification scope

`scripts/verify-slice272-teach-scene-handoff-v285.mjs <base>`:

1. RED: actual saved D scene was unknown at the selector query boundary.
2. One transport GREEN: branch restored, zero Provider calls, zero Native
   actions, zero scenario regeneration; original session unchanged.
3. This revealed an important distinction: the query still returns unknown
   because the original scene has six unresolved unit placements. The first
   check's outer-status assertion did not validate the inner result status.
   The descriptor was amended to expose those exact units/reasons; its single
   focused check verifies `resultStatus=unknown`, the original geometry reason,
   the exact branch hash, old-v15 projection preservation and changed-army
   exclusion. It passed. This is NOT a complete marker-control acceptance.

No unrelated or old green suite was rerun. The temporary source debug logging
was removed. No Rules, official data, strategies or live rooms changed.

## D source mismatch: investigated, not root-fixed

The real stopped D record differs only in `sourceStateHash`:
saved `eef7db7b…6a89d`, current `c3ad7029…4f111`. Army input is identical across
four Teach snapshots; Rules, Builder and specification bindings match.

`diagnose-slice272-source-stability-v285.mjs` compared direct factory calls,
then included reference-runtime initialization: both produced exactly the old
saved source; no changed leaves. `verify-slice272-product-source-restore-v285.mjs`
uses the real product plus a private D copy and stops before a Provider call.
Its first observation timed out at180s; a diagnostic-instrumented observation
with a longer local-only deadline reached `NEXT_MODEL_BOUNDARY` with the exact
saved source. The original stopped file was unchanged. This establishes that
current restoration can work, not why the previous process differed.

Private copies: `<base>/product-source-v285-O4MVht` (timed out),
`<base>/product-source-v285-mdQYqI` (reached model boundary). Preserve these
small reproductions; do not rerun their passed checks or claim a source fix.

## A current blocker: confirmed input capacity rejection

Request185 / `teach_framework_synthesis`, context
`ddff896e…90234`, dispatch `roster-teach-framework-19fae6b2-0e0a-416a-8157-798ab012333b`:
HTTP400, `invalid_request_error`, `contextLengthExceeded=true`. No usage was
returned; unknown cost remains. It is NOT the older `max_output_tokens` failure
in `failedProviderOutputs`; match failure records by dispatch/context identity.

Current encoded input:3,393,755 characters. Prompt components:

| Component | JSON bytes |
| --- | ---: |
| Current Plan + context | 876,594 |
| Question/evidence reconciliation | 2,291,239 |
| Historical investigation claims | 222,298 |

The post-loss question alone contributes1,179,415 bytes; the Plan contributes
271,022 bytes. Additional repeated strings can save only9,251 characters.
Exact interning alone is therefore not a credible capacity fix. The current
synthesis role cannot inspect its evidence archive, forcing all material inline.
Next work must add resumable, question-scoped evidence reading/synthesis without
discarding cross-question strategic context, original receipts or costs. Do not
just increase output tokens or resend the unchanged request.

## Six groups and next execution boundary

Final acceptance0/6. T27 5/6; T23 33/36; remaining main slices272/248/249/250=4.
No games. The new C-F matrix remains isolated from old battle C/D.

At this checkpoint:

| Group | State |
| --- | --- |
| A | Stopped at request185, confirmed synthesis input capacity error; Plan11 |
| B | PID10563 observer now reports paused at request101; confirm process exit before resuming;2000/r5 |
| C | Safely paused/dead PID94929, request69,2000/r8, Teach paused |
| D | Stopped/dead PID93870, request70,1150/r6; source mismatch above |
| E | Stopped/dead PID50018, request102/r31; repeated-query non-convergence |
| F | Safely paused/dead PID97290, request71,2000/r8, Teach paused |

The observer's `arrival_schedule_required` label for paused C/F is not proof
that Teach completed; the saved Teach status is still paused. A/B/C/F retain
maintenance flags. No user pause or goal pause was set. Do not reload a partial
batch: finish the capacity fix, verify only its affected gate, then continue the
same sessions on the shared version. E must not receive a blind extra request;
the new scene capability is relevant but its contribution to convergence is
still unproven. Audit D at its original saved source on continuation.

Harness loop: source-owned tool routing repaired; no UI or battle operation;
trainingTruth=false; no Skill promotion. All unresolved geometry and conditional
opponent hypotheses remain explicit; no host-selected tactical preference.
