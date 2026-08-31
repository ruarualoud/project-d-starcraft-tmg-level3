# Ticket 11B Slice 85 — elevation and Effective Size

## Outcome

Slice 85 adds `authority.elevation-effective-size-rules-v1@1.0.0` and promotes ten, not fifteen, current review-required RuleAtoms. The corrected ledger is:

- `578` executable;
- `334` review-required;
- `114` retained display-only;
- `54/54` declared executor state contracts complete;
- `26` planned slices remain, with five atoms still requiring explicit route reassignment before Slice 86 starts.

The original route double-counted five canonical Flying-cover atoms already promoted in Slice 83. They are now declared dependencies of the Slice 85 action/executor lineage and relationship graph, but are not re-promoted.

## Exact new denominator

The ten newly executable atoms are:

1. `rule-atom:elevated-model-adds-supporting-terrain-size`
2. `rule-atom:high-ground-effective-size`
3. `rule-atom:mid-ground-effective-size`
4. `rule-atom:singleton:core-11-effective-size-formula:b6981ada2b47`
5. `rule-atom:singleton:core-11-stacked-terrain-effective-size:9d27f6a2d0bc`
6. `rule-atom:singleton:core-4-1-elevation-distance:1facd32e1170`
7. `rule-atom:singleton:core-7-1-2-model-effective-size:df67a1153986`
8. `rule-atom:singleton:core-7-1-3-high-ground-evade:0711eafb82c1`
9. `rule-atom:singleton:core-7-1-3-lower-elevation-origin:8ec28e91b388`
10. `rule-atom:stacked-terrain-effective-size`

The five reused Slice 83 atoms are the canonical Flying effective-Size, Full/Direct Cover, high-ground prohibition, composite LoS/Cover, and retained Direct Cover/Dead Zone rules. The focused Judge proves each was executable in the Slice 84 input catalogue before Slice 85 was built.

## Executable behavior

The kernel exposes three Rules-owned procedures:

- `effective_size_check` evaluates either a model or terrain piece;
- `horizontal_elevation_distance_check` measures nearest round-base edges from the top-down projection and contributes no vertical height;
- `elevated_line_of_sight_check` resolves stacked Effective Size, Full/Direct Cover, elevation Dead Zone, Close Quarters, lower-elevation attack origin, high-ground Evade, and Flying-cover interaction.

Terrain stacking is a content-hashed Battlefield Setup agreement with a complete support-relation denominator. Each terrain piece has at most one direct support; every support must exist, have a standable horizontal surface, physically overlap the supported footprint, and form an acyclic graph. Terrain Effective Size is its printed Size plus the complete recursive support chain. A non-Flying model adds the Effective Size of its direct supporting terrain; a model without support uses printed Size only. Ground, Mid Ground, and High Ground are derived from support Size and a conflicting client elevation label fails closed.

The Slice 84 terrain/LoS source stays frozen. Slice 85 removes verified supporting horizontal surfaces only in an explicit geometry projection, consumes Slice 84's barrier/opening/proximity proof, and then recomputes cover with effective Sizes. The projection hash, inherited result hash, and `priorExecutorSourceMutationAllowed=false` are in the result. Diagonal/complex traces that Slice 84 cannot certify still fail closed.

Flying cover invokes the frozen Slice 83 kernel. Official Point Defense Drone has null printed Size, so a receipt-visible current-profile substitution is used only to pass Slice 84's pre-geometry profile check; its printed Size never enters cover and its actual effective Size remains `higher_than_every_terrain`. Flying ignores Full Cover and high-ground Evade, while Direct Cover and Dead Zone for the non-Flying participant remain.

## Source and authority boundary

No source refresh occurred. The slice remains pinned to:

- source lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`;
- source snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`;
- normalized dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`;
- official versions `71/69/48`;
- Core PDF `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`.

Repository fallback remains forbidden. Preview → Confirm → Apply uses content-bound choices, Ed25519 receipts replay after HMAC seal rotation, tampering fails signature verification, and the old rules display remains available. Source, terrain, support graph, model position/support, choice, or MatchBinding geometry drift invalidates the pending LegalSpace.

## Verification

- focused Slice 85 Judge: `30/30`;
- current runtime gate: `10/10`;
- Ticket 11 aggregate: `10/10`;
- cumulative evidence: `149` reports / `1,634` assertions;
- relationship graph: `9,526` nodes / `28,591` edges;
- slice: `dc981da46cbae384449dbc9bf3213775a5fbd18a2b016ec4f9fa6a05994eae81`;
- catalogue: `216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f`;
- runtime: `52229d04183d64ce4fe34e79cf51e4275cc6c905ab4603b057c5c29b08c348e3`;
- graph: `af362cb2997a1bbc5b4790794a2434aa3e86a2df646671d7a9b4f3961d485ea0`.

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory, or training truth was produced. Grass, Impassable Terrain, Ramps, and Access Points remain Slice 86; arbitrary model/base shapes remain Slice 87. The subsequent route-v2 audit assigned all `334/334` review-required atoms exactly once and closed the five-atom planning debt before Slice 86 implementation; see `docs/ticket-11-slices-86-111-route-v2-audit-2026-09-01.md`.
