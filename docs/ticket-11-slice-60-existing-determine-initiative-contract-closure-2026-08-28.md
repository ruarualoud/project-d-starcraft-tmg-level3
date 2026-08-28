# Ticket 11 Slice 60 — Existing Determine Initiative Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 60 continues repairing the existing 421 executable RuleAtoms in direct
lifecycle order. It consumes the exact Cleanup v5 result delivered by Slice 59
and closes the current Determine Initiative executor contract. Slice 60 is a
repair-batch ordinal, not RuleAtom number 60, and adds no atom.

TDD first exposed a real lifecycle incompatibility: frozen
`authority.determine-initiative-v1@1.0.0` accepts only Cleanup history schema
v1, while current `authority.cleanup-refresh-v5@5.0.0` emits Cleanup history
schema v5. Consequently the current Authority LegalSpace hid Determine
Initiative with `DETERMINE_INITIATIVE_PROGRESS_INVALID`. Merely declaring a
relationship contract for v1 would therefore have been false.

Strict-freeze policy leaves v1 byte-exact and introduces
`authority.determine-initiative-v2@2.0.0`. V2 verifies the current official
bundle, MatchBinding and complete Cleanup v5 history, projects only that
verified history schema into the frozen v1 semantic kernel, then restores the
original v5 history and emits a v2 action/transition identity. This is an
explicit versioned adapter with `silentCompatibilityUsed=false`; current rooms
cannot fall through to v1, while historical v1 runtime/replay/rules display
remain queryable.

Coverage changes are:

- executable RuleAtoms: `421` unchanged
- declared executor contracts: `23 → 24/42`
- missing executor contracts: `19 → 18`
- strict-complete atoms: `167 → 173`
- partial atoms: `78 → 78`
- no-contract atoms: `176 → 170`

Exactly six existing Determine Initiative atoms were version-rebound and moved
from no-contract to strict. There are zero new atoms and zero non-target atom
changes. This leaves 248 existing atoms non-strict: 78 partial and 170 with no
complete consumer contract. Charge and all new-atom work remain paused until
all 42 executor contracts and all 421 existing atoms are strict.

## Exact initiative subset

The current v2 contract supports Hold Position rounds 2–4 after the exact
marker-control, Victory Point, end-game, End-of-Round and Cleanup prefix:

- unequal VP: the lower-VP seat receives the First Player Marker
- tied VP: each seat receives two hidden D6 outcomes through a ChanceTicket
- tied Roll-Off: state stays in Determine Initiative and the next attempt gets a
  fresh state/proposal/counter-bound commitment
- winning Roll-Off: the marker is assigned, the round increments and phase
  becomes `start_of_round` with no active seat
- Start-of-Round effects and supply resolution remain pending; Movement is not
  silently opened

Apply accepts only the complete executable action from a fresh server
enumeration. Forged lineage, executor identity, extra fields, stale score,
wrong seat, missing chance material, Cleanup v5 history drift, current official
source/data drift, supply-ledger/runtime drift and MatchBinding drift fail
closed. Board, pieces, scores, cards, mission state, Cleanup history and
terminal state are protected from unintended writes.

## Public contract, graph, Authority and replay

The public graph seam is `create / query / audit`; the rules seam is
`enumerate / apply`; the authority seam is
`LegalSpace → Preview → Confirm → Apply`. The relationship graph appends to
Slice 59, declares current v2 reads/writes/invalidations/chance/Judge paths, and
retains frozen v1 as an explicit historical executor superseded by v2. A final
semantic review corrected the current action node from an obsolete “frozen v1”
label to “current v2” before identities were frozen.

The tied Roll-Off remains hidden in Preview. Apply reveals four dice under the
short-lived HMAC chance seal, while the permanent AcceptedReceipt uses Ed25519.
Both deterministic and chance receipts replay after HMAC-key rotation;
tampering fails as `SIGNATURE_INVALID`. Opponent mode may preview a legal,
win-oriented action but cannot confirm or apply it.

The structural action-schema dependency stays `hybrid_legal_space_v19`; the
stable Authority response protocol stays
`starcraft_tmg_authority_v2.legal-space`.

Frozen identities:

- slice: `54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448`
- previous slice: `23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10`
- catalogue: `b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38`
- runtime: `e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7`
- relationship graph: `25fbf95e92e6be04ebaad41a1b7a2edf77423ddb885f21d8134ddb18969b07e8`
- graph size: `6,014` nodes / `21,880` edges
- frozen v1 executor source SHA-256:
  `ab28fe849bd9f3736dae0c8fcc589d26cd546d9cadb80b17e64757a5fd9fec3f`
- current v2 executor source SHA-256:
  `4a5b3a7b01b9621bf444637b7c2d9a83854c63d9873625add8d3f538ddf37c9c`

## Official-source evidence

The verifier re-read the current official Core PDF, Firestore version record
and Hold Position mission. Repository fallback was forbidden and unused.

- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- accepted versions: units `71`, cards `69`, rules `48`
- current source snapshot:
  `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`
- normalized dataset:
  `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63`
- repository fallback used: `false`

## Verification gates

- public relationship contract: `6/6`
- Slice 60 source/contract/Judge/Authority/replay verifier: `14/14`
- direct cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `122` base reports / `1,268` assertions; including
  aggregate, `123` reports / `1,277` assertions
- product `verify:all`: pass with exit `0`

The long `verify:official-executable-rule-runtime` command was attempted twice.
Its already-run prefixes stayed green, but two independent historical online
source reads timed out: first Restoration Range, then Specialist Loadout. The
Restoration Range verifier passed immediately when retried alone. Therefore the
direct current runtime gate is green, but this run does not claim one
uninterrupted success for the network-heavy historical chain.

## Remaining order

Eighteen of 42 executor contracts and 248 of the 421 existing atoms remain
non-strict. The next direct dependency is Start of Round. Its atom movement is
planning-only until source, current Cleanup/initiative state, graph, Judge,
Authority, replay and historical-display audits pass.

This slice generated or promoted no Skill, did not install or run DSH, and
wrote no memory, self-play, MuZero or training candidate. `rulesEligible`,
`productionRoomEligible` and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
