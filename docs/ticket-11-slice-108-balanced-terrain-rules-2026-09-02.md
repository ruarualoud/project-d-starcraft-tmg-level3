# Ticket 11B Slice 108 — Balanced terrain rules

Date: 2026-09-02
Rule vertical: 98/101
Route-v2 assignment: 17 atoms
Source refresh: not performed

## Outcome

Slice 108 promotes the exact balanced-terrain count, effect, distribution,
lane, centre, scaling, placement and relocation group. The catalogue advances
from `866/46/114` to `883/29/114`, with 77 declared state-contract executors
and action schema `hybrid_legal_space_v46`.

`authority.balanced-terrain-rules-v1@1.0.0` consumes the completed Slice 107
Deployment geometry and accepts one complete, player-confirmed physical terrain
plan. Rules, not the client, recompute and seal:

1. the proportional integer count envelope for the selected battlefield;
2. total, Size 0, Size 1, Size 2, Size 3+ and Grass counts, with Grass counted
   inside both Size 2 and total rather than as an additive bucket;
3. terrain-footprint coverage of all four visual quarters, significant terrain
   near the centre, two opposing Entry Edge fire lanes and three-inch major
   structure separation;
4. one clear manoeuvre witness per quarter for the current largest official
   base depth, 100 mm, without claiming arbitrary-formation global path closure;
5. ground-reachable Access Points for every standable Size 3+ structure;
6. nearest legal relocation of impassable terrain that overlaps a Mission
   Marker target;
7. the complete Slice 84/86 terrain artifacts, game-start terrain-height ledger
   and final Mission Marker placement/elevation.

Alternating placement is red-first, one piece at a time, over the exact complete
terrain denominator. The six Standard D6 and three Skirmish D3 premade map
identities are registered. Their official source images are not silently
converted into invented coordinates: a premade setup still requires every
participant to confirm that the physical layout conforms to the selected image.

## Map, model and frontend scale

Rules geometry remains in world inches. Official model bases remain physical
millimetres and convert exactly by `mm / 25.4`. Terrain rectangles, Mission
Markers and model bases all use the same Slice 107 world-to-viewport projection:

- X and Y share exactly one CSS-pixels-per-inch scale;
- Standard remains `54×36` and Skirmish remains `36×36` in world space;
- a 100 mm base is always `100 / 25.4` world inches, independent of display;
- device-pixel ratio changes only the backing store;
- fit, browser/app viewport size, zoom and pan change only projection;
- touch-target padding never changes a model's rules collision footprint;
- projected terrain retains the byte-equivalent milli-inch rules footprint;
- the relationship graph forbids a viewport-derived path back into rules
  geometry or balance counts.

The focused Judge covers desktop, tablet and phone aspect ratios, DPR 1/2/3,
zoom/pan, exact two-inch terrain projection, 100 mm base projection, touch
targets, and a negative graph fixture that attempts to make CSS projection a
Rules input.

## Fixed official denominator

The development source lock remains unchanged:

- lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- Part 9 review packet: `5efca96c848666c2df30a0ca0eecb86daa0e78d7633f1e4119ca9e15e6ce7623`
- Part 12 review packet: `adbb3f56aae3c75572a8de3d4d278be9ba83867b64dd0338991f4c10c056c1a3`

The Standard `54×36` guidance is total 8–12, Size 0 0–2, Size 1 2–4,
Size 2 6–8, Size 3+ 1–2 when available and Grass 4–6. For Skirmish
`36×36`, exact area scaling plus the integer-inside-the-real-interval rule
produces total 6–8, Size 0 0–1, Size 1 exactly 2, Size 2 4–5, Size 3+
exactly 1 when available and Grass 3–4.

## Frozen identities and evidence

- data bundle: `4568568e3c55c118e59e26e261ed8c5e7c3915f67b1293b1e047ec54a03b5c4a`
- premade map index: `90ffa8cd81845edf5bb369a08fe497649fd8fcdc4d400db52e1e5aecf651cd98`
- slice: `55fbcd3ddd3cc139a41fdbfb0888a99238250fbcb3de14c6d4b69cddcc5aa5bd`
- catalogue: `b59551acb4f23c65520bab35b250a9bbde0ab1ff781df87ec4af92a8da0458db`
- runtime: `06b7599333f098daa7741e8607ec57ceb562d1af5194661b2d18b42d5b62d1ce`
- relationship graph: `0c3bb9eeda90208924cf79657cd3a2f682c422e36c5de0fc8b4adc20912eaa16`
- graph size: 12,029 nodes / 33,138 edges

Gates:

- Slice 108 focused: `57/57`
- frozen Slice 107 geometry regression: `42/42`
- current executable runtime aggregate: `10/10`
- evidence denominator: 172 base reports / 2,718 assertions; including the
  aggregate, 173 reports / 2,728 assertions

The focused Authority path passes HMAC preview, explicit confirmation,
Ed25519 apply receipt, replay after HMAC rotation and tamper rejection. It
also proves the action is absent after materialization and that a forged
expected terrain certificate fails closed.

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slices 109–111 contain three slices and 29 actionable atoms:

- Slice 109: 11 battlefield Token and Marker primitive atoms;
- Slice 110: 14 first-player, mission-control, elimination, final-scoring and
  tiebreak atoms;
- Slice 111: four unresolved-dispute and post-match-verification atoms.
