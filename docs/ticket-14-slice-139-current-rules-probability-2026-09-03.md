# Ticket 14 Slice 139 — current-rules matchup probability

Date: 2026-09-03
Status: complete
Source refresh: not performed

The BattleWorkbench now projects one-to-one, one-to-many, many-to-one and matrix
matchups for current visible battlefield units and compatible weapons. Every
row is bound to room, state revision/hash and MatchBinding, and carries the
exact finite D6 distribution for its declared Hit, Rate of Attack, Surge,
Armour and Damage inputs plus ChanceTicket dice lineage.

Mathematical and rules coverage are distinct. The finite distribution is exact
for supported profiles, while unexecuted weapon keywords, statuses and
multi-model damage allocation keep the overall rules result partial. Casualty
probability is only reported when the currently visible target state makes the
threshold unambiguous. Every assumption and unresolved dependency is visible.

Expo opens probability as a contextual sheet from Unit or Threat; Battle Lab
shows the same rows. It is not a seventh workbench panel. The recovered beta
calculator remains disabled. The query neither rolls ChanceTickets nor writes
state and is not training truth.

Focused verification passed 8/8, Slice 138 regression 9/9 and Expo TypeScript.
Ticket 14 is 12/16; Slice 140 is next.
