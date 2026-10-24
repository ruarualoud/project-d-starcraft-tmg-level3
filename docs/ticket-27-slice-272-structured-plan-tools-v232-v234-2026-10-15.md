# Ticket27 / Slice272 — structured Plan modification tools

## Scope and user decision

Models choose roster alternatives and explain strategy. Executable tools own
mutation, authoritative cost/legality calculations and execution receipts. Plan
arguments should be structured, not a model-authored proof of successful work.
A's fixed roster remains fixed; B can reselect through the existing Builder
workflow. A Plan-only editing operation must not claim B is strategically unable
to choose a different roster.

T27 remains **5/6**, T23 **33/36**, main remaining slices **272/248/249/250**.
Four games STOPPED; accepted complete comparison games **0/12**. This is not
completion of maps, games, Teach, or the full original goal.

## Actual changes

1. `roster-plan-edit-tools-v1.mjs`: executable `plan.fill_argument` port with an
   input schema and `callTool` result. The model fills intent, actions, causal
   reason, alternatives, conditions, and selects host-delivered fact IDs. Host
   resolves the original values/scopes and renders compatible public Plan text.
   No model-owned price, success flag, receipt or version is accepted as a tool
   argument. Free strategic prose remains advisory and still needs review.
2. Shared Strategist revision stages calls, returns typed errors, retains valid
   calls and applies all requested fields through the EXISTING Plan builders.
   Incomplete batches do not mutate the Plan. A bad fact ID gets focused feedback,
   not a new whole-Plan generation. At most two corrective replies after the
   initial reply; saved-evidence reads retain their separate existing allowance.
3. Workspace new targeted revisions use this protocol; interrupted paid legacy
   responses retain their original format/context. Tool execution history is
   persisted and projected to callers. Rules, roster, schedule and VP targets
   remain unchanged in this text/argument editing operation.
4. Secure factory validates its local output schema BEFORE dispatch and detaches
   its schema copy from mutable caller data. This fixes a newly reproduced case
   where our own malformed schema was found only after a paid response arrived.

This is an executable MCP-style tool port over the existing structured-output
Provider Adapter, **not** a newly deployed standalone MCP server or a claim that
native DeepSeek function-calling transport is enabled. The production profile
still uses its existing structured JSON transport. Initial Plan generation and
all other mutation entry points are not claimed fully migrated. Actor/region/
phase intent is currently in the structured argument's actions/conditions prose;
this is not yet a fully typed tactical-plan graph.

## Evidence and verification (do not rerun passed gates)

Evidence root: `build/ticket-23-three-arm-performance-baseline-20261010-v1`.

### v231 previous source qualification completed

- One Kimi request, 269453ms terminal, 281399 input + 12821 output = **294220 tokens**.
- Seven findings source-qualified, **zero unbound qualification items**.
- Two source-supported claims no longer block; five effective High remain on
  `scoreRoute.routeText`, `publicSummaryText`, `componentPurposes.u-marauder-1`.
- Known temporary Kimi total **946576 tokens**, excluding unknown interrupted
  attempts and old DeepSeek usage. Subscription money was not reported.
- Candidate20 remains unpromoted; original A Plan9/B Plan19 unchanged.

### v232 actual workspace tool gate

`scripts/verify-slice272-plan-edit-tools-v232.mjs <base> red|green`

- RED reached the real revision model seam and reported
  `ACTUAL_WORKSPACE_REVISION_HAS_NO_EXECUTABLE_STRUCTURED_PLAN_TOOL`.
- One GREEN passed. Two valid calls retained while one invented fact ID failed;
  one corrective local model reply filled only that missing field; one atomic
  revision applied three fields. Host bound value 20 from the real source packet.
- Plan version advanced once; roster/schedule/VP targets unchanged. Forged tool
  receipt rejected. Source draft unchanged; zero Provider/Native/game calls.
- The observation REPL timed out/reset while awaiting the existing process;
  read its completed result file instead of restarting the test. The green file
  proves completion. No passed verification was repeated.
- This tests protocol execution/recovery, not the correctness of synthetic
  strategy text or a real model's strategy quality.

### v233 real DeepSeek recovery probe and local contract bug

- Official status page showed all systems normal. One fresh tiny request through
  the original secure Flash path actually returned, about two seconds end-to-end,
  **382 input + 23 output = 405 tokens**; dispatch `response_received`, cost known.
- Its local diagnostic schema was malformed: string bounds absent, and boolean
  enum unsupported by our strict subset. Validation threw after the response.
  This is OUR probe/contract-order bug, not poor model output. The actual public
  reply was not retained by that throwing path, so do not claim its semantic
  JSON acceptance was verified. Original failure/usage retained, no paid resend.
- `verify-slice272-schema-preflight-v233.mjs`: RED reproduced one Worker send
  before local-schema failure. First GREEN caught the second boolean-schema
  issue before any send; corrected that explicit issue, GREEN2 passed. These
  are three executions, all zero Provider. Invalid schema sends zero; corrected
  schema passes through the real secure factory with one injected local Worker.

## v234 terminal — tool correction worked, candidate is NOT acceptable strategy

