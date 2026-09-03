# Ticket 14 Slice 138 — multi-mode authoritative threat

Date: 2026-09-03
Status: complete
Source refresh: not performed

The server-side BattleWorkbench projector now emits hash-, MatchBinding- and
state-revision-bound threat layers for stationary fire, move plus fire,
charge/engagement, per-weapon selection, one attacker to many targets, many
attackers to one target, and friendly/enemy aggregate display. Expo and Battle
Lab render the same milli-inch regions and selectors.

Split speed is selected from current model count: multi-model `4/7` and `4/8`
profiles use 4 inches, while their one-model branches use 7 or 8 inches. The
selected branch and its RuleAtom references are visible in the query output.

These regions are bounded candidates, not legal-action answers. Printed range,
current model count and visible model/base geometry are exact inputs. LOS,
terrain, elevation, target base radius, status/upgrade activation and charge
chance remain target/action-specific, so coverage is `partial` and exact
legality stays with Preview. The read query never rolls a die or writes state.

Verification passed 9/9 plus the Slice 137 10/10 regression and Expo TypeScript.
Ticket 14 is 11/16; Slice 139 is next.
