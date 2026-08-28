# Ticket 11 Slice 57 — Existing Hold Position End-Game Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 57 continues repairing the existing 421 executable RuleAtoms in dependency
order. It closes the two-atom Hold Position end-game check immediately after
Slice 56 closed Victory Point scoring. Slice 57 is the ordinal of a historical
repair batch; it is not RuleAtom number 57 and it adds no atom.

The RED public-contract test proved that frozen
`authority.hold-position-end-game-check-v1@1.0.0` accepted caller-forged
lineage, diagnostics, and additional public payload. Strict-freeze policy keeps
v1 byte-exact at source SHA-256
`818368bf69e958a8e7785219180a26ae799dc2c432a2f46b9054bd18fb471656`
and adds `authority.hold-position-end-game-check-v2@2.0.0`. Current v2
exact-matches a fresh server enumeration before delegating the frozen v1
transition semantics. Historical v1 catalogue, runtime, replay, and old-rules
display remain exact; there is no silent compatibility path.

The same two existing atoms are reassigned from v1 to v2. There are zero new
atoms and zero non-target changes. Coverage changes are:

- executable RuleAtoms: `421` unchanged
- declared executor contracts: `16 → 17/42`
- missing executor contracts: `26 → 25`
- strict-complete atoms: `156 → 158`
- partial atoms: `80 → 80`
- no-contract atoms: `185 → 183`

This leaves 263 existing atoms non-strict: 80 partial and 183 with no complete
consumer contract. Charge and all new-atom work remain paused until all 42
executor contracts and all 421 existing atoms are strict.

## Exact terminal subset

The transition consumes the exact current official Hold Position binding,
completed Mission Marker Control and Victory Point scoring histories, round,
phase, First Player, both seats, live-army witnesses, scores, Cleanup progress,
terminal state, event history, and MatchBinding. It implements only the
post-scoring special-lead check for rounds 2–4 while both players still have an
army:

- a nine-point lead continues to `resolve_end_of_round_effects`
- an exact ten-point-or-greater lead declares the leading seat the winner
- either seat may be the winner
- an already-terminal state exposes no further action

Army Elimination, final-round scoring, Reserve questions, ties, and multiple
simultaneous terminal reasons remain separate fail-closed work. Apply writes
only the active-side/terminal fields, end-game history, Cleanup progress, and
event log. Board, pieces, scores, source/setup data, Supply and Victory Point
history are protected from undeclared writes.

## Public contract, graph, and replay

The public v2 action excludes UI enablement, disabled reasons, score details,
diagnostics, and caller-authored lineage. Apply regenerates LegalSpace and
requires an exact action match. Terminal Apply produces an empty post-state
LegalSpace and an exact terminal summary; nonterminal Apply hands off to the
separate End-of-Round Effects transition.

The relationship graph appends to Slice 56 and binds source, reads, derivations,
invalidations, exact writes, protected-state checks, both-seat threshold Judge
cases, nonterminal and live-army witnesses, lifecycle, replay, historical
ancestry, and declared negative graph gaps. The accepted scoring-plus-terminal
prefix traverses LegalSpace → Preview → Confirm → Apply. Its content hash and
Ed25519 signature replay after HMAC rotation; tampering fails as
`SIGNATURE_INVALID`.

Frozen identities:

- slice: `d74733ad2a030e7e2b5ab7aabcd05f9af5a4129102b8cf951640876972835b21`
- previous slice: `d29118ef53324b6c15f9b61d048db20f79ad3e0a82a9239941ddfdd87dcaba2c`
- catalogue: `87cd066376e8ab637ee5083711e11e3dfc8e491d47745baf9706cc4f9771b181`
- runtime: `ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64`
- relationship graph: `db04b18a101271f21e93a5f4ed1ea7bb5c14e5f389bd1117b2625aa74f356b57`
- graph size: `5,809` nodes / `21,342` edges

## Official-source evidence

The verifier re-read the live official Core PDF and current Firestore documents.
Repository fallback was forbidden and unused.

- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- accepted versions: units `71`, cards `69`, rules `48`
- versions receipt: `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`
- Marine: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`
- Part 8: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b`
- Part 12: `153cb27295dfa4bfa2069aa1617836d81a2d4a3f15d19568de497ce19fd16868`
- Hold Position: `dc3ed374c4b64731455402ea0d6e325a9e468d7fdc6453d995122ff877f3d1f8`

## Verification gates

- public v2 enumerate/apply RED→GREEN verifier: pass
- Slice 57 source/contract/Judge/Authority/replay verifier: `12/12`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `119` base reports / `1,227` assertions; including
  aggregate, `120` reports / `1,236` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`

The first comprehensive run was `11/12`: the replay fixture registered an
abbreviated historical rules-display string, so the engine correctly
quarantined it as `HISTORICAL_RULES_DISPLAY_MISSING`. The fixture was corrected
to register the exact original bytes. No production rule, compatibility gate,
or historical dependency was relaxed.

## Remaining order

Twenty-five of 42 executor contracts remain and 263 of the 421 existing atoms
remain non-strict. The next dependency group is End-of-Round Effects. Its frozen
v2/v3/v4 executors and Cleanup v3/v4 share several atoms, so each future report
must show both contract movement and actual strict/partial/none movement; a
single version contract must not be presented as atom completion when other
consumers remain open.

This slice generated or promoted no Skill, did not install or run DSH, and
wrote no memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
