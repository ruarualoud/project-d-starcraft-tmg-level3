# Ticket 23 / Slice 248 follow-up task — combat estimation and prediction calibration

Date: 2026-09-17

Status: recorded, not implemented

Priority: resume only after the current revision-46 report checkpoint

## Why this task exists

The Standard-2000 A-A run reached authoritative state revision 46. The Zerg
planner could query exact geometry and current LegalSpace, but
`attack_probability` and `fire_zone_exchange` returned `unknown`. It therefore
could not quantify expected casualties, exposure, objective value, or the value
of retreating/dispersing before it chose to hold marker 4. Its prediction that
Terran would continue shooting was directionally correct, while the predicted
actor/target was only partially correct; the accepted Terran transitions were
not written back as a typed calibration outcome.

This is a decision-support and memory-loop gap. It is not a Rules legality gap,
and prediction must never become Rules authority.

## Concrete deliverables

1. Implement `attack_probability` for a current authoritative action domain.
   It must use the frozen attack profile and exact hit, surge, armour, evade,
   damage, health and casualty mechanics. Exact dice contracts remain owned by
   Rules; any expected-value projection is labelled `advisory_estimate` with
   explicit assumptions and uncertainty.
2. Implement `fire_zone_exchange` for current and hypothetical legal
   formations. Compare expected damage/casualties dealt and received,
   contributing model counts, remaining activations, objective control,
   projected score/supply swing, and at least hold, attack, retreat and disperse
   alternatives. Every hypothetical placement must still pass authoritative
   Preview before use.
3. Add a typed opponent prediction record with action class, likely actor,
   likely target, horizon, confidence, evidence and invalidation criteria.
4. Bind later accepted public transitions to pending predictions and write one
   of `hit`, `partial`, `miss`, `unobservable` or `expired`, including the actual
   actor/action/target and explanatory delta.
5. Feed the bounded calibration summary into the next planner pass and require
   the public plan to state whether it retained or revised its prior plan. Raw
   or hidden chain-of-thought is neither requested nor stored.
6. Run a cloned revision-46 A/B diagnostic without mutating the formal room:
   baseline versus estimation-plus-calibration. Compare legal candidate ranking,
   plan, target, exposure, objective value and Provider usage. A changed answer
   is evidence of influence, not evidence that the new answer is strategically
   correct.

## Acceptance and safety

- The live formal room remains paused at revision 46 while this task is pending.
- Authority binding includes room, match, state revision/hash and current
  LegalSpace/domain identity. Missing current domains return a typed unknown;
  they do not use stale estimates.
- Estimates, Skills, character text and memories cannot add actions, change
  dice, confirm, apply, or override Preview/Apply/Replay.
- Same-match calibration is advisory memory only and is not training truth or
  an automatic Skill promotion.
- Only Critical/High findings block integration. Medium findings are tracked.
- The focused changed-path gate runs once after implementation; no unrelated
  full-suite replay is required. Any live comparison is separately budgeted and
  must not advance the formal revision-46 room.

## Recorded revision-46 evidence

- `spatial-action-query-runtime-v1` advertises `attack_probability` and
  `fire_zone_exchange`.
- The room-backed adapter does not currently instantiate either query kind, so
  the planner receives typed `unknown` results.
- Zerg predicted continued Terran shooting; the next accepted actions were a
  Marine C-14 attack into Swarmlings and a Rocket Launcher attack into the
  Roachling unit. This is a `partial` prediction under the proposed contract.
- The existing memory records plan, purpose, intent and outcome, but the sampled
  Zerg outcomes do not bind an observed opponent response.

## Harness bookkeeping

- `harnessLoopUsed`: `agentic-harness-evolution-loop`
- `targetGames`: `starcraft-tmg`
- Expected prompt route: `selfplay_agent_prompt`
- Expected tools: current room/LegalSpace, spatial relationships, exact action
  instantiation, attack probability, fire-zone exchange, objective projection,
  accepted-transition observer and match memory.
- Skill input route remains the frozen general + own-faction + directed matchup
  set; no Skill generation or promotion is part of this repair.
- `ctx2skillLoopUsed`: planning-only for later replay review; no candidate is
  promoted from this checkpoint.
