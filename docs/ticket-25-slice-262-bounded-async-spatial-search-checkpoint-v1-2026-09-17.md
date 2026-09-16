# Ticket 25 / Slice 262 — bounded asynchronous spatial search checkpoint

Date: 2026-09-17

Status: product implementation 4/4; acceptance evidence 3/4. The Slice remains
open until one natural live decision observes the changed prompt projection.

## Scope delivered

1. The spatial query runtime now deduplicates exact query receipts only inside
   one Room/seat/visibility/revision/state/LegalSpace/observation snapshot. A
   revision change evicts the old completed receipts, and a late old promise
   cannot populate the current snapshot. Process memory is bounded to 64 scopes
   and 128 completed receipts per snapshot by default.
2. Formation search still generates deterministic intent candidates, performs
   cheap exact physical-overlap pruning, lazily Rules-instantiates survivors and
   keeps its existing per-model local improvement. The receipt now discloses
   the generated/examined/instantiated denominator and whether a better
   unexamined option may exist.
3. Every exact exposed layout is retained. Options sharing the same objective
   contract receive a bounded Pareto-front analysis; dominated options are
   labelled, never hidden. The Agent remains free to select any exact exposed
   option and must provide a public formation strategy reason. Host geometry
   search never becomes tactical authority.
4. The existing match-continuity scheduler owns a cancellable asynchronous
   pre-execution job. A changed authority snapshot aborts/stales the old job;
   no pre-execution result blocks the live decision, mutates the Room or becomes
   training truth. The previously omitted implementation module is now included
   in the product source set.

The compact Action-stage prompt now carries `searchCoverage` and
`paretoDiversity`. Before this Slice the durable receipt held the full layout
metrics but this final comparison metadata was silently omitted from the model
projection. The final choice contract is therefore explicit:

- Agent: tactical purpose, weighted objectives, final complete option ID,
  optional identity-to-slot assignment, public formation reason and expected
  counterplay;
- Host/MCP: candidate generation, official physical geometry, complete
  per-model coordinates and exact Rules instantiation;
- Rules: final preview/Apply authority.

This is an intent-driven optimizer, not a fixed formation-template catalogue.

## Performance and convergence evidence

The existing authoritative revision-36 Standard-2000 18-model regression is
still the accepted heavy-search evidence. It preserved the same six option IDs
and order, generated 273 candidates, rejected 267 by exact physical overlap,
Rules-instantiated six and completed the search segment in 15,597 ms with zero
Provider calls. The S262 Pareto pass is bounded by at most eight exposed options
and does not change generation, pruning, instantiation, option IDs or order.

The historical performance verifier had become coupled to the old latest
checkpoint at revision 32 while the durable Room had advanced to revision 120.
The verifier now selects the nearest stored checkpoint at or before revision 36
and builds its contiguous replay tail dynamically. Three focused convergence
cycles were consumed:

1. the stale hard-coded checkpoint assertion failed immediately (`120 != 32`);
2. replaying from revision zero did not reach the measured search in a useful
   time and was stopped;
3. selecting the historical checkpoint removed the correctness defect, but the
   fixture/replay setup still did not reach the measured search after 15 minutes
   under the current loaded workstation and was stopped.

No fourth retry is allowed. This is retained as a Medium evidence-infrastructure
finding, not a Rules or product-search failure. The directly affected syntax
gate passed once for all five touched modules. The earlier focused mission-marker
formation regression also passed after the search changes: one official target,
2,740 milli-inch nearest-edge distance and zero Provider calls.

## Remaining acceptance item

Because the compact prompt now includes Pareto/search coverage, the next natural
live formation decision must record:

- the exact option set and frontier metadata visible to the Agent;
- the Agent-selected final complete layout and public tactical reason;
- exact Rules preview/Apply and Replay equality;
- latency/cache/pre-execution facts available at that authority snapshot;
- `no_observed_negative_strategy_effect`, or a concrete regression finding.

That single natural canary closes S262 before it is reused as the first S263
live-strategy evidence. It must not repay or rerun the old historical gate.

## Cost

This checkpoint made zero Provider calls. The live match ledger remains 404
calls, 21,363,132 input tokens, 919,794 output tokens, 22,282,926 total tokens
and estimated CNY 34.758890. The CNY 100 notification threshold is not reached.

