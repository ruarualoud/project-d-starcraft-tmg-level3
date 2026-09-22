# Ticket 23 / Slice 248 — explicit transport-timeout recovery

## Outcome

The same Standard-2000 abstract-terrain room advanced to r7: the 18-model
Raptor used Omega Network at (9.457, 9.704) inches. Apply and Replay agree.
The following r7 decision then hit a real Provider transport timeout; no r8
action was applied. The stopped branch had 12 attempts / 1,426,177 accounted
units / estimated ¥1.885395, including conservative unknown-usage accounting.

## Concrete defect and repair

The runner's explicit-resume allowlist and the Bot Seat's successful-Apply
closure list independently named transport failure and worker-protocol
failure, but both omitted `provider_transport_timeout`. Restarting could
therefore reject a settled old timeout before reaching the next model call;
a later verified success would also fail to close that old issue.

`decision-recovery-policy-v1.mjs` now owns this transport classification and
the historical-resume predicate. Both callers use it. Admission requires an
explicit resume and an unresolved finding strictly older than that resume.
New failures, authentication, address/security drift, budget and replay
problems are not broadly bypassed. Dispatch settlement and cost accounting
are unchanged. History is preserved; an older successful action cannot clear
a subsequently failed attempt. Only a matching verified Apply/Replay can
resolve a recovered issue. This does not enable automatic Provider retry.

## Focused reproduction

Only the new concrete-bug mode in the existing durable-action verifier ran:

```sh
node scripts/verify-ticket-23-slice-248-durable-action-boundary-v1.mjs --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597 --provider-timeout-recovery-only
```

1. Red: real persisted r7 timeout reproduced both missing admission and
   missing post-success resolution.
2. Green after the shared classification repair: both pass; new/non-explicit
   failures remain blocking, old success cannot clear later failure, and
   security/budget findings remain unresolved.

Zero Provider calls or Room mutations in the gate. No passed historical mode,
full rule suite, unrelated build or new test file. Production then resumes the
same r7 room with the already-paid completed planning/query work retained.

## Strategy evidence, not a claim of perfect play

The r7 model compared all four returned Worm options. It rejected the far-back
option's poor entry-edge utility and selected zero current stationary exposure
with an 11.055-inch improvement toward marker 1 and 4.729-inch improvement
toward marker 4. It retained uncertainty about future movement, path and LOS.
This demonstrates use of the added utility evidence, not global optimality.
It also revised its prior deployment goal and cited a prediction calibration.

The r6 Raptor/Swarmling models-per-Supply comparison inconsistency and the r7
claim that a later-round persistent Entry Edge strictly dominates an end-of-
round transport beacon remain strategy-review candidates. Different timing
prevents that dominance claim being accepted without scenario analysis.
No strategic preference was injected into the Prompt or Rules.

Before/after screenshots:

- `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597/screenshots/0027-r006-room-next-agent-decision-complete-board-before.png`
- `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597/screenshots/0030-r007-player2-use_active_ability-complete-board-applied.png`

Harness loop used: true. Route: `selfplay_agent_prompt`; tools observed:
`space.inspect_relationships`, `legal_asset_placement_options`,
`instantiate_parameterized_action`, Rules Preview/Apply/Replay. Public plan,
intent, alternatives and memory assessment are preserved; no hidden reasoning
is collected. `trainingTruth: false`; failed/contradictory strategic claims are
not promoted. Ticket 23 remains 33/36; Slice 248 is still open.
