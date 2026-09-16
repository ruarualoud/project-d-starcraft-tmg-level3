# Ticket 24 / Slice 254 — two-layer map compiler

Date: 2026-09-16

## Outcome

The competitive-map catalogue now compiles a classic-map seed into two independent
layers:

- `artLayer` preserves or hides every reviewed source motif and is always display-only;
- `rulesLayer` contains exact TMG terrain footprints and is non-authoritative until the
  selected room's Deployment Binding passes the existing official terrain certifier.

All 166 source elements across the twenty seeds have an explicit selection receipt.
Art retention is independent of Rules disposition. A Rules element may be automatic,
explicitly enabled, or disabled, and may use any mode permitted by its topology record.
The current modes are blocking, passable/difficult, standable high ground, Grass sight
terrain, cover, and visual-only.

## Variable battlefield sizes

The compiler does not assume one fixed battlefield. It consumes the scale assignment from
Slice 253:

| Engagement scale | Battlefield | Default pieces | Catalogue maps |
| --- | --- | ---: | ---: |
| Skirmish | 36×36 inches | 7 | 6 |
| Standard | 54×36 inches | 9 | 9 |
| Grand Offensive | 72×36 inches | 13 | 5 |

The defaults are exact integer points inside the official area-scaled guidance:

- Skirmish: Size 1 = 2, Size 2 = 4, Size 3+ = 1, Grass = 3;
- Standard: Size 1 = 2, Size 2 = 6, Size 3+ = 1, Grass = 4;
- Grand Offensive: Size 1 = 3, Size 2 = 8, Size 3+ = 2, Grass = 6.

When the selected source motifs do not fill a required category, the compiler adds named,
visible neutral TMG compensating pieces. It never silently promotes a background motif into
Rules authority. Explicit user choices that exceed an official target produce typed
diagnostics and cannot be mislabeled as an official recipe.

The current official card bundle has exact mission/deployment geometry for Skirmish and
Standard. Grand Offensive retains the exact 72×36 scale and a valid preview recipe, but is
explicitly ineligible for room certification until equivalent task geometry exists.

## Passability semantics

Current official TMG terrain has no separate difficult-movement surcharge. Therefore a
source element selected as `passable_difficult` compiles to ordinary Size 1 passable cover
and emits a warning. It does not invent a movement penalty. `blocking` compiles to ordinary
Size 2 terrain, which blocks movement unless an official opening exists. Visual-only has no
Rules object.

## Room binding and freeze

Compilation is deterministic from `adapterHash + seedId + element selections`. The preview
plan deliberately has no player confirmations or fire lanes, because a classic-map axis is
not a Deployment Card Entry Edge.

At room creation, `certifyAndFreezeOfficialCompetitiveMapForRoomV1`:

1. verifies that the room scale and battlefield match the compiled seed;
2. binds red/blue placement history and both participant confirmations;
3. samples the actual opposing Entry Edge segments and selects two distinct clear
   six-inch fire lanes against the exact compiled terrain;
4. runs `certifyOfficialBalancedTerrainSetupV1` with the selected Deployment Binding;
5. freezes compilation, setup-plan, certificate, binding, art visibility, and Rules layer
   hashes into one immutable room receipt.

Changing the task, element modes, visibility, or seed therefore creates a new compilation
and room freeze. Background pixels never change movement, LoS, engagement, objectives, or
replay.

## Focused verification

The all-map compiler gate passed after correcting one Grand Offensive slot overlap:

- 20/20 maps compiled deterministically with 20 distinct compilation hashes;
- scale counts are 6 Skirmish / 9 Standard / 5 Grand Offensive;
- 166/166 source elements have selection receipts;
- all twenty default recipes meet their scale targets;
- 15 Skirmish/Standard recipes are room-certification eligible;
- all five Grand Offensive recipes remain explicitly deferred.

A separate directly affected room-binding gate used the existing Standard-2000 Factory and
the Lost Temple seed. It produced nine pieces, derived two fire lanes from the real
Deployment Binding, and passed the existing terrain certifier:

- certificate hash `5669f0b85e563c7f8fbbbe2a930b926fd11a32d05b55e227b09abf8fb78212a9`;
- room-freeze hash `a075f25112bc12e83985fed218100e60bdccc2d9cfadc3756fc1fa559c2a8a58`;
- `balancedTerrainCertified=true`;
- `authoritativeTerrainLayer=true`;
- `backgroundRulesAuthority=false`.

No Provider, image-generation, gameplay-source refresh, training, or promotion call ran in
this slice. Added cost is zero.
