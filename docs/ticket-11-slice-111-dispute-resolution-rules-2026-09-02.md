# Ticket 11B Slice 111 — Dispute resolution rules

Date: 2026-09-02
Rule vertical: 101/101
Route-v2 assignment: 4 atoms
Source refresh: not performed

## Outcome

Slice 111 promotes the final four actionable Core 12.9 atoms. The catalogue
advances from `908/4/114` to `912/0/114`: all 912 actionable atoms are
executable, while all 114 display-only rows remain readable and excluded from
LegalSpace. The runtime now declares 80 executors with 80 complete state
contracts and uses `hybrid_legal_space_v49`.

`authority.dispute-resolution-rules-v1@1.0.0` implements one bounded four-step
procedure:

1. an exact simultaneous-Army-Elimination conflict becomes a content-hashed
   specific-instance dispute;
2. both participants roll 2D6; equal totals reseal a fresh attempt and the
   higher total becomes the provisional-ruling owner;
3. the winner selects one of the complete typed outcomes for that instance,
   the result is applied and play flow continues;
4. after the match, the coordinator records whether the ruling was confirmed,
   corrected, or remains unresolved without rewriting the signed as-played
   receipt.

The coordinator only drives the Authority action and does not own the ruling.
The Roll-Off winner may select any available instance outcome, including one
that does not favour that winner.

## Manual-adjudication boundary

The provisional ruling is not official rules truth:

- it is scoped to one content-hashed dispute instance;
- it cannot modify the canonical source, atom catalogue or executor contract;
- it cannot submit an arbitrary whole-state patch;
- the Authority receipt records `manualAdjudication=true`;
- the room and every derived trace remain `eligibleForTraining=false`;
- post-match verification preserves the signed historical as-played outcome;
- a correction becomes later review work rather than retroactive receipt
  mutation.

The generic `manual_adjudication` proposal remains disabled under the Ticket
11A contract. Slice 111 exposes only the typed Rules-owned procedure through
ordinary Preview, confirmation and Apply.

## Frozen source and release identities

- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- data bundle: `c79d40f14e295a541a4b37bfe64737bd5569bba04d6acc3486e43461f2e885ea`
- slice: `f8183a5a689ea5ec72381f52d0bba8f58ae4585db8d53f5b0f6f343aa70bd20d`
- catalogue: `5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46`
- runtime: `6e3527cea5b9a005bb5462eb33bc8f2a7a3a93636778ae9a6daec2d8fab903b9`
- relationship graph: `63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c`
- graph size: 12,292 nodes / 33,644 edges

No source refresh or repository fallback was used.

## Verification

- Slice 111 focused Judge: `50/50`
- frozen Slice 110 regression: `60/60`
- executable runtime aggregate: `10/10`
- Ticket 11A authority matrix: `15/15`
- authoritative transition compatibility: `7/7`
- authoritative room compatibility: `7/7`
- Ticket 11 foundation aggregate: `10/10`
- Ticket 11 joint closure: `12/12`
- evidence denominator: 175 base reports / 2,883 assertions; including the
  aggregate, 176 reports / 2,893 assertions

HMAC preview, explicit human confirmation, Ed25519 apply receipt, replay after
HMAC rotation and signature-tamper rejection all pass.

No Skill was generated or promoted. DSH, self-play, MuZero export, memory
promotion and training promotion were not run.

## Ticket boundary

This slice closes Ticket 11. It does not make the product production-ready:
Web/App integration, production source signing, the live Kerrigan Adjutant,
Skill generation, self-play, MuZero export, production security and real-device
acceptance remain later Tickets.
