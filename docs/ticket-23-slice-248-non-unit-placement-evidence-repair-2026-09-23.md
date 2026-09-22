# Ticket 23 / Slice 248 — non-unit placement evidence

## Real checkpoint and defect

The recovered Standard-2000 abstract-terrain A-A branch
`20260922133120597` reached r10 with Rules Apply/Replay parity. r8 placed a
Ventral Sacs indicator, r9 placed a Creep Tumor and r10 finished the Raptor
activation deterministically. Its cumulative ledger is 20 physical attempts /
2,202,454 accounted units / estimated ¥2.926274. Since the stopped r7 ledger,
this continuation added 7 attempts / 514,229 units / estimated ¥0.696930.
Accounted units include prior unknown-usage reservations, not solely actual
provider-reported tokens. Screenshots exist before/after each accepted action.

Inspection of the actual persisted revision-7 decision found six placement
options with null tacticalMetrics and relationshipComparison. The common
selector nevertheless labelled them `lowest_projected_incoming_fire`,
`closest_to_objective` and `risk_ordered_alternative`. The source of missing
data was an Omega-only early return; the source of false labels was sorting
unknown values as if they supported a comparison. The r8 public explanation
then described Raptor-to-marker distances as indicator-to-marker distances.
This is an engineering evidence defect, not a reason to inject a preferred
strategy into the Prompt.

## Repair

All supported placement kinds now share a pure position-evidence projection.
It identifies the hypothetical asset, source actor, effect and exact selected
coordinate separately; includes per-objective centre distances and per-enemy
reference-point-to-base distances; and includes base-edge distances only when
an authoritative physical profile exists. The current unsized Faction
Indicator has no invented diameter: its exact centre distance to marker 4 at
the historical (15,9) placement is 4.243 inches, while its base-edge distance
remains unknown. A 28mm round-token projection at that coordinate reports
3.692 inches from token edge to marker centre. Neither is the Raptor's 5.893.

Non-unit assets do not inherit Omega's combat target tags. Their attack bands
remain null / not evaluated, never zero/safe; future deployed-unit exposure
requires that actual unit and formation and is explicitly unevaluated here.
Only known comparable metrics may earn a risk or objective facet. Unknown
options remain available as geometry-only alternatives. Rules instantiation,
legality, action identity and Preview/Apply/Replay are unchanged. The existing
Rules representation of an unsized Faction Indicator is not silently changed
or claimed to be a complete physical-profile audit by this repair.

## Single affected gate

```sh
node scripts/verify-ticket-23-slice-247-legal-asset-placement-options-v1.mjs --non-unit-placement-projection-only
```

Red: the real six saved options reproduced false risk/objective facets.
One green after repair: the same options, exact placement-vs-actor identity,
known centre/physical-edge measurements, unknown threat propagation and known
unit attack-band selection all passed. 0 Provider calls, 0 Room mutations and
0 unrelated checks. No new test file and no old full asset/formation gate.

## Continuation and evidence

Keep r8–r10 as Rules-legal but non-training evidence of the deficient input.
Resume the strategy comparison by forking the verified prefix through r7;
do not erase the old branch, usage, decisions or screenshots, or copy its
misleading suffix into the new plan. This is not a restart from round 1.

- r8: `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597/screenshots/0046-r008-player2-resolve_battlefield_asset_ability-complete-board-applied.png`
- r9: `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597/screenshots/0052-r009-player2-resolve_battlefield_asset_ability-complete-board-applied.png`
- r10: `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597/screenshots/0058-r010-player2-finish_activation-complete-board-applied.png`

Harness loop used: true; route `selfplay_agent_prompt`; tools
`legal_asset_placement_options`, `space.inspect_relationships`,
`instantiate_parameterized_action`, Rules Preview/Apply/Replay. Public plans,
alternatives, reasons and memory remain available; no hidden reasoning was
collected. `trainingTruth:false`; T23 remains 33/36, Slice 248 open.
