# Ticket 14 Slice 137 — authoritative battle-workbench read model

Date: 2026-09-03
Status: complete
Source refresh: not performed

## Outcome

Expo and Battle Lab now consume one viewer-scoped, state-revision and
MatchBinding-bound `BattleWorkbenchSnapshot` through the existing Client Domain
`bootstrap/read/dispatch/subscribe` interface. Both surfaces expose the same six
player panels: Unit, Actions, Threat, Battle status, Markers and Referee.

The completed sections expose live unit/model count, damage and remaining
durability where calculable, status, selected upgrades, weapons and abilities;
scenario/map identity, deployment, battlefield/reserve/undeployed/destroyed
buckets; and current score. Missing data is explicit, and the next four query
sections report `not_loaded` rather than invoking legacy client calculations.

## Authority and write-sheet boundary

The snapshot is read-only. Workbench edits such as damage, shield, casualties,
status, deployment, score and Token/Marker changes must be classified from the
current LegalSpace and use the existing Preview → human confirmation → Apply →
Receipt/Replay path. No panel may write a number directly. Slices 140–141 mount
the complete Token/Marker and score write surfaces; Slice 143 closes a generated
denominator proving each supported write-sheet field has an authoritative action
or an explicit unsupported reason.

## Public project media authorization

The existing sourced StarCraft portrait animations and unit cues have a new
`public_user_authorized` project channel, following the user's explicit
authorization on 2026-09-03. Original provenance remains recorded. This is not
represented as an independent license or third-party rights review; the policy
states both facts explicitly. Missing original media continues to use generated
fallback art. Classic BGM is still not bundled and remains user-selected local
audio.

## Verification

- Slice verifier: 10/10.
- Battle Lab regression: 23/23.
- Client Domain regression: 17/17.
- Expo TypeScript: zero errors.
- Snapshot tampering, stale binding and public-observer LegalSpace leakage fail
  closed.
- No source refresh, Provider call, Skill generation, DSH, MuZero, self-play or
  training promotion occurred.

Ticket 14 is now 10/16. Slice 138 is next and owns current-rules multi-mode
threat queries and map layers.
