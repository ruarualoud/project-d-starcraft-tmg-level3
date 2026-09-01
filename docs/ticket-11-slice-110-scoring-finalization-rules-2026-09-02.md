# Ticket 11B Slice 110 — Scoring finalization rules

Date: 2026-09-02
Rule vertical: 100/101
Route-v2 assignment: 14 atoms
Source refresh: not performed

## Outcome

Slice 110 promotes the exact First Player, Mission Marker control summary,
army-elimination, round-limit and final-score group. The catalogue advances
from `894/18/114` to `908/4/114` (`99.56%` of the 912 actionable atoms), with
79 declared state-contract executors and action schema
`hybrid_legal_space_v48`.

`authority.scoring-finalization-rules-v1@1.0.0` executes four rules-owned
procedures:

1. each participant rolls 2D6 for the initial First Player Roll-Off;
2. a tied total opens a fresh attempt, while the winner may assign the First
   Player Marker to either participant;
3. after scoring, a player with neither models on the battlefield nor Units in
   Reserves is eliminated and the surviving player gains exactly 10 VP;
4. at the round limit, frozen Slice 96 destroys remaining Reserve Units at the
   start of final scoring, then the executor atomically totals destroyed Supply,
   controlled-marker objective VP and prior objective VP, selecting the highest
   score or the Mission-defined tiebreaker; current Hold Position has no
   tiebreaker, so an exact tie is a Draw.

The First Player Marker remains a view of `firstPlayerSideKey`. Assignment
updates that state field and then rederives the Slice 109 Marker view; the UI
cannot assign the Marker by editing a rendered icon.

The four control-summary atoms do not reimplement geometry. They consume the
state and resolution hash produced by frozen
`authority.mission-marker-control-v3`, which already owns the exact 3-inch,
Line of Sight, elevation, coherency, Flying/Burrowed and Current Supply
denominator. Higher total Supply controls; a tie is contested and does not
transfer existing control.

## Map, model and frontend scale boundary

Scoring and control only consume world-space rules results:

- battlefield and model locations remain in inches;
- official model and Token bases remain official millimetres converted by
  exact `mm / 25.4`;
- map fit, pan and zoom are display transforms;
- device pixel ratio changes only the backing store;
- Marker icon size and touch-target padding have no rules footprint;
- the final-score executor accepts no CSS-pixel distance or client-computed
  control result;
- a Judge test changes zoom, DPR, CSS px/inch and touch target together and
  proves the final rules-result hash remains unchanged;
- the relationship graph forbids the world-to-screen projection from writing
  Mission Marker control or First Player authority.

This is the contract the later Web/App battle-table implementation must share:
one uniform X/Y world-to-screen scale, with official base dimensions retained
at every viewport size.

## Frozen official denominator

The source lock remains unchanged:

- lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`

The 14 route atoms split into four First Player atoms, four Mission Marker
control-summary atoms, three terminal atoms and three final-score/tiebreak
atoms. The data bundle binds every atom to its exact Core clause/text hashes;
no repository fallback or new network capture was used.

## Frozen identities and evidence

- data bundle: `19fa0a34c55f5ae532e6a0f95c134b9536502e845110134c405475f1e6ab3358`
- slice: `283c21b9aa3f7d9220c89cf62f63a73baec4eaa0d8b9890adcc05f965e6be39a`
- catalogue: `7488a01ac487b4544fc7c09080dcf8242b50bf701577154cd5b806a5d52d0777`
- runtime: `d0aebfd5de012a3eb7821a3cb5c698304551c641d38b6ce9ef8a0cbc4481c413`
- relationship graph: `07ccc04786a2e0845a8e3147c715cfb44563efb3ab1acdf13e433dadbfaa5753`
- graph size: 12,239 nodes / 33,539 edges

Gates:

- Slice 110 focused: `60/60`
- frozen Slice 109 regression: `55/55`
- current executable runtime aggregate: `10/10`
- evidence denominator: 174 base reports / 2,833 assertions; including the
  aggregate, 175 reports / 2,843 assertions

The focused Authority path passes HMAC preview, explicit human confirmation,
Ed25519 apply receipt, replay after HMAC rotation and signed-receipt tamper
rejection. Forged Roll-Off reveals, assignment plans, stale control hashes and
simultaneous-elimination outcomes fail closed.

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slice 111 is the final rules slice and contains four Core 12.9 atoms:

- provisional ruling owner;
- unresolved-dispute Roll-Off;
- continue after a provisional ruling;
- post-match ruling verification.

Until Slice 111 lands, simultaneous elimination and other genuinely unresolved
rules disputes remain quarantined rather than receiving an invented outcome.
Ticket 11 remains open; the overall project remains `10/22` completed Tickets.
