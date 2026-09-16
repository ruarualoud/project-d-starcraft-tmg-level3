# Ticket 25 — spatial-intelligence MCP and formation strategy

Date: 2026-09-16

Status: accepted follow-up to Ticket 24. Slices 259--261 are implemented and
Slices 262--263 remain. Ticket 24 Slice 258 still owns completion of the current
Standard-2000 evidence match.

## Product requirement

Positioning is not a renderer concern and a formation is not a fixed template.
The Agent must understand how each model's base, relative position, firing lane,
engagement surface, screening relation, threat exposure, objective reach and
future path changes the game. It chooses a tactical intent; a spatial MCP-like
tool solves and compares complete legal layouts; the Agent selects or revises
the plan; Rules validates the selected action.

This recovers the earlier accepted requirement in
`post-foundation-skill-design-questions-2026-09-09.md` and the
`space.evaluate_formation` design in the Ticket-23 Planner architecture. The
current live system had regressed to enumerating a few geometric patterns; the
new seam is intent-to-solution instead.

## Deep-module boundary

`space.solve_formation` is the single public formation operation. Its interface
hides candidate sampling, geometry indexes, local search, caching and exact
Rules instantiation.

Input:

- authority binding: room, state revision/hash, LegalSpace hash and side;
- selected action domain and its complete movement/placement constraints;
- weighted objectives, each with a kind, weight and optional target IDs;
- preferred region or anchor when the plan has one;
- maximum number of alternatives and a time/work budget;
- exact supporting receipts already obtained for threat, line of sight, cover,
  objective score, paths and ability-specific constraints.

Output:

- several complete layouts, never a partial unit centre;
- canonical per-model positions and rotations;
- exact legality receipt and the physical constraints that were decisive;
- comparable tactical metrics and their precision (`exact`, `advisory`, or
  `unknown`);
- public per-layout and per-slot reasons suitable for UI/replay, not hidden
  chain-of-thought;
- an option ID that binds the canonical action parameters for final Rules
  re-instantiation;
- search provenance, work/time usage and whether a better solution may exist.

The Host owns solving coordinates. The Agent owns objectives, trade-offs,
option selection and plan revision. Rules owns legality. The UI owns preview
and optional human override. No layer may infer Rules geometry from map pixels.

## Objective vocabulary

The first stable vocabulary is:

- `advance`: increase useful progress toward a named lane, marker or enemy;
- `compact`: reduce footprint while retaining legal coherency;
- `disperse`: increase spacing against area effects without breaking support;
- `maximize_engagement`: place the greatest useful friendly base perimeter in
  legal contact or action reach;
- `surround_target`: cover distinct approach arcs and restrict escape space;
- `avoid_threat`: maximize exact safe clearance or, when exact receipts are
  absent, return explicitly advisory visible-source clearance;
- `control_objective`: maximize current and projected scoring control;
- `screen`: interpose expendable or durable bases along named attack paths;
- `preserve_lane`: keep friendly movement, fire or reinforcement corridors
  open;
- `balanced`: a non-authoritative fallback, never proof of optimal play.

Future objectives are versioned additions, not ad-hoc prompt prose. Conflicting
goals remain visible with weights; the solver does not collapse them into one
unexplained template name.

## Solve architecture

1. Build a spatial relationship graph from model/terrain/marker/token physical
   footprints and exact Rules receipts.
2. Generate feasible regions and candidate points continuously or on an
   adaptive lattice. Seeds accelerate search but never constrain the answer to
   a named shape.
3. Construct a complete layout under base collision, battlefield containment,
   action distance, deployment, coherency and ability constraints.
4. Evaluate the whole layout against weighted tactical objectives. Pairwise and
   group consequences are included; independent nearest-point scoring is not
   sufficient for surrounding or screening.
5. Keep a Pareto-diverse set so the Agent sees meaningful trade-offs rather
   than near-duplicate coordinates.
6. Fully instantiate every exposed option through Rules. A heuristic score can
   rank candidates but can never certify legality.
7. Return immediately available legal options, while an asynchronous
   pre-execution search may improve the set before the decision deadline.
8. Persist chosen intent, rejected alternatives, exact receipts, public reason
   and resulting board delta into match memory and replay.

## Runtime use

The Planner first forms or recalls the overall plan, then chooses an action
candidate and formation objectives. The Host invokes this tool once for that
candidate. Action compares the complete alternatives and either selects one,
changes weights within its allowed decision budget, changes action, or Passes
with an explicit comparison. Final Apply always re-instantiates the bound
canonical proposal at the current revision.

The same contract covers Deploy, Move, Run, Disengage, Charge, Place, Summon,
Respawn, Omega/Pylon/transport-style entry and forced relocation. Ability names
do not receive hard-coded layouts. Reserve pieces are evaluated in their
post-placement state so static modifiers are not lost.

## Skill and learning loop

