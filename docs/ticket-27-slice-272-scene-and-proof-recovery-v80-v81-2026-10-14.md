# T27 / S272 — terrain-preserving scene packing and review-proof recovery

Status: T27 5/6, T23 33/36; main remaining248/272/249/250=4; complete matches0/12.
The full map/2000-point roster/same-room comparison goal remains unfinished.

## Actual A/B Plan state

A6 c6802fa8497c6a7a5036fab6e86daf13aa597a41a932b53d728f64f5522c3016
corrects player2 holding own markers2/4 to2VP, not4. The declared player1
1/3/5 base yields3VP conditional on control. Thus the previous structural
1VP deficit is false; the latest Plan recognises a1VP marker-only advantage.
B13 dbf6c0215a68d858700b0d4455d286c624586c18b7adbe6eef213499043e2715
withdraws the unbound opposing4/8/12/16 projection as proof but keeps its
two-track preference. Some downstream wording still leans on the projection;
this is NOT a proven strategy improvement. Both roster and arrival schedule
are unchanged versusA4/B12. Original Room Plan identities remain unchanged.

Latest quantitative Teach retains9/12 A and5/8 B unanswered questions. These
include invalid hypothetical placements, absent action-domain references,
incorrect tool family and missing alternate-roster audit. Future opponent
choices are legitimate uncertainty; failed scene setup is an engineering gap.

## v80: concrete placement bug, fixed

Actual paid request inv4-1-scenario-marine-movement places the three Marine
units at(9,27),(33,27),(25,22), with preferred1.5-inch spacing and terrain ON.
The old fixed three-column filler puts followers2/2/8 into two walls/a geyser.
It does not prove those model-selected anchors are unusable.

Product changes:

- legal-formation-search-v1 exports an advisory fixed-anchor packing entry
  using the SAME physical footprint, terrain, surface and coherency-link
  primitives as live formation search. No fake action domain or path proof.
- pregame-scene-laboratory-v1 now reserves declared anchors, then fills
  followers around terrain/other bases. Explicit model positions are untouched.
  Optional formationObjectives remain model-owned. Preferred spacing is not
  a rigid three-column grid. Lab version1.4.0 makes the change explicit.
- Failure at a fixed anchor is typed bounded-search unknown, never silent
  relocation or proof no formation can exist. Terrain is not cleared.

Concrete verification verify-slice272-hypothetical-formation-v80.mjs:
RED37547 reproduces all three actual overlaps; soleGREEN38534 passes complete
units/in-coherency at unchanged anchors, explicit-layout preservation, illegal
anchor not relocated, source/terrain unchanged.0Provider/0Room actions.
Native geometry result hashes88530754...,9abc4cad...,8bebce2c....
This is geometry, NOT proof of legal historical arrival or a winning formation.
No old gate or full suite was repeated.

## v79 real automatic qualification stop

Runner35099 used existing idle hosts25234/25236. Both completed three calls
and stopped at REVIEW_JUDGMENT_RECOVERY_REQUIRED before Plan edits.
A added241024units (233585in/7439out); B426991(418918/8073).
Keep these costs and old unknown fees; no ledger reset.

Concrete errors: a supported source claim was forced to cite a different Plan
sentence; correct numbers inside sentences were rejected unless first; a sum
could only be represented as a false one-to-one binding to one subtotal.
Later invalid saved attempts could duplicate already-valid imported findings
as unresolved, invalidating the combined proof.

## v81: proof contract, fixed with bounded verification

- source-supported judgments may cite actual source evidence without another
  Plan sentence repeating it. Conditional wording may be in the quoted claim
  itself. Neither a self-quote nor a reviewer opinion becomes Rules truth.
- Literal binding locates the unambiguous numeric occurrence, distinguishes
  VP amounts from IDs, and does not let an unrelated paragraph number cover it.
- Contractv3 supports identity/sum/difference over actual source fact IDs;
  the host computes source operands. No caller-provided numbers become Rules.
- Policy11 revalidates exact paid policy10 outputs against the SAME catalogue;
  imports only unresolved items. Older successful proof cannot be overwritten
  by a later malformed attempt. Import preserves fees/output hashes.

Concrete verify-slice272-review-proof-v81.mjs initially RED (old recovery
cannot advance). First post-fix run identified the registry's strict-schema
subset and missing test inputs; next identified duplicate imported statuses.
Under the user's standing one-extra-after-concrete-fix permission, finalGREEN
passed. Two actual paid control-transfer proofs reuse locally; a zero-provider
double supplies the one remaining sum. Wrong sum and invented source stay
rejected; original draft unchanged. This does NOT claim live model success.
One subsequent static compatibility guard preserves the old standalone
adjudication self-quote rejection when no reconciliation policy is present.
No passed test rerun, no full suite.

