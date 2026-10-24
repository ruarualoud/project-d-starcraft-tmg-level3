# Slice 248 — C111 native field layout, isolated v26

## Result and limits

The owned full-query process 86565 exited 0. All 19 Rules instantiations,
four complete options and the full response match the saved v24 reference.
Full result hash: `f16366fe792e71af191def9600faf53cfe270f1670316314204f5a868c48d658`.
No Provider calls, Rules Apply, original-room writes or performance promotion.

| Measurement | Saved v24 | Isolated v26 |
| --- | ---: | ---: |
| Full query wall time | 204.204 s | 100.630 s |
| Process CPU, including owned workers | 179.893 s | 167.494 s |
| Actual instantiations / options | 19 / 4 | 19 / 4 |

Wall improvement is 50.72%; CPU improvement is 6.89%. These are separate
observations, not an attribution of the entire wall improvement to the patch:
the original cohort entered all-stop during this experiment, changing CPU
competition. This remains one Charge case, not whole-action latency, all-type
admission or the required full-round / median-and-tail / no-regression evidence.

## Concrete defect and delivery

The original canonical native assessment helper sorted the same field layout
for every terrain assessment. Actual 1804 terrain rows produced 1916 sorts
over two assessments while containing just one key layout.

Concrete field-layout gate 82308 is RED with
`C111_IDENTICAL_NATIVE_FIELD_LAYOUT_RESORTED_PER_ASSESSMENT`.
After the isolated change, the unique GREEN 83767 sorts once. All first/second
assessment bodies, 1804 rows and hashes remain equal. Small-case CPU
0.757730 -> 0.732736 s; wall 1.777142 -> 1.090503 s.

The private context retains a verified key order and sorted template. Every
value is overwritten on each call; changed key names/order/count rebuild the
layout. Undefined fields retain ordinary JSON omission semantics. Existing
flat validation and nonflat canonical fallback remain unchanged. The original
override-key JSON lookup remains intact: this is not a retry of rejected v25.

Clean isolated source is
`build/ticket-23-three-arm-performance-baseline-20261010-v1/isolated-elevation-layout-v26-source/packages`.
Only the six required call-chain modules are copied; other dependencies remain
original symlinks. Diagnostic kernel copies are separate and must not load into
a Host. No full room/database/asset copy was created.

Evidence under the base `C/` directory:

- `C111-native-field-layout-red-v1.report.private.json`
- `C111-native-field-layout-green-v1.report.private.json`
- `C111-full-solver-v26-layout-candidate-v1.report.private.json`

The full gate uses the real asynchronous solver, frozen V1-to-V6 runtime,
real comparison workers and shared CPU coordinator. It reads the saved v24
reference rather than rerunning it. No previously passed gate was repeated.

## Original-room stop, independent of this candidate

Common correctness source remains
`s248-v23-C120-reachable-endpoint-proof-v42-20261012`; v24/v25/v26 were not loaded.
At 00:32:55Z the monitor requested all-stop after B133's
`LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE`.
Hosts exited; all six Provider ledgers contain only completed/failed attempts,
with no reserved/dispatched/ambiguous attempt. The passive C driver remained
after SIGTERM for over ten minutes, with Hosts absent. Its exact original birth
was checked before terminating that passive process only. Monitor closed the
stop at 00:45:53.155Z.

Actual sealed native revisions: A132 / B133 / C135. UI/action records were
A131 / B133 / C134; A/C accepted-ahead receipts require reconciliation, not
another Apply. All are Round 3 Assault. B133 is the original six-model Marine
charge resolution, original roll 6 and 10000 milli-inch cap. Its sole mandatory
continuation was excluded after an unknown zero-option formation query.
The concrete B133 original-state gate is now running; no root cause or repair
is claimed yet. Original paid intent/dice/rooms/Plans/fees remain intact.

The B111 extra gate has already passed historically; do not rerun it. Standing
user approval allows one extra focused validation only after a root cause is
clear and a fix implemented, not unchanged retries or repeated passed gates.

Counts unchanged: Ticket23 33/36, Ticket27 5/6, remaining S248/272/249/250,
complete games 0/12. No commit, install, cleanup, subagent or K3 work this round.
