# Ticket 23 / Slice 248 — Standard-2000 A-A revision 46 checkpoint

Date: 2026-09-17

Room: `ticket23-slice248-aa-20260916223306152`

Map: Lost Temple / Standard 54×36 / 9 authoritative terrain pieces

Status: **checkpoint only; match not terminal**

## Outcome

The authoritative room is safely paused at revision 46, round 1 Assault,
Player 1 active, score 0–0. Both sides use 2000-Mineral armies. The room has
46 accepted receipts, SQLite WAL durability, 339 executable rule atoms and no
non-executable rule atoms in its bound current-product runtime.

This checkpoint proves deployment, terrain-bound spatial movement, complete
multi-model formation placement, ranged attack sequences, random dice,
defender-owned casualty selection, activation closure, replay-bound receipts,
and read-only character sessions. It does **not** yet prove end-of-round
scoring, round-2 reinforcement entry, terminal A-A play, merged review,
SkillOpt promotion or MuZero export.

The room was not changed by any Kerrigan test. Revision, state hash and journal
head remain:

- state revision: `46`
- state hash: `40e7db65f4d60687f47d7111c9b2efd0bc33d4e6a7cb1184c28ea7ab5719a8bc`
- journal head: `34cff455fe21414edff6add4e8b7eece346e96f55479b46e455bdd973efe9ddc`

![Current authoritative r46 battlefield](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/kerrigan-checkpoint-r46/0070-r046-current-authoritative-board.png)

## Combat sequence observed

### Raynor attacks; Zerg does not counterattack

At r27 Jim Raynor attacked the Hydralisk with the C-14 rifle. The defender
resolved one casualty at r28; this r28 Zerg action was a mandatory casualty
selection, not a Hydralisk counterattack. Raynor then destroyed the remaining
Hydralisk model with the “Justice” Revolver at r29 and closed his activation at
r30.

![Hydralisk casualty resolution at r28](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/screenshots/0040-r028-player2-ranged_attack-applied.png)

### Swarmling spends its response window and is punished

At r31 Swarmling ran only 1.734 inches of a 4-inch allowance and finished its
activation at r32. It could not later reactivate in the same Assault phase.
Goliath then fired a three-weapon sequence:

- Autocannon: 5 damage / 5 casualties;
- Scatter Missiles: 1 damage / 1 casualty;
- Haywire Missiles: 3 damage / 3 casualties.

Swarmling lost 9 of its 18 models. This validates the user's observation that
Zerg was mostly absorbing pressure instead of producing an offensive answer.
The public plan predicted danger to Raynor and reserve entry, but it did not
bind predictions to successor observations or prevent the early Swarmling
activation.

![Swarmling run at r31](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/screenshots/0044-r031-player2-run-applied.png)

![Goliath sequence in progress at r37](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/screenshots/0056-r037-player1-ranged_attack-applied.png)

At r40 Zerg had three Charge candidates but chose none. The following Zerg
activation ran Corpser only 2.236 inches of a 6-inch allowance and closed at
r42, continuing to hold the marker cluster. The record contains public reasons,
risks and predicted opponent responses, but `attack_probability` and
`fire_zone_exchange` remained unavailable, so the agent could not quantify the
trade.

### Marine attack and full-unit run

At r43 one Marine model fired AGG-12 into Swarmling. Hit dice `[3,3]` produced
zero hits. A Surge die was rolled as part of the declared profile but could not
convert a hit because no hit existed; the attack produced no damage.

At r44 one Marine model fired the Rocket Launcher into the summoned Roachling.
Hit dice `[6,1,3,4]` produced two hits. Armour dice `[5,4]` failed against 6,
producing two casualties. At r45 the Zerg defender removed model 1 and model 3,
leaving model 2. The earlier public plan text incorrectly referred to a
surviving model-2/model-3 pair; the authoritative event is correct and the
public explanation is a Medium content defect.

![Marine Rocket Launcher at r44](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/screenshots/0068-r044-player1-ranged_attack-applied.png)

![Defender casualty selection at r45](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/screenshots/0069-r045-player2-ranged_attack-applied.png)

At r46 the Marine unit ran its leading model from `(9, 32.630)` to `(11, 26)`:
6.925 inches of a 7-inch allowance. All nine live models received explicit
final placements. The Rules transition records complete-formation placement,
full-base boundary/swept-path checks, terrain/elevation/access checks and
coherency. Action 46 reached the authoritative SQLite journal after the browser
runner had already lost its page, so `actions.ndjson` ends at action 45; the
signed public transition and the new r46 browser screenshot are the recovery
evidence. No action was replayed or resubmitted.

## What changed in the agent's thinking

The observable record contains public structured plans, not hidden chain of
thought. Across the combat sequence the Zerg agent changed from an initial
position-first policy to casualty preservation, then to a conservative
hold/reposition policy:

1. It initially valued marker coverage and used Swarmling early.
2. After Raynor killed the Hydralisk, it still spent Swarmling's activation on
   a short run rather than preserving a response piece.
3. After Goliath's fire sequence, it repeatedly optimized casualty placement
   and marker coverage, correctly acknowledging unknown damage probability.
4. It selected Corpser Run over three available Charge candidates, prioritizing
   survival and round-2 position over immediate contact.
5. Its prediction vocabulary existed, but predictions were not automatically
   matched against accepted successor actions; the plan therefore did not
   receive a typed hit/miss calibration signal.