`scripts/run-slice272-B-structured-tools-v234.mjs <base>`

- Runner PID6652; original workspace `repairReviewedPlan`, **one** additional
  bounded cycle under the standing post-source-fix allowance. Old review counts,
  paid records, unknown fees and original Plan are not reset.
- Imports actual candidate20 + v231 qualified review + v224 repair coverage and
  Teach delivery. Only the three affected paths are targeted.
- Uses production secure Flash Adapter, explicit offline600s per request, no
  automatic network retry, no new Native investigation or room startup.
- First revision request21 sent06:02:17.202Z, context
  `a366a50927d048ce410681672e106c2e1c4883f878fbddd8ffd1e2770673b2a4`,
  prompt nodes **1724475 bytes**. Input has not been reduced; the fact-ID index
  adds overhead. Do not claim token/latency improvement before measurement.
- Historical observation files: `common-v234-B-structured-tools-progress.private.json` and
  `B/structured-plan-tools-v234/workspace-checkpoint.private.json`. Requests are
  gzip archived. Check same PID/dispatch; never restart on observation timeout.
- Success requires corrected candidate + incremental review/source qualification,
  not merely tool success or a green structural schema. Any result remains a
  candidate pending the original production promotion procedure.

Finished06:04:09.760Z; PID6652 is no longer live. **Do not restart v234.**

- Two real Flash replies, **59199ms / 33321ms** Provider latency;
  551734 + 553381 = **1105115 tokens**. First input542747/output8987;
  second input548398/output4983,542336 cached input. Frozen project peak-Flash
  rate estimate **USD0.184623084**, not a provider invoice or newly refreshed price.
  The separate405-token probe estimate is USD0.0000711 using the frozen off-peak
  table. Unknown earlier costs remain unknown, not reset or treated as free.
- The first reply staged routeText but invented one nonexistent fact ID in both
  other calls. Host returned `PLAN_EDIT_FACT_UNKNOWN`; second reply corrected
  only those two calls, and the original runtime committed candidatePlan21
  `0b6d23d9ea18aee6a8d32735fa18d22d376dacc854d56a886fa8583334e14a0b`.
- This is real automatic tool-argument recovery, not manual replacement. Three
  edits carry101/91/91 fact references, far too broad to claim efficient evidence
  selection. The added flat fact catalogue has5572 rows/782705bytes, including
  368004bytes of repeated source paths and162530 ID bytes. No input optimization
  is claimed. Keep complete strategy context; compact/search the fact index next.
- **Semantic failure:** actions/alternatives describe rewriting, retaining or
  deleting sentences instead of final in-game actions/strategic alternatives.
  Some old strategy is only referred to as “keep unchanged” but is NOT actually
  retained by whole-field replacement. Therefore candidate21 cannot be adopted,
  even though tool calls and structural Plan validators passed.
- Prompt descriptions now explicitly require the FINAL strategy itself, preserve
  still-relevant content explicitly, distinguish game choices from editing
  choices, and select only directly supporting facts. This description fix has
  **not yet been real-model validated**. It changes task semantics only; no old
  structural gate was rerun as a supposed proof of model quality.

### v235 experiment-checkpoint concurrency repair

The automatic job stopped before review began with ENOENT. It had overlapping
workspace/event saves renaming the same temporary file in this experiment runner;
the production draft store already uses distinct temporary names. Extracted that
exact runner write seam, reproduced two concurrent ENOENT failures in one RED,
then one GREEN passed with a serialized writer and last-submission-wins readback.
No Provider call/revision/game was rerun. Passed results:
`common-v235-checkpoint-red.private.json` / `common-v235-checkpoint-green.private.json`.
The completed model replies, candidate21 and tool execution history remain saved.
This local recorder failure is not a provider outage or an exhausted review loop.

## Remaining deliveries

1. No request remains in flight. Resume from saved candidates/evidence, not a
   restarted room or repeated v234 request. Complete final-strategy semantics
   and fact-index delivery, then perform a new clearly versioned bounded repair
   against the last usable candidate20. Candidate21 is diagnostic, not accepted.
   Preserve both paid replies and costs; independently review the resulting Plan.
2. Complete A's original Omega evidence gap; no fabricated geometry or paid retry
   quota reset. Then apply the common accepted Plan/tool contracts across A/B.
3. Extend typed Plan filling to initial/non-targeted generation and expose the
   same mutation surface to other consumers; preserve the existing Builder as
   sole roster mutation/legality authority. Do not label this migration done.
4. Finish accepted plans before same-code games, round2 scoring checks, complete
   comparison runs and replay/skill-evolution work. Map/20-layout acceptance debt
   remains part of the original goal, not removed by this local repair.

## Harness record

`harnessLoopUsed:true`; game StarCraft TMG. Routes: offline revision/Teach review,
not live opponent play. Tools: `plan.fill_argument`, retained evidence, original
Builder/Plan validators. UI trace: none this turn. Decision evidence: model public
tool arguments and subsequent independent review, not private reasoning. Memory:
source plans and tool histories retained. Training candidates: all false.
Demotion: invalid/unsupported semantic claims keep candidate unpromoted; tool
success cannot waive a Rules rejection or independently approve strategy.
