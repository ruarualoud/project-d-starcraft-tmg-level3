# Ticket 11B Slice 103 — Army resource budget rules

Date: 2026-09-01
Rule vertical: 93/101
Route assignment: 11 exact atoms
Result: `804 executable / 108 review-required / 114 display-only`

## Scope closed

This slice promotes the exact route-v2 Army resource overview, Mineral and
Vespene purchase budgets, Tactical Card slot purchase, no-conversion,
unspent-resource loss, team Mineral allocation and pre-game face-up card
information group. It uses the unchanged fixed `71/69/48` official data
capture and performs no source refresh or repository fallback.

The source bundle compiles 31 Tactical Card budget profiles, 28 fieldable Unit
composition budget profiles and 171 Upgrade budget profiles from the locked
current official records. The Upgrade denominator contains 51 positive-cost,
120 zero-cost and 14 small/large-asymmetric definitions. One Tactical Card is
zero-cost and 30 have a positive Vespene cost.

## Executable behavior

- Minerals buy selected Unit compositions and selected Upgrade cost rows.
  Every cost, source record, payload and compiled budget profile is hash-bound;
  clients cannot supply costs or totals.
- Vespene buys Tactical Cards only. Each purchase reuses Slice 92's frozen
  Tactical cost, Army Slot and Unique-card behavior and Slice 102's frozen
  Faction Tag and Army Slot audit.
- The Engagement Scale Mineral limit is enforced. The Vespene limit is kept as
  an exact rational `Mineral budget × 1/10`; no unprinted rounding rule is
  invented. A Grand Offensive budget of 2,001 therefore retains a limit of
  `2001/10`, not an implicit 200 or 201.
- Mineral and Vespene overspend fail independently. Neither resource can be
  converted into the other, and every unspent amount is recorded as lost with
  zero retained.
- A complete team agreement partitions every player exactly once, proves each
  player's Rules-owned Army budget, rejects allocation above the agreed team
  total, and loses any unallocated team Minerals. Each player still chooses
  their own Army, Faction Card and Tactical Cards.
- Before play, the exact selected Faction and Tactical Card instance set is
  projected face-up and public. Hidden Faction/Tactical Cards are forbidden.
  Unit, Equipment and roster disclosure is deliberately excluded and remains
  Slice 105.
- This slice proves exact resource arithmetic. Full Unit composition/model,
  Upgrade purchase/application and fielding legality remains Slice 104; reading
  those source-bound price rows here does not claim that later legality scope.

## Runtime and relationship closure

`authority.army-resource-budget-rules-v1@1.0.0` is executor 72. It exposes
three explicit procedures—individual Army resource budget, team Mineral
budget, and Army card open information—through Pending → LegalSpace → explicit
confirmation → Apply. The action contract advances from v40 to v41 only when
the new executor is present.

Apply writes only Rules-owned `armyResourceBudgetsBySide`,
`teamMineralBudgetAgreement`, `armyCardOpenInformationBySide`, history, last
resolution and log state. Source/data identity, exact complete instance sets,
arithmetic, public projection, pending choice and action lineage are
content-hash bound. Authority replay remains Ed25519-verifiable after HMAC seal
rotation and rejects tampered receipts.

The relationship graph connects the new resource procedures to frozen Slice
92 Card purchase, Slice 93 Unit data and Slice 102 Faction/eligibility/slot
executors. It is valid at 11,387 nodes and 32,017 edges with 72/72 declared
state contracts and zero missing contracts. Historical Slice 102 and older
graph/runtime identities remain unchanged and displayable.

## Frozen identities

- Slice: `09b9cc5f7afa75e4addf2d498bc42077a490325e0d0f9e187d0a9e1ff357b49e`
- Catalogue: `ca53fb1cf5b6d3f664d8b91346b91348a7415ebaea7e7510555c7fe8e6ba89cd`
- Runtime: `f57517e0f11bb3198b021a35c95a1068aaf76613bfe6c535043a4717c5148e02`
- Relationship graph: `a9f2e6c9a7c350331b53bbab30d9ced4087e5aa0d6e34dc9e6ae618f12b4fa69`
- Data bundle: `0b612bd8fcb9341e79facdf89d702d3d57aebea82f8cf1b64fd42a8f720a33d9`

## Gates

- Slice 103 focused verifier: `52/52`
- Slice 102 adjacent historical regression: `52/52`
- Current executable runtime: `10/10`
- Ticket 11 foundation aggregate: `10/10`
- Evidence denominator: 167 base reports / 2,429 assertions; 168 reports /
  2,439 assertions including the aggregate

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play,
memory or training truth was produced.

## Next fixed slice

Slice 104 is the exact 16-atom Unit composition choice, starting model/Supply,
Unit and Upgrade Mineral cost, Upgrade rules, Specialist pair restriction and
Army-reference Unit/Upgrade field group. Its target is
`820 executable / 92 review-required / 114 display-only`; seven slices remain
after it.
