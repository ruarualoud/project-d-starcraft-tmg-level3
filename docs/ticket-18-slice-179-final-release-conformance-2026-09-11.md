# Ticket 18 / Slice 179 — final release and store conformance

Status: complete on 2026-09-11. Ticket 18 is `8/8` and complete. Project
progress is `17/22`; remaining Tickets are 14, 19, 20, 21 and 22.

## Outcome

The first-five strategy pack is no longer dependent on ignored `build/` files.
Its fifteen exact payload objects now live under
`content/strategy-skills/ticket-18-foundational-v1/`: five Skills, four unique
qualification receipts, two SkillOpt candidate Skills, one promotion-record
bundle and the Slice 176–178 predecessor reports. The V2 manifest contains only
tracked `content/` paths and selects every object by exact hash; it does not
guess the newest version. The Slice179 final report is an additional tracked
evidence file beside that payload and is not recursively included in its own
manifest.

The portable loader verified all original Skill and qualification hashes,
dependency edges, both candidate-parent relationships, the promotion bundle
and all predecessor evidence. It then produced a sixteenth persistent object:
the portable-pack load receipt.

This final closure does not create a Terran/Zerg combined Skill. The current
Faction Skills remain one Faction each: `Terran Armed Forces` and `Zerg Swarm`.
The later experiment is independent Protoss `Daelaam` plus exactly one second
Faction under either Terran (`Raynor's Raiders`) or Zerg (`Kerrigan's Swarm`).
That Terran/Zerg choice remains open.

## Store composition

M1 and production now share two explicit contracts:

- Provider Attempt Store, already implemented in Ticket 16, owns budgets,
  attempt intent, dispatch, settlement, audit replay and ambiguous-outcome
  policy.
- Strategy Release Store owns immutable Skill/evidence objects, queued/running/
  complete jobs, revision CAS, lease owner, monotonic fence, expired-lease
  recovery and output/attempt hash binding.

| Layer | M1 | Production |
| --- | --- | --- |
| Provider attempt | SQLite WAL, FULL, `BEGIN IMMEDIATE` | PostgreSQL Serializable, row locks, zero internal retry |
| Strategy release | SQLite WAL, FULL, `BEGIN IMMEDIATE` | PostgreSQL Serializable, `SELECT FOR UPDATE`, zero internal retry |

The PostgreSQL adapter is real SQL/pool code. This local slice used a
deterministic PostgreSQL protocol double rather than provisioning a real
server; production provisioning remains Ticket 21.

## Recovery evidence

- SQLite release Store closed with a running lease, reopened the same file,
  requeued one expired job and issued fence 2 to the successor worker.
- The old fence could not complete the job. The successor completed it and
  bound both Provider attempt hashes.
- The PostgreSQL Adapter executed the same semantic scenario through
  Serializable transactions and `FOR UPDATE`. Seven cross-adapter record/fence
  comparisons are identical, including the final job hash
  `66f602ca205cf9f831b181c5d15657235cb1060be8f93e6ae4dcb846032204a1`.
- A Provider attempt interrupted before dispatch recovered as
  `abandoned_before_egress` with zero charge.
- A dispatched attempt with unknown outcome recovered as `ambiguous`, retained
  its full 50-unit reservation as conservative charge, and requires explicit
  retry authorization. Neither case was automatically retried.
- The six-event Provider audit chain replays to the same budget projection.

These are synthetic persistence/recovery probes. No Provider request was sent.

## Final evidence

- Portable manifest hash:
  `47ed51cb716563d46179695f6c76d789242eff158be9fad554cba5fcd2935bc8`
- Portable load receipt:
  `d9bd75d65d195af5b78a48945a22ee1693168b616f80846c935e2debff5eabc6`
- Store conformance contract:
  `6d6445a8ae9a63ec93769ddfcc4e4bb835d19d0b123b0a77a1f87eb45e8e369d`
- Final report:
  `content/strategy-skills/ticket-18-foundational-v1/evidence/slice-179-final-release-conformance-report.json`
- Final report hash:
  `79d857214b4594b7679c02ca67d5f0a866372f0b7c6acbacc79457e34316991a`
- Runtime-accepted foundational versions: `5/5` through the explicit Slice 176
  registry evidence.
- Newer SkillOpt versions: `2`, manual-promotable only, not live.
- Critical/High findings: `0`.
- Medium non-blockers: full-game strategy effectiveness remains unproven; no
  real PostgreSQL server was provisioned in this local slice.

## Focused verification

No earlier Ticket 16 or Ticket 18 suite was repeated. One syntax command checked
only the eight Slice 179 source files and passed. The final conformance runner
passed; after adding its portable report output, only that changed runner was
syntax-checked and executed once more. Its report hash remained identical.
Node emitted its standard experimental warning for `node:sqlite`; the database
quick check returned `ok`.

Provider/model calls and incremental cost are zero. The retained matchup epoch
is `34,120,976` tokens / estimated CNY `15.721921`; historical cumulative is
`260,204,060` / estimated CNY `312.143927`. Payment-required count is zero.

## What Ticket 18 proves—and does not prove

Ticket 18 now proves stable production inputs, five formal foundational Skills,
explicit online routing/acceptance, replay-safe postgame reflection, bounded
SkillOpt candidate generation, a discriminating regression gate, rollback and
durable portable scheduling/storage contracts.

It does not prove complete-game win-rate improvement, production PostgreSQL
operations, MuZero export, full human-agent/agent-agent seasons, or final
device acceptance. Those belong to Tickets 19–22 and the deferred final slice
of Ticket 14.
