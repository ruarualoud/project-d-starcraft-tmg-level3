# Ticket 17 Slice 168 — common Provider broker and DSH-off control

Date: 2026-09-04

Status: complete

Ticket progress: 6/9

Project progress: 15/22 Tickets complete; Ticket 14 remains 15/16

## Outcome

Slice 168 implements the single Provider boundary that both Ticket 17 arms
must use and the actual DSH-off role executor. The broker composes the real
Ticket 16 isolated Provider Worker and receives only an opaque `workerRef`.
Raw credential bytes remain in that credential child and are never accepted by
the broker, direct-control executor, DSH process, prompt, Session or evidence.

The server-owned offline profile is fixed to the same endpoint, model and
sampling contract for both arms:

- Provider: `deepseek-openai-compatible-direct`;
- endpoint: `https://api.deepseek.com/chat/completions`;
- requested model: `deepseek-v4-flash`;
- temperature/top-p: `0 / 1`;
- output ceiling: `4,096` tokens;
- physical attempts: one per model role;
- Provider/DSH/control internal retries: zero;
- profile hash: `11baf885...33280`;
- egress policy hash: `b9cb8f6e...cd173`.

## Common prompt and direct-control execution

The common compiler accepts either a `dsh` or `direct_provider_control` job,
but excludes the execution-arm identity from the Provider prompt. A paired job
with the same staged current source, prompt pack, tool schema and role request
therefore produces the same prompt/request hashes. Every request binds the
current official staged-input hash and the Slice 165 role-graph hash.

Only the seven bounded model roles call the Provider:

`Planner → Tutor → Student → Challenger → Reasoner → Proposer → Generator`.

Fact Judge and Cross-Time remain independent deterministic gates. A model role
cannot invoke `emit_candidate_skill`; the post-Cross-Time cardinality
controller still owns the only candidate emission. The direct-control
executor enforces exact role order, one attempt per role and no retry. It
materializes a safe Session containing each Provider usage, pricing, forecast
authorization and settlement receipt, so an independent reader can recompute
input/output/cache-hit/cache-miss/reasoning/total tokens and cost. Raw prompts,
responses, reasoning, worker locators and credential material are absent.

## Cost guard and ¥100 notification

The guard binds the Ticket 16 audited baseline of `2,424` input + `44` output
= `2,468` Provider tokens and `562,320` nano-USD (`$0.00056232`). Forecasts use
the worst frozen peak/off-peak rate, treat all input as cache-miss, and use a
conservative `8.000000 CNY/USD` budget ceiling. That conversion is explicitly
not a market quote or invoice claim; the Provider invoice remains
authoritative. The policy hash is `6e9b2579...77e10`.

Before an attempt whose cumulative forecast crosses `¥100`, `¥200`, `¥300`,
and so on, the guard delivers one notice for every crossed tier and requires a
delivery acknowledgement before calling the Provider Worker. Notification is
not spend approval and does not authorize bulk Skill generation. Missing or
bad delivery fails closed before egress. A definitely-not-sent failure costs
zero; an ambiguous/unsafe post-dispatch result is conservatively charged at
the full forecast and never retried.

The Slice 168 ledger is process-memory state. Ticket 18 owns its durable
SQLite/PostgreSQL scheduler-store integration, leases, fencing and crash
recovery. This limitation is explicit rather than presented as production
durability.

## Verification and authority

- Slice 168 focused checks: `33/33`;
- predecessor pinned-DSH checks: `23/23`;
- combined focused gate: pass;
- full Ticket 15 → Ticket 16 → Slices 163–168 aggregate: exit `0`;
- final Slice 168 report hash: `f152cdb0...e5fae`;
- cost policy: `6e9b2579...77e10`;
- direct-control runtime: `0e65ce64...ecae`;
- deterministic direct-control Session: `ccb00d25...f636`;
- latest report: `build/ticket-17-skill-generation-v1/slice-168-report.json`.

All Provider calls in this Slice use an injected deterministic Worker port;
external Provider calls and new billable tokens are zero. No official
StarCraft source refresh occurred. No candidate was produced or published, no
Memory was written, and no Rules, Room, Skill promotion, MuZero, self-play or
training-truth authority was granted.

Slice 169 is next: connect the pinned DSH Agent/Session lifecycle to this same
broker, implement the candidate tool bridge, redact the real Session and emit
the complete safe RunReceipt under the disposable OS boundary.