## Live recovery / next action

Old hosts25234/25236 were confirmed idle/completed, terminated and confirmed
exited. Runner43696 starts common-v81-qualified-recovery.private.mjs on the
SAME A/B data directories/map/web export. Read its progress JSON and actual
PIDs before retrying; observation timeout never means terminal. No Room launch
is attached, no original Plan swap. ExpectedA6/B13; existing paid proof imported
before at most one post-fix qualification remainder, then only genuinely High
claims enter the existing one-cycle repair.

Original rooms remain A133/C156/B9/D9. C Web155 is observation lag: backfill
observation156, NEVER replay action156. Still needed: remaining true claim
correction, live Teach scene/action/budget evidence, accepted Plan application
at an explicit boundary, four same-code resumes and full comparison reports.

harnessLoopUsed=true; game=starcraft-tmg; roles=fact_probe/harness_optimizer;
trainingTruth=false. No agents/K3/install/delete/data refresh/commit.

## v81 actual outcome and v82 inheritance repair

v81 live A used1 new call82862units. Five of eight judgments were accepted;
three remain unbound (68/71: subtotal/total/+1 difference and unchecked per-marker
amount;88: arrival-round fact paths are absent from the numeric catalogue).
The model expresses a three-operand difference with no well-defined grouping.
Do not approve these by inventing arithmetic, and do not repeat unchanged calls.

B reused two earlier source-supported3VP-transfer judgments. Its one fresh
qualification incorrectly compares the three-marker3VP total to each2VP/1VP
subtotal separately, labelling the correct sum contradicted. This is a newly
identified proposition/quantity-binding weakness, NOT a genuine scoring-rule
error. B's subsequent automatic revision14 preserves the3VP total but expands
it into2+1; it is not a strategy improvement. Plan14 hash
78c866e4ba51417641879b63995a1e100e984ec49d2b5fd8ee18b60ea6b42fd6.
Its real one-shard review completed with0 new High,4Medium/2Low, then local
proof inheritance failed before persistence: an inherited source-only decision
lost its supporting reconciliation context. B v81 used3calls288396units.

v82 repairs that specific inheritance in roster-final-plan-review-v1 only:
carry the already-verified source proof when the claim/dependency facts remain
unchanged, recheck its exact claim/fact catalogue/numeric binding locally.
The focused actual B14 saved-response RED reproduced ADJUDICATION_INVALID;
soleGREEN consumed the same paid context, inherited2 proofs, and rejected a
tampered source.0Provider/0Room actions; no prior gates rerun.

Old idle v81 hosts43715/43716 were terminated and exit-confirmed. Runner49692
and v82 hosts49693(A)/49707(B) retain the original workspaces/map/web export.
A stays idle at its known qualification stop. B invokes only changed-claim
review recovery, using the already-paid exact shard. Read
common-v82-retained-review-progress.private.json AND actual PIDs before action.
No Room launch or Plan application. Original A133/C156/B9/D9 remain held.

This continuation's paid dispatches since18:23Z: A4calls323886units, B6calls715387,
total1039273units. FrozenSep14 off-peak pricing with reported cache usage gives
A USD0.041789448, B USD0.071902302, totalUSD0.113691750. Estimates, not invoices;
all earlier fees/unknowns remain separately retained. Local gates cost0.

Next priority is a quantity-bound claim proof (actor, controlled set, scope,
sum versus subtotal, timing fact identity) so reviewer field errors cannot
become false strategic corrections. Preserve legitimate uncertainty and do not
force a tactical preference. Then finish legal scene/action/alternative-audit
evidence, not just repeatedly polishing Plan prose. Goal remains active.

### v82 actual completion

18:42:37Z: B14 review restored through the real workspace service,0 new calls/
0new units. Review154be02b25d06289d9dd0dcf814bcedfa3993e1cb7b6f1f3a2083bc9b0de9f10;
2 original High have inherited source proof, effectiveHigh0.102 rawMedium
remain tracked (plus the2 reclassified opinions); no strategy-quality pass is
claimed. A/B hosts49693/49707 are confirmed live and idle at52761/52762;
runner49692 finished. A6 still has3 qualification items. Do not blindly restart
the finished runner or repurchase B's completed shard. Neither Plan was applied
to original rooms, which remain unchanged.
