# Ticket 11 Slice 56 — Existing Victory Point Scoring Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 56 continues repairing the existing 421 executable RuleAtoms in dependency
order. It closes Victory Point scoring immediately after Slice 55 closed its
Mission Marker Control prerequisite. Slice 56 is the ordinal of a historical
development batch; it is not RuleAtom number 56 and it does not add a new atom.

The public-contract RED test proved that frozen
`authority.victory-point-scoring-v1@1.0.0` accepted caller-forged lineage,
resolution/diagnostic fields, and additional public payload. Strict-freeze
policy therefore keeps v1 byte-exact at source SHA-256
`2f0eb0465029051a403d752f9011f48d0b6b33ec8d07607e83628d3fba4ee3af`
and adds `authority.victory-point-scoring-v2@2.0.0`. Current v2 exact-matches a
server-enumerated executable action before delegating the already frozen v1
transition semantics. Historical v1 catalogue, runtime, replay, and old-rules
display dependencies remain exact; there is no silent compatibility path.

The same 12 existing atoms are reassigned from v1 to v2. There are zero new
atoms and zero non-target atom changes. The frozen denominators remain:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executor consumers: `42`

Strict state-contract coverage changes as follows:

- declared executor contracts: `15 → 16`
- missing executor contracts: `27 → 26`
- strict-complete atoms: `144 → 156`
- partial atoms: `80 → 80`
- no-contract atoms: `197 → 185`

This leaves 265 existing atoms non-strict: 80 partial and 185 without a
declared complete consumer contract. Charge and all new-atom work remain
paused until all 42 executor contracts and all 421 existing atoms are strict.

## Exact scoring subset

The current Rules-owned Cleanup transition requires the exact current official
gameplay bundle and Hold Position setup, the completed Slice 55 marker-control
result, round 2, both Combat Passes, the First Player state, scores, players,
pieces, board, zero-loss Supply ledger, Cleanup progress, and match binding.
Stale source, setup, control, lifecycle, Supply, or match identity fails closed.

The bounded Judge fixture scores all five controlled markers with affinity:

- player 1 controls markers 1, 2, and 5 for `1 + 2 + 1 = 4` VP
- player 2 controls markers 3 and 4 for `2 + 1 = 3` VP
- destroyed-enemy-Supply VP is zero for both seats in this exact ledger
- both round gains commit simultaneously, changing scores from `2/1` to `6/4`

Apply writes only scores, Victory Point scoring history, Cleanup scoring
progress, and the event log. The board, pieces, marker control, official data,
setup, Supply ledger, players, First Player state, and unrelated lifecycle
fields are protected from undeclared writes. The next Cleanup step becomes the
separate end-game condition check; this slice does not silently decide the
winner.

## Public contract, graph, and replay

`enumerateOfficialVictoryPointScoringActionsV2` exposes only the exact public
executable identity. UI enablement, disabled reasons, precomputed score,
diagnostic details, caller-authored lineage, and caller-authored resolution are
not accepted Apply authority. `applyOfficialVictoryPointScoringV2` regenerates
current LegalSpace, demands an exact action match, and only then invokes frozen
v1 transition semantics while recording the v2 identity.

The Slice 56 relationship graph appends to Slice 55 and binds the 12 atoms to
their current source, reads, exact writes, invalidations, five-marker affinity
Judge evidence, simultaneous score commit, protected-state tests, v1→v2 frozen
ancestry, and Authority replay. Removing a required invalidation, state path,
or Judge edge produces a declared graph gap and blocks release.

The accepted transition traverses LegalSpace → Preview → Confirm → Apply. Its
content hash and Ed25519 long-term signature replay after the HMAC short-term
seal rotates; tampering fails as `SIGNATURE_INVALID`. Historical Slice 55 and
all older catalogue/runtime/rules-display identities remain retained.

Frozen identities:

- slice: `d29118ef53324b6c15f9b61d048db20f79ad3e0a82a9239941ddfdd87dcaba2c`
- previous slice: `fdb44c36f5c418954b0524a3943cccf09fe3bc44b3e34e0533be9b73235d6662`
- catalogue: `23512e7eccf02f31a11c418663a8b68aa13744c30561f3c3fb37b086c22b2a5a`
- runtime: `d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe`
- relationship graph: `383a9fdb67aa5454efa536b4a8c77964e00c3f7edbde6932e187b638c9724844`
- graph size: `5,767` nodes / `21,241` edges

## Official-source evidence

The focused verifier re-read the live official Firestore versions and all
documents bound by this scoring subset. Repository fallback was forbidden and
unused.

- accepted versions: units `71`, cards `69`, rules `48`
- versions receipt: `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`
- Marine: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`
- Part 8: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b`
- Part 12: `153cb27295dfa4bfa2069aa1617836d81a2d4a3f15d19568de497ce19fd16868`
- Hold Position: `dc3ed374c4b64731455402ea0d6e325a9e468d7fdc6453d995122ff877f3d1f8`

## Verification gates

- public v2 enumerate/apply RED→GREEN verifier: pass
- Slice 56 source/contract/Judge/Authority/replay verifier: `12/12`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `118` base reports / `1,215` assertions; including
  aggregate, `119` reports / `1,224` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`

One historical Close Combat verifier used a random match identity that could
make all six Guardian Shell trigger dice miss. Its fixture now pins the match
identity, removing the Chance flake without changing any rule, frozen runtime,
or scoring result; the focused test passed three repeat runs before the full
gates were rerun.

## Remaining order

Twenty-six of 42 executor contracts remain. The next dependency audit target
is `authority.hold-position-end-game-check-v1@1.0.0`, immediately downstream
of VP scoring. It currently consumes two single-consumer no-contract atoms. If
and only if its source, public action, state, graph, Judge, replay, historical
version, and terminal semantics all pass, planning-only Slice 57 would become
`158 strict / 80 partial / 183 none`, contracts `17/42`, with 25 missing. That
is a projection, not a completion claim.

This slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