This is the reason for the recorded follow-up task:
`ticket-23-slice-248-follow-up-combat-estimation-prediction-calibration-task-v1-2026-09-17.md`.

## Kerrigan companion findings

### Reliability repair

The first diagnosed call returned HTTP 200 with `finish_reason=length`, 4096
output tokens consumed and an empty final `content`. The direct Character
transport had failed to send the already-declared `thinkingMode=disabled`.
After aligning it with the formal live transport, the model returned a complete
answer (`finish_reason=stop`). That answer used top-level `speech` and
`teaching` fields instead of the requested `channels` envelope. A constrained
normalizer now wraps the output only when every root field is an allowed mode
channel; unknown or server-owned fields still fail closed.

The original tactical response correctly cited r46, the spent Swarmling
activation and unavailable probability/fire-zone tools, but incorrectly
predicted another Goliath or Marine attack without sufficiently filtering their
activation state. Its voice was also generic. Therefore parser acceptance was
fixed, but the first tactical content sample was not accepted as a strategy or
roleplay pass.

![Original tactical response evidence](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/kerrigan-checkpoint-r46/kerrigan-r46-actual-dialogue-evidence.png)

### Two-turn roleplay acceptance

The Character Prompt now includes the existing opening examples, all Role Skill
voice/address/perspective fields, a final persona anchor after the large room
projection, and up to eight accepted in-session conversation turns. The
Character package also contains primary-source-derived product abstractions:
compact declarative cadence, threat→action→cost structure, skepticism toward
unearned authority, respect for competence, restrained familiarity, and
moderate dry menace. These are original style constraints, not copied lines.

Two real DeepSeek Flash turns passed:

- turn 1: 136,602 input / 346 output tokens / 7.659 seconds;
- turn 2: 137,030 input / 316 output tokens / 4.062 seconds;
- both: HTTP 200, `finish_reason=stop`, no normalization, `reflect` cue,
  speaking portrait, no preview/apply and no room mutation;
- turn 2 received turn 1's accepted user/assistant content, not only hashes.

The answers maintained the same principle and attitude across the user's
counterargument, did not quote the game, did not claim a canon Adjutant office,
did not import later-era knowledge and did not invent rules or hidden state.
This passes the bounded two-turn persona/continuity/era/authority check.

![Two-turn Kerrigan roleplay acceptance](../build/ticket-23-slice-248-standard-2000-aa-live-v1/recovery-r34-scatter-replay/20260916223306152/kerrigan-checkpoint-r46/kerrigan-r46-two-turn-roleplay-acceptance.png)

The picture above is an evidence renderer using the actual model outputs,
portrait asset and r46 board. It is not claimed as an actual floating-panel HTTP
acceptance: the formal A-A server currently does not mount the Character Agent
session endpoints on the product page. That Web wiring remains open.

## Usage and cost

Formal A-A match usage through r46:

- 226 provider calls;
- 13,629,275 input units;
- 566,177 output units;
- 14,195,452 total units;
- estimated match cost: **¥30.756402**.

The previously completed H-A match cost was ¥36.496241. Formal match subtotal:
**¥67.252643**, below the user's ¥100 notification line.

Four diagnostic/roleplay HTTP-200 Character calls in this repair exposed
545,653 input and 5,834 output tokens. At the frozen peak-rate snapshot and an
illustrative USD/CNY 7.2 conversion, an all-cache-miss upper estimate is about
US$0.1707 / ¥1.23. One earlier accepted response predated diagnostic usage
capture, and HTTP-400 attempts did not return safe usage, so the provider invoice
is authoritative and the repair subtotal is not presented as exact billing.

## Acceptance and remaining work

Passed at this checkpoint:

- authoritative room remains at r46 and replay-bound;
- r46 full-unit movement is legal by bases, complete formation and board bounds;
- dice, armour, casualty ownership and activation constraints are observable;
- JSON syntax and one-level allowed-channel drift recover without widening
  server authority;
- Kerrigan two-turn persona and in-session continuity pass;
- no hidden chain of thought requested or stored; no Skill promotion attempted.

Open / blocking later closure:

1. Implement `attack_probability`, `fire_zone_exchange` and typed
   prediction→observation→calibration.
2. Mount Character Agent session/chat endpoints in the actual floating Web
   Adjutant and repeat the screenshot there.
3. Build the deferred Tavern-equivalent companion layer as one coherent
   product capability: durable/scoped conversation and relationship memory,
   character-card and worldbook orchestration, context budgeting and summary,
   import/export, recoverable sessions, and the actual floating Web panel.
   The present continuity is deliberately claimed only for one live process;
   a SQLite persistence patch alone will not close this item.
4. Continue A-A from r46 through round-2 initialization, reinforcement entry,
   scoring and terminal state.
5. Complete Slice 249 merged review/counterfactual/SkillOpt/MuZero and Slice 250
   aggregate evidence.

## Harness record

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `selfplay_agent_prompt`, `sparring_coach_prompt`
- match tools observed: room state, LegalSpace, spatial relationships,
  parameter instantiation, preview, apply and replay
- companion tools observed: `read_board_state`, `read_character_worldbook`
- memory evidence: accepted turn 1 is present in turn 2's bounded conversation
  node; no persistent promotion and no claim of Tavern-equivalent memory
- `trainingTraceCandidates`: 0
- rollback: disable the Character package on rights/era/hidden-state/rule
  hallucination failure; reject forbidden channels; never let persona override
  Rules, Preview, Apply or Replay
- `trainingTruth`: false
