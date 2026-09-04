# Ticket 17 Slice 169 — real DSH executor and safe Session receipt

Date: 2026-09-04

Status: complete

Ticket progress: 7/9; Slices 170–171 remain

Project progress: 15/22 Tickets complete; Ticket 14 remains 15/16

## Outcome

Slice 169 connects the pinned `@deepseek-ai/dsh@0.1.1-rc.2` runtime to the
same credential-free Provider broker used by the Slice 168 direct-control arm.
All seven model roles run through real DSH Agent and Session services in fixed
order:

`Planner → Tutor → Student → Challenger → Reasoner → Proposer → Generator`.

Fact Judge and Cross-Time remain independent deterministic nodes. After both
gates close, an eighth real DSH Session exposes only
`emit_candidate_skill`; DSH invokes it exactly once in a two-step tool loop.
The tool returns an unreviewed, non-authoritative candidate acknowledgement.
It cannot publish a Skill, affect Rules, operate a Room, write Memory or create
training truth.

## Isolation and Provider bridge

Each role DSH process receives the frozen staged request and pinned runtime,
but no Provider credential, direct network, repository, Room, Rules mutation,
Skill registry or training capability. Its only model path is a bounded
filesystem relay mediated by the host:

1. DSH emits one hash-bound role request;
2. the host validates role order, job/request/packet hashes and ordinal;
3. the existing Ticket 16 Provider Worker is called through the common broker;
4. one response containing the typed role output and usage receipt is returned;
5. the relay records request/response hashes, then the disposable environment
   is destroyed.

There are exactly seven Provider bridge requests and seven physical fixture
attempts with zero automatic retry. The candidate-tool Session makes no
Provider call. A second request, sensitive request, crash, timeout or early or
duplicate candidate emission fails closed.

## Session redaction and receipts

The exported Session evidence preserves event order/type/time, turn and step,
message role/source, usage, finish reason and tool-call lineage. User/model
content, chunks, tool arguments and tool results are replaced by SHA-256
commitments. Absolute job paths are normalized. Any credential-shaped key or
value crossing the staged-input, relay or output boundary rejects the whole
run. The already-verified Provider cost-authorization receipt is projected as
a `costGrant` with `grantHash`, so the new Session retains independently
reconstructable forecast evidence without weakening the byte-frozen legacy
credential scanner or persisting an authentication-shaped field.

The composite execution Session binds all seven DSH parse receipts, the
candidate-tool receipt, Provider usage/pricing/forecast/settlement receipts,
OS isolation receipts, runtime/config/tool schema hashes and the role-graph
result. The resulting candidate bundle and standard RunReceipt remain
unreviewed and promotion-ineligible for Ticket 18.

## Verification evidence

- focused Slice 169 checks: `19/19`;
- predecessor disposable-isolation regression: `17/17`;
- DSH version: `0.1.1-rc.2`;
- executor config: `1f8756f4...bf301f`;
- candidate tool schema: `bae55cb9...8f090`;
- role graph run: `546a4717...4930d`;
- DSH execution Session: `797410fc...1f9dd`;
- candidate bundle: `9202f239...c22e9`;
- complete RunReceipt: `8e18f20e...b8fa9`;
- report: `build/ticket-17-skill-generation-v1/slice-169-report.json`;
- report hash: `0c23d0e2...cca56`;
- full Ticket 15→Ticket 16→Slices 163–169 aggregate: exit `0` in
  806.72 seconds.

The deterministic verification uses an injected Provider Worker and records
zero external calls, zero billable tokens and `¥0` new cost. No official
StarCraft source refresh occurred.

## Performance boundary and next slice

The final deterministic Slice 169 verifier measured 337.33 seconds locally.
Caching the content-verified runtime manifest avoids seven redundant 35,962-
entry hash walks, while each DSH Session still receives its own disposable
directory and cleanup receipt. Repeated runtime-tree staging remains the main
fixed cost and is an explicit Slice 171 efficiency/operations gate; it is not
hidden as production-ready behavior.

Slice 170 is the single bounded real DSH-on/direct-control comparison on one
frozen `how_to_play` task. It requires a fresh secure Provider ingress, a
pre-egress cost forecast and actual usage/cost receipts. Both outputs remain
unreviewed; large-scale four-family production still requires separate user
approval.
