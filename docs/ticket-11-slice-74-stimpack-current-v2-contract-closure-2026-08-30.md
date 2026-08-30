# Ticket 11 Slice 74 — Stimpack current-v2 contract closure

## Outcome

Slice 74 closes the last two existing-executor state contracts and the last four non-strict atoms in the 421-atom executable catalogue. Current rooms use `authority.marine-stimpack-active-v3@3.0.0` and `authority.stimpack-ranged-consumer-v2@2.0.0`; the corresponding v1 executors remain byte-frozen for historical runtime, replay and rules display.

The explicit adapter accepts only the latest reviewed official `71/69/48` Marine/Medic unified bundle: snapshot `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`, dataset `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63` and bundle `f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459`. It verifies the exact Marine profile and Terran Armed Forces resource, projects through the reviewed frozen semantic view, and restores current data and MissionSetup identity after apply. Repository fallback and silent compatibility are forbidden.

## Closed contracts

- Stimpack Active is legal immediately before or after the Movement Hold action.
- Active spends the exact current resource, applies two non-lethal damage, does not remove the source as a casualty, and records status/history.
- Stimpack ranged exposes every legal subset of failed dice up to Precision's limit; the fixture exposes four choices.
- Resolving Precision clears the pending action and retains the current official data identity.
- Later positive standard damage combines with prior non-lethal damage and can destroy the model.
- Stale current data, adapter receipt, action or pending choice fails closed.

The four rebound atoms are the Core Part 11 clauses for non-lethal damage accumulation, no casualty removal from non-lethal damage, later standard-damage triggering, and Precision failed-die conversion. No RuleAtom was added.

## Frozen release

- Slice: `0e2be19c977a0bb9c71a66c79bb1876d9d004c15a2fdceb2ebea5136a0b54671`
- Catalogue: `ae8062993105f2fa421e6495343145151104fafb1c35618d7819e03fc2d1b1a3`
- Runtime: `5365803f73cc500f3c39089fdeae592e620cdd980e3c59b38134cb28ea87a33d`
- Relationship graph: `90f30593ecce682155649e7eabe467449afa81324c0dd481c13629edeb8503ff`
- Graph denominator: 8,357 nodes / 26,549 edges / 41 scopes.

Coverage moves from `417 strict / 4 partial / 0 none` to `421 strict / 0 partial / 0 none`. Declared state contracts move from `40/42` to `42/42`. The eight-slice existing-executor contract route is therefore `8/8` complete.

## Gates

- Stimpack current-v2 public contract: 20 assertions.
- Closure: 7/7.
- Central runtime and manifest: 10/10.
- Ticket aggregate: 9/9, 136 base reports / 1,387 assertions; including aggregate, 137 reports / 1,396 assertions.
- Seven latest official online endpoints were revalidated with `repositoryFallbackUsed=false`.
- Authority Preview → Confirm → Apply, Ed25519 replay after HMAC rotation, signature tamper rejection and relationship missing-edge rejection pass.
- Frozen v1 source hashes: Active `a1e14cd009b97007701f13b5027a2ffbc653bf157dc317b089e151c9c4a14453`; ranged `65776d1dfacce3c23d37d27cc67533e7caabd229e36e7bd25efd7004ea78fc50`.

## Boundary after this route

Closing all 421 existing-executor contracts does not finish Ticket 11. The canonical denominator still contains 491 `review_required` atoms and 114 preserved `display_only` atoms, so the runtime remains a development subset and production-room eligibility remains false. The relationship graph is derived audit evidence, not Rules authority.

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. The next Ticket 11 route must select bounded atom-promotion families from the remaining 491 review-required atoms; Charge and any new-atom work stay frozen until that route is explicitly selected.
