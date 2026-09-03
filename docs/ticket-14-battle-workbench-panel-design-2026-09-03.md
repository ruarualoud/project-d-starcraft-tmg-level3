# Ticket 14 — battle workbench panel design

Date: 2026-09-03
Status: implemented; Slices 137–141 and 143 complete. Slice 142 is build-ready
with physical-device acceptance deferred.
Source refresh: not performed

## Outcome

The authoritative battlefield now implements the planned tabletop battle
workbench: scale-safe model/map rendering; unit, upgrade, scenario, deployment,
reserve, score and rules inspection; multi-mode rules-projected threat;
rules-bound probability; complete current-FAQ Token/Marker classification; and
the authoritative write sheet. All writes remain
LegalSpace → Preview → explicit human confirmation → Apply → Receipt/Replay.

Recovered legacy screens are visual/reference material only. Their catalogue
is intentionally empty in the mounted product and their beta probability
execution is disabled, so they are not counted as delivered authoritative
features.

## Current capability inventory

| Capability | Rules/state support | Current mounted client | Delivery verdict |
| --- | --- | --- | --- |
| Unit data, weapons, abilities and upgrades | Viewer-scoped, revision-bound BattleWorkbench projection. | Unit inspector with visibility/provenance labels. | Complete. |
| HP, shields, damage, model count and statuses | Authority owns values and all correction actions. | Read ledger plus LegalSpace-derived write sheet; no direct numeric mutation. | Complete. |
| Scenario, deployment and reserves | MatchBinding/state projection with explicit unknown/private states. | Battle status panel and reserve/deployment tray. | Complete. |
| Score and if-end-now forecast | RoomRuntime read query with exact/conditional/unknown branches. | Persistent current score, forecast and LegalSpace score proposal entry. | Complete. |
| Contextual rules quick view | Explicit current or exact historical room-pinned identities. | Unit/action/ability/keyword links; missing links stay unknown. | Complete. |
| Matchup probability | Current-rules finite-D6 query with visible coverage and assumptions. | Contextual one/many/matrix sheet; legacy beta execution remains disabled. | Complete. |
| Token/Marker display and legal actions | Current FAQ + RuleGraph + LegalSpace classify all supported lifecycle verbs. | Marker panel plus create/place/move/consume/remove proposal editors. | Complete. |
| Threat display | Rules-projected stationary, move+attack, charge, selected and aggregate regions. | Default-hidden opt-in layers with weapon/mode selection and coverage labels. | Complete. |

## Player information architecture

The Match screen keeps three top-level surfaces so the table stays visually
dominant:

1. **Battlefield** — the board plus one contextual workbench panel;
2. **Adjutant** — character dialogue, explanations and later Agent modes;
3. **Room & rules** — access, MatchBinding, complete scenario/deployment and
   room-pinned historical rules.

The Battlefield workbench has exactly six mutually exclusive panels on wide
screens and one drawer/bottom sheet on narrow screens:

| Panel | Contents |
| --- | --- |
| Unit | Selected unit's viewer-visible live characteristics, HP/shield/damage, current/starting models, statuses, installed upgrades, weapons, abilities and provenance/visibility label. |
| Actions | Current LegalSpace grouped by action family; proposal editor, sealed Preview and explicit human confirmation. |
| Threat | Rules-owned threat layers, weapon/movement mode selector, exact/partial/unknown coverage and map legend. |
| Battle status | Round/phase/active side, current score, if-end-now forecast, scenario objectives, deployment and reserve tray. |
| Markers | Every currently legal Token/Marker create/place/move/consume/remove action returned by LegalSpace, plus lifecycle/owner/source details. |
| Referee | Receipt, Replay, integrity, disputes and revalidation. |

Probability opens as a contextual sheet from Unit or Threat. It does not become
a seventh always-visible column. Scenario/deployment detail and contextual
rules links can open Room & rules without losing the selected battlefield
context.

## Deep module and authority seams

One deep `BattleWorkbenchModule` hides rule querying, viewer filtering,
revision binding, source provenance, threat geometry, probability aggregation,
score forecasting and LegalSpace action classification behind the already
mounted Client Domain Module interface. Callers still learn only
`bootstrap/read/dispatch/subscribe`; no parallel client interface is added.

The authority-side interface accepts revision-bound typed queries and returns a
single viewer-safe `BattleWorkbenchSnapshot` containing only requested
sections. Every section binds:

- room, viewer scope and state revision;
- exact MatchBinding/Rules/Data identities;
- `exact`, `partial`, `unknown` or `quarantined` coverage;
- source RuleAtom/action identifiers without exposing opponent-private state;
- world milli-inch visualization primitives where geometry is relevant;
- `trainingTruth: false` and no Provider/Skill/MuZero authority.

