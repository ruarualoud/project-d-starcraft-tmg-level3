# Ticket 11B Slice 107 — Deployment geometry rules

Date: 2026-09-01
Rule vertical: 97/101
Route-v2 assignment: 12 atoms
Source refresh: not performed

## Outcome

Slice 107 promotes the exact battlefield-dimension, Entry Edge, Zone of
Influence, Mission Marker target and FAQ setup group. The catalogue advances
from `854/58/114` to `866/46/114`, with 76 declared state-contract executors
and action schema `hybrid_legal_space_v45`.

`authority.deployment-geometry-rules-v1@1.0.0` consumes the completed Slice
106 draft binding and materializes one Rules-owned geometry binding for the
selected Deployment Card. The binding contains:

1. the exact Standard `54×36` or Skirmish `36×36` battlefield dimensions;
2. every red and blue Entry Edge segment and its six-inch Zone of Influence;
3. exact Mission Marker coordinate targets from all ten current Deployment
   Cards;
4. the Core setup sequence: dimensions, Entry Edges, Zone markers, terrain,
   then Mission Markers;
5. a complete game-start terrain-height ledger contract and a post-terrain
   Mission Marker placement verifier.

Skirmish cards define Mission Markers `1`, `2` and `5`, not an invented
continuous `1–5` set. Standard cards define all five markers. Mission Marker
targets are materialized now, but physical placement and their derived
ground/mid/high support remain pending until Slice 108 supplies the complete
terrain layout. Impassable overlap and ambiguous multiple supports fail
closed.

## Rules geometry and frontend projection

Rules geometry remains in world inches. Official physical millimetres are
converted exactly with `25.4 mm = 1 in`; a 32 mm Mission Marker therefore has
a rules diameter of `32 / 25.4` inches. The same conversion applies to model
bases such as 50 mm.

Web and app renderers receive a shared world-to-viewport projection contract:

- X and Y always use one uniform CSS-pixels-per-inch scale, preserving the
  `1:1` Skirmish and `3:2` Standard battlefield aspect ratios;
- fit-to-viewport is computed first and user zoom is applied afterwards;
- world origin is bottom-left while viewport origin is top-left, so only the
  projection flips Y;
- pan, zoom, display size, touch-target padding and device-pixel ratio never
  alter rules positions, base radii, collision or measurement;
- device-pixel ratio changes only backing-store resolution and no rules value
  is rounded before adjudication.

Desktop, tablet and phone viewport fixtures, DPR 1/3, zoom/pan, projection
round trips, 32 mm markers and a generic 50 mm model base are covered by the
focused judge tests.

## Fixed official denominator

The development source lock remains unchanged:

- lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- Terran P2P: `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`

Core PDF page 78 is primary for setup order. Frozen Command Center 9.3 prose
places Mission Markers before terrain and conflicts with that page, so the
conflict is recorded and the stale prose remains available as historical
display; it is not silently merged into executable truth. FAQ 9.43 supplies
the Skirmish size and FAQ 9.46 requires every terrain piece to receive a
height tier at game start.

## Frozen identities and evidence

- data bundle: `3eeef52da0b9d6737f5ae5536ce56fe77217c543cb2123ecdf6632145d117cb5`
- geometry profile index: `32fd6cbf8693756b8fc817518950a5809ea09e357d3a0699b68250396e056b58`
- slice: `aafc7e6351442fca2b700e73840dde19617262c32ae10d708df39a9b2dbf1ca1`
- catalogue: `6b2414a21b5614ca436c55a3e9cf29374f49420ebfaba443cf94421c46b045fb`
- runtime: `80a2723a52530b63c9d169dc2064b6bb009cccfce46550e0438e99cfa6bd98d8`
- relationship graph: `39a98b83cbeb20e60584305def4ae93bbe8d1037c0d1a48d238118fe47b146b6`
- graph size: 11,896 nodes / 32,922 edges

Gates:

- Slice 107 focused: `42/42`
- frozen Slice 106 regression: `70/70`
- current executable runtime: `10/10`
- Ticket 11 aggregate: `10/10`
- Ticket 11 authority v2: `15/15`
- authoritative transition: `7/7`
- authoritative room: `7/7`
- evidence denominator: 171 base reports / 2,661 assertions; including the
  aggregate, 172 reports / 2,671 assertions

The authority regression also found and fixed a legacy-normalizer seam that
translated `pre_game` to `movement`. Pregame is now preserved as a
Rules-owned phase, allowing the geometry action to traverse the same
HMAC-preview, Ed25519-apply, replay and tamper-rejection path as other actions.

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slices 108–111 contain four slices and 46 actionable atoms:

- Slice 108: 17 balanced-terrain count/effect/lane/quadrant/centre/scaling
  atoms;
- Slice 109: 11 battlefield Token and Marker primitive atoms;
- Slice 110: 14 first-player, mission-control, elimination, final-scoring and
  tiebreak atoms;
- Slice 111: four unresolved-dispute and post-match-verification atoms.
