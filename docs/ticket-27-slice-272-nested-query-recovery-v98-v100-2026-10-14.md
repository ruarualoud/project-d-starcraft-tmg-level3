# T27/S272 — real nested-query recovery, v98–v100

T27 5/6; T23 33/36. Main remaining 248/272/249/250 (4), full games0/12.
Original Rooms A133/C156/B9/D9 unchanged. No new strategy/map/game acceptance.

## What the actual v97 continuation exposed

The retained-source entry worked in both workspaces, but that did not prove
query repair worked. Three distinct integration defects were isolated:

1. **Child error described as parent error.** B's opponent scenario returned a
   branch; its follow-up native marker query rejected outer `targetIds`.
   Evidence-port repair metadata read `unboundArgumentFields` from the parent
   scenario, yielding an empty list, with an unscoped `argumentsJson` directive.
   The paid model claimed the scenario itself needed that container and returned
   `kind=scenario` without `spec`. The resulting `BRANCH_SPEC_INVALID` was then
   treated as non-correctable. Model error and incomplete feedback both existed.
2. **Interrupted selective recovery became whole-history restoration.** The
   pending recovery changes persisted phase to `read_only_queries`. On restart,
   the old `phase===completed` condition no longer selected its explicit query
   list, so all historical scenario branches would be rebuilt unnecessarily.
3. **A correct native target representation falsely failed scope preservation.**
   B's paid reach correction retained markers2/4 as `{kind:mission_marker,id}`
   in four base-edge-distance queries. The guard recognized only legacy named
   selector fields and reported both markers missing. This was a verifier bug,
   not a model broadening. A's separate dropped enemy selector remains a real
   scope failure; it is not waived by this fix.

## Product diff

- `roster-teach-evidence-port-v1.mjs`: preserve failed child details and exact
  JSON-pointer request locations; use the child's error fields; retain the
  successful scenario handle without claiming legal arrival. Native argument
  container advice is explicitly scoped to that child. A malformed scenario
  spec now yields the exact scenario-family correction contract. Descriptor
  version1.0.6 distinguishes the changed feedback.
- `roster-teach-query-recovery-v1.mjs`: a saved paid request re-evaluated under
  a changed tool contract can continue its remaining original attempts when
  the new result is correctable; it does not close automatically. A saved paid
  request falsely rejected by the old typed-reference scope guard is executed
  directly once, with its old rejection retained and no new model generation.
- `spatial-action-query-runtime-v1.mjs`: export its existing physical-object
  discriminator set; recovery consumes that shared contract instead of adding
  a separate list. No movement/rules algorithm changed.
- `roster-teach-framework-v1.mjs`: pending explicit recovery remains selective
  after interruption. A completed old selection does not narrow a new ordinary
  investigation.

These transport/recovery fixes do not inject a tactical preference or change
the army, Plan, frozen map, rules or original Room.

## Focused tests — each specific RED then sole GREEN

| Gate | Actual bug/source and scope | Result |
|---|---|---|
| `verify-slice272-followup-repair-location-v98.mjs` | Actual B failed child and paid missing-spec reply; minimized real native scenario plus exact recovery seam | RED98208; GREEN99032,7.813s |
| `verify-slice272-interrupted-recovery-selection-v99.mjs` | Actual cancelled B pending selection at read_only_queries | RED118; GREEN388,1.313s |
| `verify-slice272-typed-query-scope-v100.mjs` | Actual paid B query with typed markers; missing-marker counterexample; exact saved request execution spy | RED then GREEN,1.005s |

All gates:0 Provider,0 Room actions. v98's minimized request retains the paid
malformed shape while binding selectors to its one-model test scene; it does
not claim the original full B formation fits. v99 verifies branch selection,
not end-to-end runtime speed. v100's execution spy proves exact request reuse,
not the geometric result. Earlier passed gates were not repeated. See
`build/ticket-23-three-arm-performance-baseline-20261010-v1/focused-verification-v98-v100.json`.

## Actual safe boundary and resumed jobs

Cancellation requests were sent once; observation timeouts did not trigger a
retry or process kill. Both reached terminal `ROSTER_WORKSPACE_CANCELLED` with
their paid replies retained and latest dispatch completed before host reload.

- A v97:1call119235units (118753 input/482 output), cumulative73calls11556530.
- B v97:2calls387892units (386109 input/1783 output), cumulative178calls17736776.
- Frozen historical estimate: A USD0.001337094; B USD0.032436774; combined
  USD0.033773868. Not current pricing or invoice; old/unknown fees not reset.
- A runner2661/host2731 and B runner2662/host2704 load the same v100 source.
  `common-v100-retained-query-recovery.private.mjs A|B` preserves the same
  workspace/old Teach/current Plan/query selection. It sets explicit saved
  request re-execution for the changed contract, not whole-Teach restart.
- Matching progress files and actual PIDs are authoritative. Do not blindly
  restart the script after successful submission; first inspect the active
  run and current dispatch.

Next: observe actual bounded repair; distinguish a valid query from a proven
strategic claim, then evidence-aware Plan revision/application and common-code
original-room continuation. Full map/2000-point generation/game comparisons
and strategy replay remain open. No subagents, installs, deletion, source
refresh or commits; no new Room screenshots because no game action occurred.
