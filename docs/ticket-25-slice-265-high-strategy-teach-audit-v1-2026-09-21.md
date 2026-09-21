# Ticket 25 / Slice 265 — High-strategy Teach audit v1

Date: 2026-09-21
Status: focused acceptance passed; implementation complete; not promoted
training truth
Target: Standard 2000 Terran Armed Forces vs Kerrigan's Swarm recovery match

## Purpose

This audit applies a bounded Teach loop to the current high-strategy recovery:

1. ask a decision question a competent player must answer;
2. answer it from the frozen official rules/card/FAQ snapshot;
3. challenge the answer with the current match failure;
4. inspect whether the live harness supplies exact or explicitly uncertain evidence;
5. fix Critical/High and Medium decision-material gaps now; preserve only the
   irreducible future-choice portion as typed uncertainty.

It is a source-backed design audit, not a new paid model generation and not proof
that a strategy is strong. The failed run remains immutable and ineligible for
training; promotion still requires replay evidence from the repaired branch.

## Frozen sources read

- `build/source-intake/official-rules/StarCraft-TMG_EN.pdf` — core rules,
  especially Parts 4, 6, 8, 10 and 12.
- `build/source-intake/official-rules/faq-v1-2026-09-03/StarCraft-TMG-FAQ_EN.pdf`
  — FAQ v1.0.
- `build/source-intake/official-rules/StarCraft-TMG_Terran_EN.pdf` — fielded
  Terran unit and tactical-card text.
- `build/source-intake/official-rules/StarCraft-TMG_Zerg_EN.pdf` — fielded
  Zerg unit, Kerrigan's Swarm, Omega Worm and Ventral Sacs text.
- `content/strategy-skills/ticket-18-foundational-v1/skills/general-rules-and-strategy.json`
  — current general strategy Skill.

No source refresh was performed. This development pass uses the already frozen
official snapshot, as required by the project data-freeze policy.

## Teach question tree

