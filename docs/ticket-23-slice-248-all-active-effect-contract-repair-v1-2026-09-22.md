# Ticket 23 / Slice 248 — all-active effect contract repair

## Defect evidence

After the corrected Ventral Sacs action at revision 8, revision 9 selected the
Rules-legal `Omega Network / omega_network` candidate but described it as a
Faction Indicator plus End-of-Round reserve-deploy beacon. Revision 9 remains
non-training defect evidence and must not be continued.

The preceding repair covered coordinate battlefield assets but did not require
every other executable active-ability adapter to publish an effect contract.
That gap let a name-correct Omega Network action borrow another family's effect.

## Adapter-owned contract

`official-selected-roster-ability-runtime-v1` now compiles a Rules-owned
`starcraft_tmg_selected_action_effect_contract_v1` for all eleven currently
supported active effect kinds. Each contract binds the official source text,
target kind, expiry, result kind/asset and exact immediate or ongoing effect.
Adding an executable effect without a contract fails closed during enumeration.

Omega Network now explicitly means:

- set an Omega Worm on Ground Level more than 10 inches from Enemy models;
- the Worm is a non-contesting Structure and Source of Creep;
- from a later round its base is an Entry Edge for Ground reserves whose
  combined Supply is at most 2 per round;
- it is not a Faction Indicator or End-of-Round reserve-deploy beacon.

The Decision Port projects the adapter contract into selected-action identity,
supplies the complete contract to Planner and Action, and rejects cross-family
effect claims. Historical coordinate-domain contracts remain as a compatibility
fallback; new adapter output is authoritative.

The first live retry proved that compiling the contract was not sufficient:
the generic LegalSpace-to-Spatial-Action projection omitted the new field, so
the real selected identity still showed `effectContract: null`. The projection
now carries the immutable contract, and the compact Planning action index also
includes it. The verifier constructs a legal domain and sends it through this
real projection instead of injecting an already-projected test object.

## Focused verification

The existing selected-action identity gate gained the exact revision-9 shape:
Omega Network named correctly while its effect prose claimed a Faction
Indicator and End-of-Round Ground Reserve deployment. It failed before the
semantic contract repair (`consistent`) and passed once after it (`contradicted`,
five effect contradictions). The live retry then exposed the omitted projection;
the same test failed again only after it was upgraded to use the real projection,
and passed once after that projection was repaired. Existing Creep/Ventral Sacs
positive and negative cases remain green. Provider calls, reported tokens and
cost for all focused gates: `0 / 0 / ¥0`.

The Adapter changed separately from the Decision Port and is not imported by
that semantic gate, so its file received one syntax check. No other gate ran.

## Continuation

Fork the formal branch through corrected revision 8. Two revision-9 attempts
remain non-training evidence: the original missing adapter contract and the
later transport omission. The regenerated action may
choose Omega Network, but if it does, its plan and reason must describe the
Omega Worm and Entry-Edge/Supply contract. A different legal choice remains
valid if its own Rules contract and strategy evidence are accurate.
