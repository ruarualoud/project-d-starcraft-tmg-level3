# Ticket 11B Slice 79 — Attack-pool edge cases

Slice 79 promotes 13 current `review_required` atoms and advances the ledger to `493/419/114`.

## Route correction

The roadmap originally counted all four Long Range atoms as new in this slice. Three—maximum range, normal-profile band, and the long-range Hit penalty—were already executable through `authority.ranged-attack-v2`. Re-promoting them would corrupt the denominator. The corrected slice keeps the one unfinished mixed-band atom and adds three previously unassigned attack-pool atoms that belong to the same source procedure: the three-pool overview, Armour-roll bypass, and Surge-type mismatch. The slice still promotes exactly 13 distinct current review atoms.

## Executable behavior

`authority.attack-pool-edge-v1@1.0.0` provides a rules-owned conformance procedure for:

- controller selection of the exact dice removed by a reducing Special Ability;
- separate roll groups for different Hit modifiers and Standard/Long Range dice in one Batch;
- Standard range target numbers and the Long Range `-1` Hit modifier;
- Surge-type mismatch discard and matching-Surge Armour bypass;
- `HITS X (Y)` automatic Armour Pool dice, Damage `Y`, and no Surge;
- Attack → Armour → Damage pool ordering;
- `TOUGH (X)` conversion of up to X failed Armour results into discarded successes;
- `CONCENTRATED FIRE (X)` and unengaged Visible-model casualty caps, with excess Total Damage discarded.

Pending, state, selection, or source drift fails closed. Preview → Confirm → Apply is signed with Ed25519; replay survives HMAC rotation and rejects tampering.

## Evidence

- focused Judge `18/18`;
- current runtime `10/10`;
- aggregate `10/10`;
- cumulative `143` reports / `1,481` assertions;
- strict executor state contracts `48/48`;
- graph `8,878` nodes / `27,552` edges;
- slice `679832d4d10faf9db077d37bc826f29e60c05e5dd878e85a39ba679af4611e34`;
- catalogue `6fe9dc881b2fe1eacd0727f4fe2963601866129d4f28009840f37eb23b0220cd`;
- runtime `d41ec7a6957bed16acf24e6132cf18e45a41bf8e8bccde98813b5c892d472013`;
- graph `ce215ca1e02a93254c19fd988a0ac1352cd06d9fbe703b67d0af7733a08567c6`.

The source lock was not refreshed. No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced.