The existing in-memory RoomRuntime and HTTP transport are the two adapters at
the owned remote seam. Tests and Battle Lab use the in-memory adapter; Web/App
use the HTTP adapter. Selection, tab state, colors and presentation-only media
remain local implementation details and never write authority.

The deletion test for this module is intentional: removing it would force
Expo, Battle Lab, future native clients and the Adjutant to reimplement threat,
probability, score and marker semantics independently. Keeping those rules in
one module provides leverage to all callers and locality for later official
rule updates.

## Threat query denominator

Threat is not a single radius. The first complete interface must distinguish:

1. selected unit + selected weapon, stationary attack;
2. selected unit + selected weapon, move then attack;
3. selected unit charge/engagement threat;
4. one selected attacker against many candidate targets;
5. many selected attackers against one target;
6. union/heatmap of all viewer-side units;
7. union/heatmap of all visible opponent units;
8. per-layer LOS, terrain, elevation, statuses, upgrades, model-count-dependent
   movement and currently known ability modifiers.

The output may be exact geometry, bounded candidate regions, or unknown. A
printed range circle is never labelled as move-and-shoot or charge threat.
Unknown/private dependencies are not guessed.

## Probability query denominator

The estimator is a rules-bound read-only query over a frozen state revision,
not revived legacy client math. It supports one-to-one, one-to-many,
many-to-one and matrix comparison, returns exact distributions where the
ChanceTicket space is finite, and identifies every assumed action, weapon,
target, cover/status/upgrade modifier and unresolved choice. Approximation, if
added later, must disclose method, sample count and confidence separately and
cannot be training truth.

## Token and Marker correction

The Markers panel is generic and its denominator comes from the rules graph,
not from a hand-maintained list of notable units.

Slice 109 already supplies 11 primitive Token/Marker atoms: tangible Token
geometry/collision/distance, ordinary expiry, intangible Marker semantics,
Activation Markers, Faction Indicators, Mode Markers, Zone-of-Influence
Markers, First Player Marker and Cleanup retention classes. Ability-specific
placement permissions remain owned by their corresponding RuleAtoms.

For every LegalSpace entry classified as Token/Marker work, the client must
show its rule-owned verb, type, source unit/card/ability, legal subject and
target domains, placement geometry, owner/controller, duration, stack/unique
policy, trigger and cleanup timing. Unsupported or incompletely classified
actions fail closed. The client never writes Token/Marker state directly.

Optional player reminder pins may exist only as clearly labelled local notes;
they cannot resemble or alter authoritative game objects and are excluded from
Replay, scoring and training.

## Score forecast

“If the round ended now” is a server-owned read-only projection evaluated
against the exact frozen revision. It reports current score, deterministic
delta, conditional branches, unresolved player choices/chance/effects, and
whether the forecast is exact or partial. It never advances phase, consumes a
Token, rolls chance, or writes a receipt.

## Revised implementation route

Ticket 14 expands from Slices 128–138 to Slices 128–143:

- Slice 137 — **complete:** BattleWorkbenchSnapshot, six-panel shell, Unit inspector,
  scenario/deployment/reserve and current-score views;
- Slice 138 — **complete:** authoritative multi-mode threat query and map layers;
- Slice 139 — **complete:** rules-bound matchup probability query and contextual sheet;
- Slice 140 — **complete:** latest-FAQ LegalSpace-classified Token/Marker action
  palette and seven-family authoritative write sheet;
- Slice 141 — **complete:** server-owned exact/conditional/unknown score
  forecast, authoritative score Preview entry and exact room-pinned contextual
  rule lineage without compatibility fallback;
- Slice 142 — **build-ready/device-deferred:** pinned Android development and
  standalone internal-preview packages; physical Android and iOS evidence stays
  open until the final device-test batch;
- Slice 143 — **complete:** cross-surface migration/security aggregate and
  Ticket 15–18 handoff; 13/13 aggregate checks and 254 fixed assertions.

After Slice 143, Ticket 14 is `15/16`. Only the user-deferred physical-device
portion of Slice 142 remains. The FAQ was intentionally completed before
Token/Marker work so the palette and subsequent score/rules queries bind the
latest locked rules. The development source snapshot is not refreshed again
unless the user issues a new explicit refresh command.

## Closure evidence

Each capability slice must prove the same semantics through the in-memory and
HTTP adapters, Expo and Battle Lab where applicable, desktop/tablet/mobile,
viewer privacy classes, stale-revision rejection, exact/partial/unknown labels,
Replay non-mutation and no client-side authority. Token/Marker coverage must
include a generated denominator from the rule graph and report implemented,
unclassified and unsupported counts; one Apostle example cannot close it.

No source refresh, Provider call, Skill generation, DSH run, MuZero export,
self-play, memory promotion or training promotion is authorized by this design.
