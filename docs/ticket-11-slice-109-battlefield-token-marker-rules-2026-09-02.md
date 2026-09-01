# Ticket 11B Slice 109 — Battlefield Token and Marker rules

Date: 2026-09-02
Rule vertical: 99/101
Route-v2 assignment: 11 atoms
Source refresh: not performed

## Outcome

Slice 109 promotes the exact Core 7.3.1/7.3.2 Token and Marker primitive
group. The catalogue advances from `883/29/114` to `894/18/114`, with 78
declared state-contract executors and action schema
`hybrid_legal_space_v47`.

`authority.battlefield-token-marker-rules-v1@1.0.0` runs only after the
Slice 108 terrain and Mission Marker certificate. It materializes one
content-hashed registry while keeping existing state fields authoritative:

1. Tokens are tangible Size 0 Terrain with their own physical base;
2. models may move through a Token but cannot end overlapping its base unless
   an explicit effect allows it;
3. Token distance is measured between closest base edges and ordinary Tokens
   expire at the end of the Game Round;
4. Markers track state but have no physical rules presence and never block
   movement or Line of Sight;
5. Activation Marker faces derive from `piece.activatedPhases` (Movement arrow
   up, Assault reverse), not from an independent UI flag;
6. Faction Indicators derive from Mission Marker control or an explicit
   Special Ability area role;
7. Mode Markers such as Burrowed and Siege Mode have STAY IN PLAY;
8. L-shaped Zone of Influence Markers derive exactly from partial Entry Edge
   endpoints; full-table Entry Edges create none;
9. the First Player Marker is a view of `firstPlayerSideKey`, so phase choice,
   early Pass and end-round initiative consumers retain one source of truth;
10. Cleanup classifies default removals and the exact STAY IN PLAY, Damage,
    Mission Marker and Mission-control Faction Indicator exceptions.

The registry is static rules metadata. Activation, mode, control and initiative
views are recomputed from current authoritative state, so a stale frontend
Marker cannot overwrite the game state it is meant to display.

The same executor also exposes `cleanup_battlefield_tokens_and_markers` once
per Cleanup round. It mutates the dedicated authoritative
`officialBattlefieldTokens/Markers` collections to the rules-derived retained
sets before frozen Cleanup Refresh v5 continues. This makes default Token
expiry and Marker exceptions an actual runtime transition without rewriting or
silently widening the historical v5 executor.

## Map, model, Token, Marker and frontend scale

The Slice 107 projection remains the sole coordinate seam:

- battlefield, terrain, models and tangible Tokens use world inches;
- physical model and Token bases convert exactly as `millimetres / 25.4`;
- X and Y use one identical CSS-pixels-per-inch value;
- DPR changes only the canvas backing store;
- fit, viewport aspect ratio, zoom and pan change only projection;
- touch-target padding changes only interaction hit areas;
- a 32 mm Token retains a `32 / 25.4` inch collision diameter;
- a 100 mm model uses its full `100 / 25.4` inch base when testing whether it
  may end overlapping the Token;
- an intangible Marker always has zero rules diameter and a null rules
  footprint, even if its icon or touch target is 18/44 CSS pixels;
- the relationship graph forbids projected CSS geometry from writing back to
  Deployment geometry and forbids setup views from becoming First Player
  authority.

Focused evidence covers a `36×36` Skirmish battlefield, DPR 1 and 3, 2× zoom,
pan, 32 mm Token projection, a 100 mm model-overlap case, expanded touch
targets, and an intangible ZOI icon. AGRIA VALLEY produces six exact partial
Entry Edge corner views; ABANDONED CAMP produces zero because both Entry Edges
span their full table edges.

## Fixed official denominator

The development source lock remains unchanged:

- lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- Part 7 review packet: `af23ae532b1189dc6ef0be2216929e18e77b1c429f5caab64785bc0ea11cc152`

The 11 exact atoms are five Token clauses and six Marker clauses from Core PDF
page 55. The Mission Marker specification is not double-promoted: its physical
32 mm setup contract remains owned by Slice 107. Buff/Debuff Marker atoms are
outside this route assignment and remain with their separately assigned slice.

## Frozen identities and evidence

- data bundle: `361674d388cc4757e928215dac27b011f19da15708af2cb7037dacee09d1b5ff`
- slice: `139a4f04c79b6ac38bb5becf4a9250331a10b633021c6793f0ac20d0a45e670f`
- catalogue: `a72cd596d12b656aad71521ae8c95925a52aac7d48d3f69f289454347a7160d8`
- runtime: `1b59d0467d49145fa81f2ffb7de70a33f1db033d76078f439dbdef64775579c8`
- relationship graph: `6612a5f597990381f2b896f84f29fe816fba6dcf46bcd06ed6c952035776f897`
- graph size: 12,131 nodes / 33,331 edges

Gates:

- Slice 109 focused: `55/55`
- frozen Slice 108 balanced-terrain regression: `57/57`
- current executable runtime aggregate: `10/10`
- evidence denominator: 173 base reports / 2,773 assertions; including the
  aggregate, 174 reports / 2,783 assertions

The focused Authority path passes HMAC preview, explicit human confirmation,
Ed25519 apply receipt, replay after HMAC rotation and signed-receipt tamper
rejection. A forged registry hash fails closed, and the deterministic action is
absent after registry materialization.

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slices 110–111 contain two slices and 18 actionable atoms:

- Slice 110: 14 first-player, mission-control, elimination, final-scoring and
  tiebreak atoms;
- Slice 111: four unresolved-dispute and post-match-verification atoms.