| Decision question | Source-backed answer | Existing Skill | Live evidence before Slice 265 | Result |
| --- | --- | --- | --- | --- |
| What wins this mission now, and how many scoring windows remain? | Evaluate mission-specific VP, marker state, destroyed-Supply VP and score clock; do not optimize casualties alone. | Covered as `objective_plan`. | Score and mission existed, but placement prompts did not force a net mission-value comparison. | High: add a mandatory mission/score-clock check. |
| Is Pass better than another activation? | First player to Pass takes the next-phase First Player Marker but forfeits all remaining activations this phase. | Covered as `activation_tempo`. | Pass opportunity cost was only partially enumerated. | High: enumerate current non-Pass actions and compare the forfeited value. |
| Can a Rules-legal deployment be strategically losing? | Yes. Deployment must be legal, coherent and outside enemy ZoI, but legality does not imply safety or positive mission value. | Covered abstractly by `movement_position` and `threat_trade`. | Formation search had threat bands but not exact immediate stationary-fire casualty/Supply outcomes. | High: attach exact current stationary attacks and casualty distributions to every formation option. |
| What exactly is lost when casualties are removed? | The defender removes actual model identities under casualty priority. Loss can remove occupied positions, Specialists/upgrades, attack contributors, Supply, control strength and Tactical Mass. | Only casualty count/Supply exchange was explicit. | Probability reported casualty count and possible Supply, not an auditable legal loss list. | High: emit each legal removed-model list and its complete strategic loss vector. |
| Does casualty loss always reduce movement distance? | No. The next Move still uses a Leading Model and then places survivors in coherency. Printed Speed may switch at the single-model threshold; otherwise model loss changes footprint, available leaders and formation/contact reach rather than silently reducing Speed. | Not explicit. | Previous wording incorrectly asserted no Speed change from casualties. | High: report printed Speed before/after and require a fresh LegalSpace for modifiers and survivor geometry. |
| Which casualty list should the defender choose? | Apply casualty priority first, then preserve the legal set with the best remaining mission value: objective contact, irreplaceable Specialist, ranged/close-combat contributors, formation access, Supply and future activation. | `threat_trade` was too coarse. | The model lacked per-selection role, position and firepower evidence. | High: compare exact legal selections, not just casualty count. |
| How does Supply loss cut both ways? | Lower Current Supply can concede destroyed-Supply VP, marker strength and Tactical Mass, while also freeing Available Supply for reserves. A Supply-0 Unit can still hold an uncontested marker. | Supply and objectives were covered separately. | The dual effect was not compiled into one decision object. | High: include Supply before/after, VP conceded, control-strength change and Available Supply freed together. |
| Can a lost Specialist weapon transfer? | No. The FAQ says a removed Specialist cannot be replaced by another model to keep its weapon. | Mentioned in faction facts but not casualty choice. | Assigned upgrades were not visible to casualty selection. | High: identify assigned upgrades and full profile loss per removed model. |
| How does formation alter damage output? | Ranged contribution depends on fielded weapons and eligible contributing models. Close combat depends on Fighting and Supporting ranks; Close Ranks can reposition to increase contributors. | Covered as positioning in principle. | No per-model profile contribution loss or potential close-rank loss. | High: emit printed contributor/dice loss; mark exact future dice as requiring fresh geometry. |
| How should multiple weapons be ordered? | Ranged weapon types form separate Batches. Resolve one Batch fully, then retarget/re-evaluate the next; use the first Batch to change the second decision when valuable. | Partly covered by `threat_trade`. | The live prompt did not make batch sequencing a standard decision dimension. | Medium fixed: batch order is mandatory in the strategy checklist and the existing pending ranged sequence remains Rules-owned between batches. |
| How do Reaction windows change an exchange? | Only one Reaction per player per Activation; choosing one can exclude another. Reactions can change damage or status outside normal activation. | Resource timing exists, but reaction exclusivity is not explicit. | Exchange estimates do not monetize alternative Reaction opportunity cost. | Medium fixed: every ranged estimate projects trigger-specific, priority-ordered mutually exclusive reaction choices, exact resource/card cost and mechanical effect; baseline damage is labelled before optional reactions. |
| What does Tactical Mass change? | A Disengaging Unit avoids the next-Assault penalty only when its Current Supply exceeds the combined Supply of engaged enemies. | Not explicit enough. | No forward Tactical Mass consequence on casualty options. | Medium fixed: every exact casualty selection reports current engaged enemy Supply and Tactical Mass before/after. |
| May a newly created Omega Worm deploy or provide its special Creep route immediately? | No. The Worm created by Omega Network cannot use Special Abilities other than Structure that round. | The card fact existed. | Runtime exposed the new Worm's Entry Edge/Creep ability immediately. | Critical: suppress those special routes until the following round. |
| Is Ventral Sacs immediate deployment? | No. Movement places the indicator; the Ground Unit deploys at End of Round. | Card fact existed. | Must stay lifecycle-driven, not be treated as immediate reserve arrival. | Covered; retain as a regression invariant. |
| What should happen when one chosen formation has no legal option? | Reject that candidate/intent and return to the same current planning boundary; do not terminate the match if alternatives exist. | General uncertainty handling existed. | The Host raised a High terminal finding. | High: type the candidate unavailable and replan over the remaining action index. |
| How should prediction improve later choices? | Predict a typed opponent response, observe the real response, calibrate the prediction, then retain/revise/abandon the plan. | Covered as `opponent_response`. | The loop existed but invalid suffix actions would contaminate continuity if blindly resumed. | High: fork from the last valid revision, replay authority, seed only the last valid plan, and require reassessment. |

## Current implementation decisions

The live decision material now treats a casualty outcome as a vector rather
than a scalar:

- exact casualty model IDs and their occupied positions;
- leading-model and assigned-upgrade/Specialist loss;
- ranged profile contributors and printed hit dice lost;
- exact current Fighting/Supporting contributors lost plus separately labelled
  future Close Ranks potential;
- formation envelope before/after and survivor-footprint recomputation;
- printed multi-model/single-model Speed before/after, while current modifiers
  remain dependent on a fresh LegalSpace;
