# Ticket 11B Slice 80 — Close Combat lifecycle

Slice 80 promotes the exact eight remaining Close Combat lifecycle atoms and advances the ledger from `493/419/114` to `501/411/114`.

## Executable behavior

`authority.close-combat-lifecycle-v1@1.0.0` adds a Rules-owned parameter domain over every eligible engaged Enemy Unit. It executes:

- Melee range `E` as the official one-inch Engagement Range;
- per-target Fighting Rank and direct Base-to-Base Supporting Rank eligibility, so an attacker engaged with any number of Enemy Units receives every legal target without a UI slot cap;
- Surge matching against the selected target Unit's Combat Tags;
- Close Combat Evade only when an explicit Special Ability or keyword grants it;
- removal of the acting Unit's Activation Marker after its Close Combat Attack fully resolves;
- post-casualty recomputation of the authoritative engagement graph;
- immediate Unengaged state for every surviving Unit that loses its last Enemy engagement;
- round-scoped effective Combat Phase Pass for a freed Unit that had not Activated, while preserving the printed Reaction/specific-trigger exception and its normal eligibility from the next Round.

The current production carrier remains quarantined because this is a bounded official procedure-conformance executor, not a claim that all current Unit profiles, casualty choices, terrain interactions, or UI paths are production-complete. Pending, source, target, piece, or geometry drift fails closed. The stale projection includes only Rules-relevant combat geometry, so Authority-added display defaults cannot invalidate an otherwise identical action.

## Evidence

- focused Judge `20/20`;
- current runtime `10/10`;
- aggregate `10/10`;
- cumulative `144` reports / `1,501` assertions;
- strict executor state contracts `49/49`;
- graph `8,944` nodes / `27,655` edges;
- slice `72419eee486fe03bc11e7391cb63d5e7fc7f06ba6e02de1d80ab2487119a4f85`;
- catalogue `00108a2738d7b20edd5b9848edb7a080d1d328fab96e072dda477c8a3e05628f`;
- runtime `c860bc9305abbdc615e8d4aab6b6a23ad54624f5effbe42863756f1b911cf270`;
- graph `9e9a9c0f879cc196abc3de87cab59a6c47395c096cfb04f8244f1f593f85fb0a`.

Authority Preview → Confirm → Apply is content-bound and signed with Ed25519; replay passes after HMAC seal rotation and rejects tampering. Historical Slice 79 remains frozen and its old rules display remains available.

The fixed official source lock was not refreshed. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced. Slices 81–111 remain: `31` planned slices and `411` actionable atoms.
