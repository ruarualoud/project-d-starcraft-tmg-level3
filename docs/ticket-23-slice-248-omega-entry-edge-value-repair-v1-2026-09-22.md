# Ticket 23 / Slice 248 — Omega Entry-Edge Value Repair

Date: 2026-09-22

## Outcome

The live Standard-2000 A-A run placed the Omega Worm at `(2.250", 1.600")`.
The placement was Rules-legal and had the lowest projected incoming fire among
the six options returned to the Agent, but the decision material did not compare
the Worm's later-round Entry Edge with the player's official Entry Edge. The
Agent therefore optimized exposure without seeing the deployment-distance value
that is the main strategic purpose of the asset.

The bounded placement search now adds a versioned, advisory
`entryEdgeUtility` contract for every exact Omega option. For every mission
marker it reports:

- exact linear base-edge distance from the official player Entry Edge;
- exact linear base-edge distance from the candidate Worm base;
- the signed approach gain;
- improved, worsened and unchanged objective counts.

The returned diverse option set now reserves one facet for
`largest_entry_edge_approach_gain`, alongside low-fire, preferred-anchor and
objective-proximity facets. This is decision material only. It does not select
the action, mutate the Room, claim terrain/path/Zone-of-Influence legality for a
future deploy, or override Preview/Apply/Replay.

## Continuous-domain clarification

Omega Network is not a six-target action. The single 80mm round model has a
continuous Ground-Level coordinate domain. Its authoritative placement checks
require:

- the whole base to remain inside the battlefield;
- base-edge gap strictly greater than 10 inches from every Enemy model;
- no overlap with any live model;
- no overlap with any authoritative terrain footprint;
- no existing Friendly Omega Worm;
- current timing, source-card and activation legality.

The Host performs a bounded search over that continuous space, exactly
instantiates every survivor through the current Rules domain, and returns one to
eight strategically diverse suggestions. The six options in the captured run
were a comparison summary, not the legal denominator. The Agent chooses an
option and gives a public reason; the Host reinstantiates it before Apply.

## Agent-understanding audit

The captured revision-7 plan correctly knew that the Worm is a non-contesting
Structure and Source of Creep and becomes a Ground-reserve Entry Edge from a
later round with combined Supply at most 2 per round. It did not bind that
knowledge to an executable consumer plan: no later round, eligible unit,
Worm-to-marker route or cancellation condition was assigned. Its immediate
next-deploy plan named a large Zergling body but did not establish that the body
would or could use this Worm. The trace is therefore retained as evidence of
rule knowledge without operational infrastructure planning.

No strategy preference was added to the prompt. If a new decision still chooses
the low-value corner after receiving the missing comparison, that choice will be
fed to replay/Skill evolution rather than hidden behind a Host-authored score.

## Map authority audit

The run is already bound to the two-layer `sc1_lost_temple_v1` compiler. The
background is display-only. The certified Rules layer contains nine terrain
pieces: five derived from selected Lost Temple elements and four explicit
neutral TMG balance compensations. Those exact footprints, elevations and
access points affect movement, placement, line of sight and later action
enumeration. Background pixels never do.

The captured Worm point happened not to interact with that topology. That does
not mean terrain was disabled; it means the chosen point was a remote, low-value
corner.

## Focused verification

Command:

```text
node scripts/verify-ticket-23-slice-248-omega-entry-edge-value-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922081548551
```

The concrete revision-6 reproduction failed before the repair because every
option lacked `entryEdgeUtility`. After the code change the same focused command
ran once and passed:

- exact options returned: 6;
- low-fire option maximum approach gain: 12.808 inches;
- largest-gain option maximum approach gain: 17.261 inches;
- improved objectives: 4 for both reported representatives;
- Provider calls: 0;
- Room mutations: 0;
- training truth: false.

No unrelated test, build, full match or already-passed gate was rerun.

## Continuation rule

Revisions 7–12 remain immutable, non-training, low-strategy counterexample
evidence. The next live decision branches from revision 6, receives the repaired
option material, and must independently trade off fire exposure, objective
approach and future deployment value. Only Critical/High findings block apply.