- Current Supply before/after, Supply freed, destroyed-Supply VP conceded,
  exact current marker contact/controller changes and Tactical Mass before/after;
- trigger-specific Reaction choice sets with mutual exclusion, exact resource or
  source-card cost and mechanical effect;
- exact current distance/printed reach and conditional attack-pool evidence for
  move-then-fire threats; the unchosen future path and post-move LoS remain
  typed conditions rather than being treated as safety.

This prevents the estimator from collapsing materially different losses into
the same “one casualty” answer. It also prevents a false rule: model loss does
not inherently make the Unit slower, but crossing the one-model threshold may
select the card's single-model Speed, and survivor geometry always changes the
next placement problem.

## Severity and closure

### Critical/High fixed in Slice 265

- Omega Worm creation-round special-ability leakage.
- Formation choices without exact immediate stationary-fire loss evidence.
- Casualty estimates without legal model-loss identities and role/position cost.
- Full-health Field Repair treated as productive and falsely described as not
  exhausting its source card.
- A candidate with no legal formation terminating the match instead of being
  removed from the current action index and replanned.
- Recovery that would resume after invalid/low-strategy actions rather than
  replaying a verified prefix into a fresh room.

### Medium fixed in Slice 265

- Move-then-fire now reports exact current base-edge distance, printed movement
  allowance, required movement, reach margin, current contributors and printed
  attack dice. Because the opponent has not selected a route, legal path and
  post-move LoS remain conditional; reachable rows are explicitly live threats
  and can never be ranked as zero risk.
- Every legal casualty selection is projected through the authoritative marker
  control kernel, including current LoS, elevation, coherency, eligible model
  identities, both sides' Supply totals and controller before/after.
- Current Fighting and Supporting ranks are exact from the engagement graph;
  potential post-Close-Ranks geometry remains separately labelled future value.
- Ranged estimates enumerate all five relevant reaction triggers, active-player
  priority, defender choices after pass, mutual exclusion, payment/exhaustion
  cost and mechanical modifiers. The distribution remains explicitly the
  no-optional-reaction baseline so the Agent must compare the choices.
- Tactical Mass and multi-Batch sequencing are explicit strategy evidence.

No Medium finding is silently deferred. Only consequences that depend on a
future opponent-selected route or reaction choice retain typed conditionality.

## Promotion and replay rule

- The old failed suffix is evidence of defects only; it is never copied as
  legal experience or training truth.
- The new branch replays accepted receipts through state revision 4 with zero
  provider calls, seeds the last valid Terran plan as “reassessment required”,
  and asks both agents to continue from fresh Rules authority.
- No strategy Skill is promoted from this audit alone. Candidate Teach updates
  can be proposed only after the repaired branch supplies action, outcome,
  prediction-calibration and replay evidence.

## Focused acceptance

The fresh repair cycle closed the isolated geometry and risk-projection defects
without weakening Rules validation:

1. lifecycle placement and hypothetical formation projections now derive each
   active model's elevation, supporting terrain and adjacent access points from
   its final footprint;
2. the elevation kernel still rejects inconsistent declarations rather than
   accepting stale reserve metadata;
3. the formation risk view enumerates exact current-position stationary attacks
   and separately projects bounded move-then-fire reach;
4. move-then-fire consumes the canonical `unit_spatial_relationship` edge kind
   (while retaining the historical alias) instead of silently filtering every
   current graph edge;
5. the ranged firepower projection is independent from unrelated casualty and
   close-combat projections, while exact future path and post-move line of sight
   remain typed uncertainty.

Focused command:

`node scripts/verify-ticket-25-slice-265-high-strategy-recovery-v1.mjs`

Result: PASS. Four Omega formation options exposed stationary-fire casualty and
Supply states, Goliath move-then-fire risk, reaction choices, Tactical Mass,
exact loss lists, current melee/marker consequences and a four-transition room
fork/replay smoke receipt. Provider calls: `0`; paid cost: `¥0`; no Web server
or Provider stack was created. The failed historical suffix remains non-training
evidence; this pass does not promote a strategy Skill.
