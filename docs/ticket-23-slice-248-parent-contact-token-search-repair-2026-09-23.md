# T23 / S248 — Queen token placement joins the shared Host search

## Actual failed boundary

Runner 51562 exited 1 at 21:25:35.961Z, rather than merely having a stale
progress timestamp. The same room remains accepted/replayed at r54, Round 2
Movement. Its next Flash decision selected Queen's **Spawn Creep Tumor**,
`resolve_unit_lifecycle_ability / spawn_creep_tumor`, 1 BM. The model returned
the coordinate (14000,13000) twice, failing
`UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED` both times. The rules rejection
is correct: this ability requires contact with the Queen, unlike tactical-card
Creep Spread's placement domain.

The saved choice `choice-62e6007daef826f67d9bfe98cbd094463c8d5747a674272441687b2175b11ba7`
has no exact `legal_asset_placement_options` receipt. The Host classifier and
search contract accepted battlefield assets and Omega placement but omitted
the lifecycle coordinate family. Therefore the model supplied coordinates
without being offered the existing exact landing-choice workflow.

This is not a failed solver-generated coordinate, a rounding-only error or a
reason to relax the parent-contact rule. The original action was never applied.

## Repair and scope

- Host evidence routing and asset search now share one domain classifier;
  the duplicate local classifier in the Decision Port is removed.
- Spawn Creep Tumor uses the frozen room component profile (round 28mm) and
  actual live parent footprints. Search generates the preferred-anchor ray
  plus a bounded contact ring around each parent model; it does not use a
  whole-board grid for a contact-only domain.
- Every surviving candidate still calls the actual Rules instantiator.
  Overlap, full-base board containment, payment and parent contact remain
  Rules-owned. No invented offset or forced acceptance is added.
- Physical profile and hypothetical token-subject metrics remain available;
  token attack projection remains explicitly not evaluated. The Queen's
  existing threat exposure is not substituted for a new Unit's exposure.
- Existing Host option selection, public reason and exact re-instantiation
  handle execution; no new strategy Prompt, Skill, output budget or model.
  The finite contact sample is not a claim of a global continuous optimum.

The prior effect-declaration repair 4fa061a will also load on this restart.
No Web source changes occurred; no Web rebuild or old passed gate is needed.

## Focused red → green evidence

```
node scripts/verify-ticket-23-slice-248-parent-contact-token-search-v1.mjs --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914
```

Read-only real r54 boundary: the recorded bad coordinate remains rejected;
the old solver reproduced `LEGAL_ASSET_PLACEMENT_DOMAIN_UNSUPPORTED`.
One post-change run passed in **33.131s**: 17 contact candidates instantiated,
4 overlapping candidates rejected, 4 diverse options returned. Each returned
coordinate touches the actual Queen within the existing Rules tolerance,
pays the unchanged 1 BM card selection, applies a new token to a private state
copy, leaves Queen models unmoved and leaves the original state unchanged.
Provider calls / Room mutations / cost: **0 / 0 / ¥0**.

Generated receipt: run directory `parent-contact-token-search-report.json`.
No previously passed verification was repeated. The focused seam uses the
actual lifecycle Rules preview/apply; complete live Host query and Action
selection remain to be observed on the resumed run.

## Continuation and accounting

Before resume: 47 new accepted/replayed actions + 7 explicit prefix = r54.
128 physical calls / estimated **¥18.151836**; these include the two rejected
paid Action submissions, which are preserved. Both seats remain Flash, no Pro
fallback. Resume this room with explicit existing retry authorization; do not
reset costs, rewrite paid outputs, reapply r54 or restart the match. This is
the first engineering repair cycle for this specific missing-family fault.

T23 remains **33/36**: S248 full match, S249 review, S250 synthesis open.
K3 S271 is independently repairing a genuine roster-UI click occlusion found
in its browser smoke; it has no completed live-acceptance report yet.

## Harness observability

- harnessLoopUsed: true; targetGames: StarCraft TMG.
- promptPackRoutes: existing selfplay Planner → Host query → Action.
- harnessToolsCalled: actual lifecycle legalSpace/preview/apply on private
  clones, asset search and read-only saved Provider evidence.
- uiTraceEvidence: accepted r54 screenshot retained; r55 not yet accepted.
- agentDecisionEvidence: repeated invalid public coordinates and rationale
  preserved, not falsely labelled low strategy with complete input.
- memoryTraceEvidence: existing r54 continuity retained; no synthetic memory.
- trainingTraceCandidates: none promoted, trainingTruth false.
- rollbackOrDemotionRules: missing/invalid profile cannot be guessed; any
  returned contact option failing current Rules remains a blocking defect.
- userVisibleChecks: same action now has Rules-valid choices; full live
  query/selection/Apply/Replay must still be observed after resume.
