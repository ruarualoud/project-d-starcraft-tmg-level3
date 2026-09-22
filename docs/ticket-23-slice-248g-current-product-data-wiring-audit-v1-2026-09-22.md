# Ticket 23 / Slice 248g — Current-product data-wiring audit

## Outcome

The concern that the Creep failure might be part of a broader data-wiring
problem was valid. The focused audit found multiple current-runtime seams where
the source definition existed but a downstream consumer either read only one
adapter family or lost the exact source identity.

The new executable gate is
`scripts/verify-ticket-23-slice-248g-current-product-data-wiring-v1.mjs`.
It emits a machine-readable JSON report and makes any Critical/High wiring
finding fail the command.

Current result:

- official definitions: `252/252`;
- unique execution owners: `252/252`;
- runtime source instances: `256` (the extra four are legitimate selected-card
  or selected-unit instances; source definitions remain one-to-one);
- semantic duplicate groups: `37`;
- cross-adapter equivalent groups: `8`, all explicitly registered;
- selected Room units: `15`, covering `12` record keys;
- missing Supply profiles: `0`;
- current model-count/Supply mismatches: `0`;
- missing combat profiles: `0`;
- duplicate Unit, model, or card-instance identifiers: `0`;
- public card/resource identity mismatches: `0`;
- Provider calls and cost: `0 / ¥0`.

## Defects fixed

1. Live Skill routing used a hard-coded `Zerg Swarm` identity while the Room
   authority exposed `Kerrigan's Swarm`. Skill selection now derives both
   factions from the public authoritative roster and resolves one general, one
   own-faction, and one directed matchup Skill per seat.
2. `publicRosterDisclosureBySide` was omitted from the compact Agent Room
   projection. Public faction/tactical cards now reach the Agent and Skill
   retrieval without exposing private resources.
3. The selected-roster ON CREEP query recognized only Omega Worm while the
   battlefield adapter also recognized Creep Tumors. Both consumers now use one
   canonical base-aware current-product fact.
4. `Living Glob of Tissue` and `Creep Removal` were split between selected-card
   and battlefield-family bundles. Stay-in-play/displacement and enemy-action
   removal now resolve through explicit side capabilities; Accelerating Creep
   is proven to remove a nearby Tumor after an enemy Move.
5. Kerrigan's Commander bonus used an untyped legacy fallback. The numeric
   bonus worked but its exact definition ID disappeared. All Commander variants
   now resolve through a canonical piece capability and preserve lineage.
6. The army builder hard-coded Kerrigan's faction and two Creep card record
   keys. It now compiles the “select exactly one … Card” group from the current
   official faction ability text and derives candidate cards from current
   official card names. Both Zerg Swarm and Kerrigan's Swarm are covered.

## Cross-adapter semantic groups

| Group | Consumer policy |
| --- | --- |
| Adrenal Overload | record-scoped effect, shared attack consumer |
| Commander | canonical piece capability projection |
| Creep Removal | canonical side capability projection |
| Living Glob of Tissue | canonical side capability projection |
| Raptor Strain | shared fielded-feature spatial consumer |
| Squadron | shared fielded-feature coherency consumer |
| Stimpack | record-scoped effect, shared modifier consumers |
| Zerg Creep | source-derived army-building selection contract |

Any new unregistered cross-adapter semantic split is a High finding. Equivalent
source definitions are not silently deduplicated: they retain separate
definition IDs and hashes, while semantic aliases are resolved only at the
consumer capability layer.

## Validation boundary

Only the focused Slice 248g gate was run after each relevant change. It creates
a fresh Standard-2000 Room without calling a model, verifies Room authority,
Rules consumers, spatial observation, Agent projection, Skill retrieval and
faction routing, then exits. No full suite, source refresh, model request, live
Room mutation, Skill promotion, memory promotion or training-data promotion was
performed.

The new adapter/factory versions intentionally require a fresh fork/replay under
the current contracts; the old r14 state must not be resumed as high-strategy
evidence.
