# Ticket 11B Slice 106 — Mission and Deployment Card draft rules

Date: 2026-09-01
Rule vertical: 96/101
Route-v2 assignment: 21 atoms
Source refresh: not performed

## Outcome

Slice 106 promotes the exact Mission/Deployment Card contract and pregame draft
group. The catalogue advances from `833/79/114` to `854/58/114`, with 75
declared state-contract executors and action schema
`hybrid_legal_space_v44`.

`authority.mission-deployment-draft-rules-v1@1.0.0` executes:

1. each participant submitting exactly two distinct Mission Cards and two
   distinct Deployment Cards for the agreed engagement scale;
2. four Mission and four Deployment occurrences becoming face up, while the
   same card submitted by opponents remains two distinct occurrences;
3. an Authority-owned 2d6 roll-off for each participant, with a fresh roll-off
   after a tie;
4. the winner choosing player colour and then either Mission- or
   Deployment-draft control, with the opponent controlling the other draft;
5. the non-controller eliminating two cards and the controller selecting one,
   first for Mission and then for Deployment;
6. a content-hash-sealed final binding for the selected card records, colours,
   draft receipts and marker affinities.

Each Standard or Skirmish participant has exactly
`C(5,2) × C(5,2) = 100` source-derived input choices. Every later stage exposes
only the choices owned by that stage's actor. Enumerate, instantiate and apply
all bind the same seat identity and stale choice/state hashes fail closed.

## Fixed official denominator

The unchanged development source lock is:

- lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- Terran P2P: `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`

The bundle binds Core sections 5.5, 5.6, 9.2, 9.2.1 and 12.1, all 10 current
Mission profiles and all 10 current Deployment profiles: five Standard and
five Skirmish of each kind. No current Grand Offensive card set exists in the
sealed denominator, so that scale fails closed rather than inventing cards.

The selected Mission's pacing/scoring/additional-condition fields and the
selected Deployment's field contract are bound, but arbitrary Mission effects
are not claimed executable. Deployment geometry is deliberately not
materialized here: dimensions, entry edges, influence zones and marker
coordinates remain Slice 107 authority. The draft binding therefore remains
ineligible for a production room until that boundary closes.

## Frozen identities and evidence

- data bundle: `2f028e0e9f34ec87c5da06f24ea027e17d433ad546f3e344de268bb79fb254d9`
- Mission index: `a25110638ff2beef6eddc04670eca54e16aff53af8afbbbe1e6c253ea1c33fa8`
- Deployment index: `25405463525eae5aae2fd9fe6a6c862141736224003013c9660afce4c0475383`
- slice: `760a20172d419c4eb6fa1be22cce144df01e82245ef908aaceef23992167525e`
- catalogue: `1fb1753f9d8e09faeaa769774906777df16a7a0c90320f383784efc4ff4c2f8b`
- runtime: `d6beaea09a6426c523ae9d35ac1c83824fce26288f9ea257b32d92a1d1fcf23b`
- relationship graph: `b854b730a40034775de5ae21192c40a632dcdc4c68a53b6f0b858178af6a98d1`
- graph size: 11,796 nodes / 32,744 edges

Focused verification passes `70/70`, including source/atom identity, complete
finite domains, duplicate and scale rejection, tied roll-off retry, exact actor
gates, the complete runtime trace, room projection, graph negative-gap
injection, HMAC preview sealing, Ed25519 apply receipts, replay after HMAC
rotation and tamper rejection. Slice 105 remains frozen and readable.

Gates:

- Slice 106 focused: `70/70`
- frozen Slice 105 regression: `64/64`
- current executable runtime: `10/10`
- Ticket 11 aggregate: `10/10`
- authoritative transition: all 7 checks passed
- authoritative room: all 7 checks passed
- evidence denominator: 170 base reports / 2,619 assertions; including the
  aggregate, 171 reports / 2,629 assertions

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slices 107–111 contain five slices and 58 actionable atoms. Slice 107 owns the
next 12 atoms: battlefield dimensions, entry edges, zones of influence,
mission-marker coordinates/elevation and two official FAQ constraints. Its
target is `866/46/114`.
