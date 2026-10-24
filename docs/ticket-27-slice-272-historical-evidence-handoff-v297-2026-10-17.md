# S272 v297 — same-original Teach / Plan handoff

## Status

Ticket27 5/6; Ticket23 33/36; remaining S272/S248/S249/S250 = 4.
Six planning groups admitted: **0/6**. No battle launched; no final-completion claim.

| Group | Planning scope | Last settled roster / Plan |
|---|---|---|
| A | Fixed Terran, Plan+Teach vs Kerrigan's Swarm | Plan11, Teach open |
| B | Fresh Terran roster+Plan vs Kerrigan's Swarm | 2000, revision5, Teach open |
| C | B flow vs Zerg Swarm | 2000, revision8, Teach open |
| D | B flow vs Daelaam | **1150**, revision6, still provisional |
| E | B flow on accepted Daybreak6.0.9 | 2000, revision33, Teach open |
| F | Reversed Kerrigan player1 vs Terran player2 | 2000, revision8, Teach open |

These are the v274 planning groups, not old battle C/D. Frozen data, FAQ, Skills,
Flash and Standard2000 remain unchanged. E's previously passed 90-pair route
comparison is not repeated and does not certify its final Plan.

## Proven causes and changes

1. D's `421bd3…a79585` original remained in snapshot0. Same candidate, frozen
   map/source/opponent and mission scope persisted across four snapshots. The
   newest input contained citations but not the original body. Re-querying the
   simulator or asking the model to invent missing fields cannot repair this.
2. Shared historical-original registry now serves both fixed-roster and fresh
   roster product entries. Only completed, scope-compatible snapshots contribute.
   References, bindings and navigation metadata cannot impersonate original
   receipts. Exact Native children remain addressable by original IDs.
3. Readonly synthesis has a historical directory and exact original lookup.
   Neither frozen input/source nor original archive hash changes. Paid answers,
   read position and no-progress counters are preserved. Old conclusions are
   not imported and old scenes do not become current-scene truth.
4. Completed synthesis carries only its actually cited historical bodies and
   provenance into existing Plan/review/experience delivery. Iterative feedback
   and derived rebinding can consume those same originals.
5. The older retained reader used by Plan revision rejected `/status`, although
   Teach's reader and citation binder accepted it. It now shares their exact
   dot/bracket / JSON Pointer / relative slash decoder and original/reference
   classifier. No fuzzy field substitution, wildcard aggregation or new numeric
   interpretation is introduced.

Current receipts still win over historical sources. Genuine unavailable results
remain unknown. This repair does not answer strategic questions for the model.

## Focused verification, not a full-suite rerun

`node scripts/verify-slice272-historical-originals-v297.mjs <D-dir> <A-dir>`

- Actual D RED: `document_error` for the persisted historical original.
- One GREEN: exact original readable; A112 / D159 original records available;
  seven mismatched scope checks excluded; original source and paid reader
  unchanged; no Provider or Native calls.

`node scripts/verify-slice272-history-plan-handoff-v297.mjs <D-dir>`

- Concrete downstream RED: `ROSTER_TEACH_EVIDENCE_PATH_INVALID` for `/status` on
  the same actual D original.
- One GREEN: same path through Teach/Plan reader and binder; reference-only
  shadow cannot win; exactly one cited historical body retained and readable
  by Plan revision; unrelated history not copied; no Provider or Native calls.

No old passed gate, full suite, room or paid generation was repeated for these
checks. A bounded six-session diagnostic exceeded its observation timeout;
it was not treated as six production failures or a reason to restart them.

## Same-session continuation

All six v296 actors drained through the normal pause API, retained settled paid
replies, and exited before loading v297. Pause markers were renamed, not deleted.

v297 PIDs: A23736, B23738, C23740, D23742, E23744, F23746.
Logs in each existing generation directory:
`resume-history-handoff-v297-20261017.log`.

Ordinary-request observation (not only a local test): C106/D113/E151/F107
contain historical directories with 141/159/70/83 originals respectively.
E150→151 preserves archive `b636f73c…`, all seven answers, and advances the
reader from step36 to37 rather than resetting it; E151 reached response_received.
D113 now reports the old421bd3 original's incorrect `/result/...` field paths
as exact path errors, not RECEIPT_UNKNOWN. It still has seven model-written
path errors, E151 one; these require model-owned correction, not invented
values. This observation is not final convergence or final strategic admission.

Normal continuation is `--resume-product --generation=264` for A/B;
`--resume-product --generation=274 --matrix-v274` for C–F. No recover-unstarted,
room reset, receipt re-signing, allowance refill or ledger reset.

Settled current-generation accounting at the switch: **790 calls,
113,276,334 input units, 2,561,674 output units**. This is not a service-provider
invoice. Prior generations and unknown fees remain in their original ledgers.

## Next required evidence

- Confirm ordinary paid requests actually receive historical navigation without
  resetting existing reader steps, then observe their own revised conclusions.
- Finish material unresolved questions using correct scenario-scoped evidence;
  do not confuse zero citation-format failures with complete strategic coverage.
- D must still reach a legal 2000-point roster; all six need final Plan/source
  admission before any battles. A valid conditional strategy need not pretend
  that a future opponent move is already observed, but its predicates and
  supporting facts must be explicit.

No commits, dependency changes, data refresh, deletion or subagents.
