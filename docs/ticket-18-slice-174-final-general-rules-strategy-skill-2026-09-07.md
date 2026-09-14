# Ticket 18 / Slice 174 — final general rules and strategy Skill

Date: 2026-09-07

## Outcome

The final offline general Skill is complete. It binds the accepted overall
rules reference to seven initial-play strategy policies and passed the full
source and small-case gates:

- source axes: 7/7;
- independently reviewed policy fields: 77/77;
- decision results: 17/17, comprising 10 development and 7 held-out axis
  results;
- freshly recompiled and replayed rules cases after restart: 11/11;
- runtime publication, authenticated human review and complete-game strategy
  effectiveness: deliberately not claimed.

Canonical readable output:
`build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-final-v1/final-general-skill.md`.

Canonical version: `1.0.1-offline-replay-passed`.

Structured Skill hash:
`e06b28c385c12d278d5e3d6ff2a777ef8d20cd520ea8e27e4449afa26218b10b`.

The generated `1.0.0` parent remains frozen at
`0143a33c91b0cb6bf5e60cdb633a3819e58f748f17850b32d453518fa7ff7010`.

## What the Skill now teaches

This is no longer only a rules-book projection. Each policy contains an
applicability condition, objective, ordered decision procedure, alternatives,
opponent branches, risk statement, revision triggers, required Rules-service
queries, exact source references and development-case evidence.

The seven initial axes are:

1. objective planning;
2. activation tempo;
3. movement and position;
4. threat and trade evaluation;
5. resource timing;
6. uncertainty management;
7. opponent-response planning.

`review_adaptation` remains in the separate offline evolution policy. It is not
silently loaded as an eighth initial-play policy.

## Source corrections

The final pass corrected or bounded seven source-sensitive areas before
acceptance: score forecasts require explicit visible-state assumptions; early
voluntary Pass is limited to Phases 1 and 2; movement includes Grass, Flying
and non-lethal-damage exceptions; natural 1/6 uses its exact source; resources
are produced by exhausting Ready cards and cannot be stored; premeasurement
has a reserve-unit exception; and legal Reactions are distinguished from
other defensive effects. Rules-service legality remains authoritative and the
Skill has `canAffectRules:false`.

The run used the same frozen official `71/69/48 + FAQ v1` source/data binding.
No source refresh was performed during this development run.

## Final evidence-metadata correction

Final readable-output inspection found one stale `objective_plan.risk`
sentence saying that the axis had no development case, although
`movement.far-v2` was already bound and passed. A versioned, zero-Provider
correction changed only that evidence limitation sentence. It did not change
targets, steps, alternatives, opponent branches, revision triggers, selected
decisions or official-rule claims. All 17 decision artifacts were regraded,
the two `objective_plan` receipts were migrated explicitly, unrelated receipts
remained byte-identical, and the generated `1.0.0` parent stayed frozen.

## Reliable production and recovery

The finalization chain encountered two ambiguous transport outcomes, one
static schema omission and one dynamic comparison-coverage omission. Every
parent run was frozen. Ambiguous attempts were charged at their full
reservation and were never retried in place. Versioned continuation inherited
only input-hash-identical accepted artifacts.

The decision normalizer is deliberately narrow: it may add a neutral row only
for the model's already selected candidate, retain the first comparison for
each alternative, record discarded duplicate hashes, preserve the selected
candidate/opponent response/revision condition, and immediately regrade the
decision against the rules-executed case. Missing non-selected alternatives,
wrong candidates or other schema failures remain blocked. Five responses used
this bounded structural completion; none required a Provider regeneration.

Across this finalization pass:

- Provider attempts: 40;
- additional known tokens: 9,399,450;
- additional estimated/reserved cost: CNY 9.863821;
- cumulative project skill-production accounting: 139,144,469 tokens and CNY
  96.412167;
- automatic Provider retries: 0;
- current accounting is an estimate/reservation ledger, not an invoice.

## Verification

`npm run verify:ticket-18-general-strategy-final` passes. Its two cold-start
gates independently verify the frozen generated parent and canonical corrected
version. They rehash every source span, regrade all 17 decisions, check the terminal
SQLite run and current code hashes, scans canonical outputs for credential
material, and freshly recompiles/executes/replays all 11 cases without a
Provider call. Fresh referee keys and control-lease IDs intentionally change
across process restarts; the rules inputs, state hashes, observations, result
vectors, preferred candidates and replay results are identical.

The older `verify-ticket-18-case-corpus-restart-v1` aggregate now stops at its
historical production preflight because that old command reserves enough to
cross the CNY 100 notification boundary. It performs no Provider call. The new
final restart gate covers the case/compiler/replay responsibility without
requesting a production budget.

## Project status

- Project: 16/22 Tickets complete.
- Ticket 18: 2/8 slices complete; 6 remain.
- Slice 174: still active because its two faction Skills are not complete.
- Formal offline five-Skill set: 1/5 (`general-rules-and-strategy`).
- Runtime-accepted five-Skill set: 0/5.

The next work after confirmation is the remainder of Slice 174: produce and
evaluate the Terran Armed Forces and Zerg Swarm faction Skills against this
exact general Skill hash. No large-scale Skill batch starts implicitly.
