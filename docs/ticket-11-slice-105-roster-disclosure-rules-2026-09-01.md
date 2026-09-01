# Ticket 11B Slice 105 — Roster visibility and equipment disclosure rules

Date: 2026-09-01
Rule vertical: 95/101
Route-v2 assignment: 13 atoms
Source refresh: not performed

## Outcome

Slice 105 promotes the exact team-roster, open/closed-list, equipment
representation, disclosure and on-table inspection group. The catalogue advances
from `820/92/114` to `833/79/114`, uses 74 declared state-contract executors,
and advances the current action schema from `hybrid_legal_space_v42` to
`hybrid_legal_space_v43`.

The executable procedures are:

1. `roster_registry_audit`: bind every player to one independently built army
   roster, including team, faction, Tactical Cards, Units, models and equipment.
2. `closed_list_agreement_submission`: record each player's own consent without
   allowing a proxy decision.
3. `roster_visibility_resolution`: apply a verified tournament override when
   present; otherwise use open lists unless every player agrees to closed lists.
4. `unit_equipment_deployment_disclosure`: derive each model's expected default
   and purchased equipment and require every non-represented item to be disclosed
   when the Unit deploys.
5. `equipment_relevant_action_reminder`: bind the required reminder to the exact
   next action contract before that action may execute.
6. `on_table_unit_inspection`: expose a deployed Unit Card and its associated
   Tactical Cards when another player exercises the inspection right.

The full authoritative roster registry remains private runtime state. A viewer
receives its own team's complete rosters plus a public projection. Faction and
Tactical Cards remain face up even in closed-list mode; deployed Units expose
their selected Upgrades and weapon swaps; an inspection exposes the on-table
Unit Card and associated Tactical Cards. Open-list mode exposes complete rosters.
Pending closed-list decisions, opposing candidate rosters and private conduct
incidents are not leaked through room projections.

## Fixed official denominator

The development-tranche capture remains unchanged and pinned to:

- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Part 9 record source: `8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282`
- Part 9 record payload: `3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a`

The bundle binds the exact Core sections 9.1.8, 9.1.10 and 9.1.11, 22
inspectable current Unit-card profiles, 41 source-derived default-equipment
profiles, and the frozen Slice 104 denominator of 52 purchasable Upgrades. It
does not refresh or silently reinterpret the official capture.

The executable policy is:

- each team member owns an independent roster and may use the same or a different
  Race from teammates;
- a verified tournament rules-pack visibility override takes precedence;
- without an override, lists are open unless every player independently agrees
  to closed lists;
- Faction Cards and Tactical Cards are always visible and inspectable;
- a deployed Unit immediately exposes its Upgrades and weapon swaps;
- players may inspect an on-table Unit Card and its associated Tactical Cards;
- equipment should be represented accurately where possible;
- every non-represented loadout item is disclosed at deployment and repeated
  before a relevant action;
- failure to disclose is classified as unsportsmanlike conduct.

Tournament overrides require a verified artifact identity, including content
hash, verification-receipt hash, organizer key identifier and successful
signature verification. Client-authored visibility truth is rejected.

## Equipment and action boundary

Expected equipment is derived per model from the official default Unit-card
weapons plus the selected Slice 104 Upgrades and replacement links. A missing
deployment disclosure blocks deployment. When any equipment is not physically
represented, the conservative runtime boundary requires a reminder permit for
each relevant Unit action. The permit is bound to the exact action-contract
hash and cannot authorize a different action. The disclosure/reminder procedure
itself remains callable so a player can satisfy the gate.

This slice certifies disclosure and inspection behavior; it does not pretend to
recognize physical miniatures from images or execute arbitrary equipment effects.

## Atom assignment

The exact route atoms are:

- `rule-atom:closed-list-faction-and-tactical-card-visibility`
- `rule-atom:singleton:core-9-1-10-closed-list-agreement:3a2b6a1daafa`
- `rule-atom:singleton:core-9-1-10-closed-list-roster-secrecy:de47ad1eb2f1`
- `rule-atom:singleton:core-9-1-10-default-open-list-disclosure:5afe0eff433e`
- `rule-atom:singleton:core-9-1-10-deployed-unit-upgrade-disclosure:bd72883d19b4`
- `rule-atom:singleton:core-9-1-10-on-table-unit-inspection-right:271479053551`
- `rule-atom:singleton:core-9-1-10-tournament-roster-visibility-override:f41a3117b826`
- `rule-atom:singleton:core-9-1-11-accurate-equipment-modelling:696f66138b23`
- `rule-atom:singleton:core-9-1-11-full-equipment-knowledge:32e46eafb231`
- `rule-atom:singleton:core-9-1-11-nondisclosure-unsportsmanlike:ce3b2e1afb19`
- `rule-atom:singleton:core-9-1-11-nonrepresented-loadout-deployment-disclosure:674f84f8ffcd`
- `rule-atom:singleton:core-9-1-11-relevant-action-reminder:ef019e037df7`
- `rule-atom:singleton:core-9-1-8-independent-team-rosters:1acaaaa5e34f`

Route-v2 hash remains
`3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`.

## Frozen identities and evidence

- data bundle: `dd59c745ba08ff1bff9fb45eb7d237588a1dd8ccd553512a9d0a55acf1301fbd`
- slice: `601e7bfb22b32d0416b7ab2993c422faf6ed535239e1d7f50a77b2745fae9383`
- catalogue: `ef74fdd21eb7f5a59a257f3562ca801cd330d331f9634f592a945ffaa97b7494`
- runtime: `82e6a48ff5531fd0b67821195d02a522210db3b4d5d343e94236b620773bd3ba`
- relationship graph: `c3c4d7e794e6bca65e93cd3cdc7ea44eb93d900526556186052c345486d96d71`
- graph size: 11,635 nodes / 32,472 edges

Gates:

- Slice 105 focused: `64/64`
- frozen Slice 104 regression: `56/56`
- current executable runtime: `10/10`
- aggregate: `10/10`
- authoritative room: all 7 checks passed
- HTTP adapter: all 4 checks passed
- evidence denominator: 169 base reports / 2,549 assertions; including the
  aggregate, 170 reports / 2,559 assertions

Receipts retain content hashes, Ed25519 permanent signatures and HMAC short
seals. Signed replay passes after HMAC rotation and rejects tampering. Slice 104
and every earlier executor, hash and display-only rule remain frozen/readable.

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slices 106–111 contain six slices and 79 actionable atoms. Slice 106 owns the
next 21 atoms: Mission/Deployment Card contracts, colour/control choice, draft
order, elimination and final selection. Its target is `854/58/114`.