Formation intent and results are strategy evidence. Replay evaluation may learn
contextual propositions such as “against this blast profile, dispersion weight
4 improved survival while retaining marker control,” but may not promote a
coordinate-specific result as a universal rule. Counterfactual search branches
from an exact checkpoint, varies objectives/actions, applies both sides'
responses and records the scene conditions under which the advantage persists.
Only held-out replay/judge evidence may promote this into a faction or matchup
Skill. MuZero exports receive the exact state, legal action binding, spatial
intent, chosen layout and outcome; heuristic alternatives are not training
truth.

## Slices and acceptance

### Slice 259 — intent contract and lifecycle tracer bullet (implemented)

- Public `space.solve_formation` tool name and typed objective vocabulary.
- Planner-to-Host-to-Action binding with canonical option selection.
- Complete-layout metrics and public reasons.
- Revision-39 Omega/Raptor reserve proof: six of six exposed layouts passed
  full Rules instantiation, official four-inch Squadron coherency applied and
  Provider calls remained zero.

The roughly 2.5-minute local solve remains Medium performance debt. This slice
proves the seam and correctness, not production latency or all action families.

### Slice 260 — complete action-family coverage (implemented)

- Apply the same solver contract to Deploy/Move/Run/Disengage and every
  Charge/Place/Summon/Respawn/transport/forced-relocation domain.
- Preserve leading-model path semantics while freely solving the remaining
  model placements.
- Prove representative round and rectangular bases, single- and multi-model
  units, battlefield entry and in-place relocation.

Deliverable: coverage matrix plus focused Rules-instantiated receipts for every
formation-bearing action family. This is contract coverage, not one test per
unit name.

Closure: `ticket-25-slice-260-formation-action-family-coverage-v1-2026-09-17.md`
records the exported denominator, live Standard/Charge/Relocation/Lifecycle
receipts, exact `extra_move` and two-model Respawn adapter hashes, and the
zero-domain forced-relocation result. The real action-58 Charge resolution also
proved the solver's rules-certified failure exit rather than another model
coordinate-repair loop.

First live blocker: after action 57's authoritative Charge roll, the only
current domain was `resolve_charge`. It was not classified as a formation
domain, so the Planner emitted no formation search request and the model was
asked to hand-author the Leading Model path plus 17 remaining placements. Three
host attempts and 21 paid calls did not converge. Slice 260 must route this
domain through the same Host solver and encode Charge-specific constraints:
all declared target units engaged, no undeclared enemy engagement, Leading
Model engagement with every declared target, closest-position behavior, and
remaining-model priority of base-to-base, engagement, then coherency.

### Slice 261 — exact tactical relationship graph (implemented)

- Exact nearest-base distances, containment, contact arcs, coherency graph,
  blockers, cover/elevation, line of sight, action-specific threat, fire-zone
  exchange, objective control, lane preservation and escape restriction.
- One-to-many, many-to-one and aggregate friendly/enemy threat evaluation.
- Metrics retain exact/advisory/unknown precision and source receipts.

Deliverable: UI- and Agent-readable spatial graph/overlay receipt plus tactical
scenario comparisons that distinguish disperse, surround, screen and focus-fire
solutions.

Checkpoint: `ticket-25-slice-261-tactical-relationship-graph-checkpoint-v1-2026-09-17.md`
records the new scoped `space.inspect_relationships` MCP, field-level precision,
Grass LoS routing, formation-option projection and the three-round verifier
outcome. Natural Standard-2000 action 126 then proved an Agent-selected complete
18-model option, current-to-hypothetical relationship deltas, Rules Apply,
Replay equality, revision-126 screenshot and no observed v4 strategy regression.
The same receipt exposed the mission-marker coordinate-form mismatch; the
focused repair now resolves official `xInches/yInches` and scores nearest
physical edges against the marker's 32mm footprint without repaying the match.

### Slice 262 — bounded performance and asynchronous pre-execution

- Revision-keyed spatial indexes and receipt caches.
- Cheap feasibility pruning before Rules instantiation.
- Lazy/Pareto candidate generation, local improvement and deterministic seed.
- Asynchronous pre-execution for likely choices, cancellable on state revision
  change, with a fast exact legal fallback.

Deliverable: the revision-39 18-model case returns a useful exact option set
within the interactive budget while preserving the same legality denominator
and without tightening the Agent's strategy or token budget.

### Slice 263 — live strategy, memory and evolution proof

- Live 2000-point H-A and A-A positioning decisions spanning movement,
  engagement, threat avoidance and objective control.
- Web preview/override and replay visualization of intent, options and effects.
- Match memory records plan continuity and why a formation was selected.
- Counterfactual replay compares at least two alternative intents from one exact
  checkpoint; any SkillOpt proposal states its scenario boundary and passes
  held-out validation before promotion.
- MuZero export labels exact state/action/outcome and excludes advisory options
  from training truth.

Deliverable: action-by-action JSON/NDJSON, screenshots, cost/performance ledger,
PDF evidence and promoted-or-rejected Skill delta.

## Blocking policy

Critical/High findings block Apply or release. Medium findings, including
suboptimal search latency or heuristic metric uncertainty, are retained in the
receipt and backlog but do not stop an otherwise exact legal action. The same
review/repair cycle may run at most three rounds.
