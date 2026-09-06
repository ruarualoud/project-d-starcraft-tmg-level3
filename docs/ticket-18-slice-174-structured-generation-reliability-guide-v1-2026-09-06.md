# Ticket 18 / Slice 174 — structured generation reliability optimization guide v1

Date: 2026-09-06. Scope: StarCraft TMG offline Skill production, later Room
agents and postgame Skill evolution. The frozen official game-source snapshot
is unchanged. No Codex subagent was used. This guide changes no historical
attempt, Skill acceptance or Ticket denominator.

## Executive decision

Stop paying for prompt-only format retries on full production context. Replace
the current collection of role-specific prompt fixes and parser exceptions with
one schema-first, validator-driven, durable generation module.

There is no single industry mechanism that makes model output factually correct.
The reusable production pattern is a layered combination:

1. provider-enforced structured output for syntax and shape;
2. host-owned control fields and deterministic materialization;
3. typed validation and failure classification at every seam;
4. durable, idempotent workflow execution with bounded class-specific retry;
5. external evidence, Rules, replay and held-out evaluation for meaning;
6. versioned promotion and rollback for learned strategy.

This document calls the combination **schema-first staged durable generation**.
That is a Project D name for the combined pattern, not a claimed external
standard. DSH remains the isolated agent harness and execution loop. It is not
the JSON decoder, Rules authority, semantic judge or publisher.

No further full-context paid faction production should start until workpoints
174-R1 through 174-R5 below pass. This is a stop-loss decision, not a claim that
the five Skills are complete.

## Incident evidence

The latest run `faction-v1-9a88d1a1008f0bb079ba` is terminal with
`PROVIDER_RESPONSE_JSON_INVALID`. Both format attempts ended normally with
`finishReason=stop`, emitted 595 output tokens and failed at UTF-16 offset 1347.
They used 544,805 tokens and estimated ¥0.291916. Global cumulative use is
97,378,604 known tokens and estimated cost plus historical reserve is
¥61.688098. There is no 402, ambiguous intent or running paid step.

For the same objectives editor 0.1, the journal contains eight failed paid
attempts across four terminal runs: 2,179,721 tokens and estimated ¥0.695443.
Every response ended with `stop`; none was a network disconnect or output-limit
truncation. Earlier outputs failed at offsets 685/709; the latest smaller
model-owned recommendation still failed at 1347. Changing host identifiers and
examples removed real defects, but did not eliminate the transport class.

The latest attempt is especially diagnostic:

- format 0: 271,803 input + 595 output = 272,398 tokens;
- format 1: 271,812 input + 595 output = 272,407 tokens;
- the second request hit cache for 271,744 input tokens but returned the same
  invalid structure;
- the semantic payload is about 2.1 KiB, yet each formatting attempt transports
  the complete roughly 272K-token role context.

Therefore another identical full-context retry is neither a useful experiment
nor a reasonable recovery policy.

## What the current code gets right

The redesign must retain these properties:

- [`store.mjs`](../packages/skill-production/store.mjs) records intent before
  egress, settles usage before semantic validation, rejects ambiguous retries,
  enforces budgets and uses CAS-style step leases.
- [`loops.mjs`](../packages/skill-production/loops.mjs) bounds model/tool calls,
  mediates the DSH process and verifies its sandbox receipt.
- [`dsh-skill-executor-v1.mjs`](../packages/skill-generation-runtime/dsh-skill-executor-v1.mjs)
  pins DSH, disables its internal retries and grants no Rules, Room, publishing,
  credential or training-truth authority.
- faction source hashes, complete parent drafts, issue journals, pre-apply
  regression guards and independent review evidence are already retained.
- successful historical role artifacts are content addressed and reusable;
  failed attempts remain failed evidence rather than being rewritten.

The incident is not evidence that DSH scheduling, the SQLite ledger or the
official-source lock failed.

## Current seam misalignment

The present interface asks multiple layers to infer a contract that only exists
in prompt prose:

| Seam | Current behavior | Consequence |
| --- | --- | --- |
| Faction workflow → model runtime | Instruction contains an example, but no `outputContractRef` | Each role invents its own wire expectations |
| Model runtime → egress request | `responseContract` carries only allowed channel names | The actual eight-field editor schema disappears |
| Provider profile → transport | Only `prompt_only` or `json_object` is expressible | No capability negotiation for JSON Schema |
| Transport → DeepSeek | Sends `response_format:{type:"json_object"}` | Requests an object, not the role's exact shape |
| Provider output → runtime | Parses JSON, then separately checks `channels.skill` | Syntax, command envelope and role content are coupled |
| Format recovery | Reissues the entire role with “repair formatting” | A deterministic content-specific defect repeats at full input cost |
| Failed response → recovery | Persists only usage/hash/shape/offset | The next attempt cannot repair the previous payload and regenerates it |
| Local editor → context | Receives the complete global prompt again | 595 output tokens require about 272K input tokens |
| Workflow evolution → cache | Prompt byte changes alter completed role tasks | A small output fix can invalidate expensive upstream work |

Relevant code evidence:

- [`model.mjs`](../packages/skill-production/model.mjs) lines 59–79 classify
  JSON failure as format-retryable and send the full normalized conversation
  again; lines 80–81 expose only an allowed-channel contract.
- [`provider-egress-transport-v1.mjs`](../packages/secure-provider-runtime/provider-egress-transport-v1.mjs)
  lines 250–289 compile only a prompt contract and `json_object`; lines 301–329
  parse the text without access to a role schema.
- [`provider-profile-registry-v1.mjs`](../packages/secure-provider-runtime/provider-profile-registry-v1.mjs)
  lines 100–125 can bind only `prompt_only/json_object`.
- [`provider-response-outcome-v1.mjs`](../packages/secure-provider-runtime/provider-response-outcome-v1.mjs)
  records safe structure and offsets, which is good audit evidence but
  insufficient for payload-level recovery.
- [`faction-strategy-workflow-v1.mjs`](../packages/skill-production-v3/faction-strategy-workflow-v1.mjs)
  lines 508–544 correctly moved identifiers to the host, but still relies on the
  same unconstrained outer JSON command.

There are also two partially overlapping production dialects: the Ticket 17
broker/compiler family has compact exact templates and a 64 KiB model projection,
while the faction path calls `createAccountedModel` with a full-source task.
Adding another broker version beside both would increase drift. The replacement
must be one deep module used by both paths through adapters.

## External evidence and what it does not prove

DeepSeek's Chat Completions JSON mode requires `response_format=json_object`, a
JSON instruction and an example. Its own guide also acknowledges occasional
empty content. The current project already supplies the requested mode and
examples; actual invalid results mean the contract must be verified empirically,
not assumed from documentation.
[DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)

DeepSeek's current Responses API exposes `text.format` with
`json_schema`, and the API reference describes the result as conforming to the
provided schema. This is the preferred capability to probe for finish-only
roles. The Responses API is stateless, so Project D must continue to own history,
continuation and checkpointing.
[DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/),
[DeepSeek Responses guide](https://api-docs.deepseek.com/guides/responses_api/)

DeepSeek also documents strict function calling in beta. It can be a separate
adapter for interactive tool roles, but only after an exact endpoint/schema
probe; it must not be silently substituted for JSON Schema output.
[DeepSeek strict tool calls](https://api-docs.deepseek.com/guides/tool_calls/)

JSON Schema Draft 2020-12 separates the core language from validation. Project D
should use a declared supported subset, validate the schema itself at build time,
and validate every instance locally even when a provider claims enforcement.
[JSON Schema specification](https://json-schema.org/specification),
[JSON Schema validation vocabulary](https://json-schema.org/draft/2020-12/json-schema-validation)

Cross-vendor structured-output guidance makes the same important distinction:
constrained/schema output can guarantee shape but cannot guarantee that values
are factually or strategically correct. That is why Project D retains separate
Rules/evidence/evaluation gates.
[OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)

For workflow recovery, industry guidance limits retries to classified transient
failures, verifies idempotency, caps attempts/time and uses backoff with jitter.
A timeout does not prove that no external effect occurred.
[AWS retry guidance](https://docs.aws.amazon.com/wellarchitected/2023-04-10/framework/rel_mitigate_interaction_failure_limit_retries.html),
[AWS idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

Durable execution systems reconstruct progress from history after crashes. We do
not need to adopt Temporal, but its execution model corroborates keeping workflow
state in an event history instead of reconstructing it from process memory.
[Temporal documentation](https://docs.temporal.io/)

For semantic improvement, evaluator–optimizer is appropriate only where criteria
are explicit and measurable. Agent evaluation should combine grader types and
environment evidence; an LLM judge alone is not a truth source.
[Anthropic agent workflows](https://www.anthropic.com/engineering/building-effective-agents),
[Anthropic agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

DeepSeek context caching is exact-prefix/best-effort. Stable common material must
come first and volatile role data last; cache hits must be measured from usage,
not promised by the recipe.
[DeepSeek context caching](https://api-docs.deepseek.com/guides/kv_cache/)

## Target architecture

The new design has one external seam and five internal planes:

```text
Skill workflow
    |
    | generateStructured(roleRef, contextRef, outputContractRef, policyRef)
    v
Structured Generation Runtime
    +-- control plane: IDs, schema refs, budget, retry class, state
    +-- context plane: immutable base + dependency closure + local issue
    +-- execution plane: DSH loop and tool mediation
    +-- provider plane: capability-selected adapters
    +-- evidence plane: receipt, usage, validation, issue and lineage DAG
    |
    v
host materialization -> source/Rules guards -> independent eval -> promotion
```

### External interface

Callers should need one operation:

```js
generateStructured({
  roleRef,
  contextManifestRef,
  outputContractRef,
  executionPolicyRef,
  continuationRef
})
```

It returns exactly one sealed outcome:

```js
{
  status: "accepted" | "quarantined" | "retryable" | "stopped",
  candidateRef: null | { hash, contractHash },
  issueRef: null | { hash, class },
  receiptRef: { hash },
  usage: { input, output, cacheHit, cacheMiss, estimatedCny }
}
```

Provider payload shape, endpoint dialect, parser recovery, retries and raw
quarantine are implementation details. Tests and callers use the same external
interface. Production and in-memory fault-injection adapters make the provider
seam real.

### Provider capability profiles

Capabilities are explicit, probed and content addressed:

| Capability | Production use | Rule |
| --- | --- | --- |
| `responses_json_schema` | Preferred for finish-only and fixed-shape roles | Exact local schema validation still required |
| `strict_function_schema` | Tool-capable DSH roles after beta probe | Provider tool event is mapped by host to an internal command |
| `chat_json_object` | Compatibility/canary only | Never authorize a full expensive role after this incident |
| `prompt_only` | Development diagnostics only | Never qualifies formal Skill production |

The capability receipt binds provider profile hash, endpoint path, model,
response dialect, schema-subset version, probe input/output hashes, status,
usage and expiry. Missing, expired or changed capability fails before Keychain
attachment and before a full prompt is compiled. There is no silent fallback.

### Schema registry

Every model role uses a registry-owned schema:

- immutable `outputContractRef={id,version,hash}`;
- Draft/subset identifier;
- exact required fields and `additionalProperties:false`;
- bounded arrays and string sizes;
- semantic annotations kept outside the provider schema;
- host fields absent from the model schema;
- one deterministic mapper from provider result to the internal role value.

The same contract hash is bound into the workflow role, Provider request,
transport receipt, local validation receipt, stored artifact and continuation
manifest. A mismatch at any seam is `CONTRACT_CHAIN_DRIFT`, not a model retry.

For the current editor, the model schema contains only the eight advice fields.
`index`, `parentHash`, issue route, replacement/addition arrays, revision,
acceptance and publication status are host-owned and impossible for the model
to author.

### DSH integration

DSH keeps responsibility for:

- isolated execution and pinned runtime/config;
- sequential agent/tool loop and bounded tool authority;
- session/event receipts and harness comparison;
- exposing source/Rules tools under host policy.

The Structured Generation Runtime owns Provider decoding. A structured Provider
event is mapped into DSH's internal `read/query/probe/finish` command; DSH does
not parse arbitrary model JSON. This preserves the harness while moving wire
correctness to the adapter that has Provider capability information.

## Context compilation without context loss

“Do not resend all 272K tokens” must not become “show the model only one isolated
paragraph.” Use a proof-carrying context capsule:

1. immutable global policy and accepted overall-Skill hash;
2. complete current faction section and parent-draft hash;
3. the single sealed issue and protected-field hashes;
4. exact original source passages in the issue dependency closure;
5. relevant rule-atom, FAQ override, phase/state, unit/card and scenario links;
6. source index and read tool for expansion beyond the compiled closure;
7. explicit omitted-domain manifest and an escalation outcome when more context
   is needed.

The dependency graph, not Top-K similarity alone, computes the closure. A source
used by the parent advice, issue, guard, rule atom or linked exception is included
or explicitly accounted. The host verifies the closure before egress. If a new
field/source appears, the role stops and requests context expansion rather than
guessing.

Generation and whole-section review may still need broad context. Local editors,
citation binders and serializers do not. Role policy declares one of:

- `full_generation_context`;
- `whole_section_review_context`;
- `local_proof_capsule`;
- `payload_only_serialization_context`.

For cache locality, order request content as stable Provider/schema protocol,
frozen sources/accepted base, section context, then volatile issue and command.
Measure actual cache-hit tokens in every receipt.

## Failure taxonomy and one allowed response per class

| Class | Examples | Allowed response | Forbidden response |
| --- | --- | --- | --- |
| `pre_egress_contract` | bad schema, unsupported capability, prompt too large | fail before credential/charge | Provider retry |
| `definitely_not_sent_transient` | DNS/connection failure proven before send | bounded backoff+jitter under same attempt family | semantic mutation |
| `ambiguous_egress` | timeout/reset after possible send | settle reserve, quarantine, operator/Provider reconciliation | automatic retry |
| `provider_rate_or_capacity` | 429/5xx with retryable receipt | capped delayed retry if idempotency policy permits | immediate retry storm |
| `output_incomplete` | `finish_reason=length` | one pre-authorized capacity route using same semantic task | treating fragments as candidate |
| `wire_syntax` | invalid JSON/text event | no full-context re-generation; use stronger adapter or isolated payload recovery | repeated prompt-only format attempt |
| `schema_instance` | valid JSON, wrong/missing fields | validator issue + payload/local-field repair | parser guessing fields |
| `address_or_scope` | wrong source ID/index/target | host lookup/materialization with exact receipt, then fresh review | nearest-ID guessing |
| `source_semantic` | unsupported rule fact/omitted condition | source-bound issue, local regeneration, Rules/source recheck | model vote waiver |
| `review_disagreement` | reviewers conflict or reviewer contradicts source | adjudication against source/Rules and reviewer calibration | retry until both say yes |
| `strategy_effect` | legal advice performs poorly | replay/arena/held-out comparison and optional SkillOpt candidate | changing Rules or publishing from one loss |
| `payment_exhausted` | 402 | stop all paid work | any further Provider call |

Retry policy is a table keyed by failure class, not a catch-all loop. Identical
request bytes plus a deterministic schema/content failure have retry count zero.

## Recovery ladder

Recovery escalates in this order and stops at the first valid outcome:

1. **Provider-constrained decode.** Prefer JSON Schema/strict function output.
2. **Lossless deterministic normalization.** Only a unique, fully provable
   byte-level normalization; record before/after hashes and edits. It never
   accepts meaning.
3. **Payload-only repair.** If policy permits, use the quarantined raw model
   payload plus schema and error list, not the 272K source prompt. The repair
   cannot see or edit host identifiers and must preserve all scalar field hashes
   except paths named by the validator.
4. **Local semantic regeneration.** Rebuild only the affected field/advice from
   a proof-carrying context capsule. This is new model content and triggers all
   semantic reviews.
5. **Quarantine/stop.** Repeated no-progress, schema drift, context insufficiency
   or disagreement is an explicit terminal outcome.

Raw invalid payload recovery requires a new encrypted quarantine rather than
plaintext logs. Store AES-GCM ciphertext outside Git with content hash,
Provider/attempt binding, expiry and access receipt; keep the key in the OS
credential facility. Until this exists, a wire-invalid payload remains
unrecoverable and must not be reconstructed from the safe skeleton.

## Durable state model

The journal records monotonically advancing states:

```text
planned -> preflighted -> reserved -> intent -> received
         -> decoded -> schema_valid -> host_materialized
         -> source_valid -> evaluated -> promotable -> published
```

Any state may instead enter `not_sent`, `retry_scheduled`, `quarantined` or
`stopped`. Provider usage settles at `received`, before later validation. Every
transition binds parent state hash, task/context/schema/provider hashes, code
hashes, actor, timestamp and evidence. A continuation imports immutable completed
artifacts; it never copies or relabels attempts.

SQLite M1 and PostgreSQL production implement the same state-transition and CAS
contract. Historical v1 records remain readable through a frozen adapter. New
code does not silently reinterpret them as v2 success.

## Semantic and strategy acceptance

Structured output removes one transport failure class. It does not make a Skill
usable. Promotion still requires:

1. exact source/address existence and dependency-closure coverage;
2. deterministic known-rule and executable Rules checks;
3. supportive and adversarial review with bound targets;
4. reviewer calibration/adjudication when a judgment conflicts with source;
5. independently frozen comprehension and scenario cases;
6. legal-action replay in the authoritative harness;
7. strategy comparison against the prior version/baseline;
8. no hard regression, versioned CAS promotion and tested rollback.

Postgame reflection produces a candidate patch only. It uses pre-action
information for the proposed decision rule, actual outcomes for diagnosis and
matched replays/held-out games for evidence. `completed_no_skill_change` is a
valid result. Rules, training truth and publication each remain separate
authorities.

## Verification pyramid

Run cheaper evidence before expensive evidence:

### L0 — pure contract tests, zero Provider

- validate every schema and contract hash;
- round-trip all role values through the mapper;
- reject extra/missing fields, host identifiers and unknown schema versions;
- exhaustively test failure-class routing and state transitions.

### L1 — fault-injection adapter, zero Provider

Inject malformed JSON, Unicode quotes, raw ASCII quotes, truncation, empty
content, wrong schema, refusal, 429, 5xx, pre-send failure, post-send timeout,
duplicate delivery and crash after receipt/before settlement. Assert one exact
outcome and no unintended second call.

### L2 — recorded transport conformance, zero Provider

Replay redacted real Chat/Responses envelopes and verify usage, model, request
ID, finish status, schema, refusal and output extraction. The raw response is not
silently changed.

### L3 — capability micro-canary, paid but tiny

Use one small schema containing nested arrays and strings with Chinese text,
ASCII quotes, backslashes and newlines. Bind a strict budget of at most 50K
total tokens and ¥0.10 for the entire probe run. Cache the signed result by exact
Provider/model/endpoint/schema-subset hash and expiry.

### L4 — one local editor canary

Use the real sealed issue and proof capsule, not all faction sections. Acceptance:

- exactly one paid semantic call in the normal path;
- no prompt-only format retry;
- exact role schema and host materialization receipts;
- full source/Rules guard and fresh section review still pending/explicit;
- measured input reduction of at least 70% from the 271,803-token baseline,
  unless a documented closure proof shows more source is required.

### L5 — production and promotion

Resume the latest terminal lineage, finish the affected section, then the two
factions. Run full consumer, Room/replay and promotion gates only after complete
candidate artifacts exist.

## Implementation workpoints inside Slice 174

These are workpoints, not new global slices and not progress inflation:

| Workpoint | Deliverable | Exit gate |
| --- | --- | --- |
| 174-R0 | Incident freeze, architecture audit and this guide | exact attempt/cost evidence; no paid task running |
| 174-R1 | Output-contract registry and capability contract v2 | schema hash end-to-end; v1 frozen; zero-Provider tests |
| 174-R2 | DeepSeek Responses JSON-Schema adapter + in-memory fault adapter | adapter conformance, refusal/incomplete/usage/ambiguous-send tests |
| 174-R3 | One Structured Generation Runtime and DSH command mapper | Ticket17/faction callers cross one external seam; no new ad-hoc broker |
| 174-R4 | Proof-carrying context capsule and retry classifier | dependency closure receipt; no full-context format retry |
| 174-R5 | Tiny capability and local-editor canaries | explicit budgets; exact schema; ≥70% editor-input reduction; no 402 |
| 174-R6 | Latest-lineage migration and faction production resume | objectives edit passes host/source guard and fresh review; then continue 4/15 onward |

Slice 174 remains incomplete through R0–R5. The existing Ticket 18 denominator
stays 2/8, with Slices 175–179 unchanged. R6 success resumes the original Slice
174 acceptance rather than creating a second faction-production slice.

## Concrete module migration

Create one new package, for example `packages/structured-generation/`, with:

- `output-contract-registry-v1.mjs`;
- `structured-generation-runtime-v1.mjs`;
- `failure-classifier-v1.mjs`;
- `context-capsule-v1.mjs`;
- `provider-capability-receipt-v1.mjs`;
- `adapters/deepseek-responses-json-schema-v1.mjs`;
- `adapters/in-memory-fault-injection-v1.mjs`;
- `adapters/legacy-v1-replay-only.mjs`.

Upgrade the secure Provider policy through explicit v2 contracts that add
endpoint dialect, structured-output capability and `outputContractRef`. Do not
mutate v1 policy hashes. The credential worker remains the only network/secret
owner.

Move one caller at a time:

1. objectives editor 0.1;
2. remaining faction local editors/reconstructions;
3. faction generators and reviewers;
4. Ticket 17 overall-rule roles;
5. matchup generation;
6. Room-agent structured decisions and postgame reflection.

`model.mjs`, the old broker versions and grammar recoveries become frozen
historical/replay adapters after migration. New call sites may not import them
directly.

## Operational runbook

### Before a paid run

1. Verify no 402, ambiguous intent or running lease.
2. Verify source snapshot, parent Skill and rule-graph hashes.
3. Verify Provider capability receipt is current for the exact schema.
4. Run L0–L2 and a zero-egress first-miss simulation.
5. Print planned uncached roles and worst-case token/CNY budgets.
6. Refuse a run whose predicted cumulative cost crosses the next ¥100 notice
   threshold until the user has been notified.

### During a run

1. One in-flight paid request per lineage unless an explicitly tested scheduler
   policy says otherwise.
2. Record intent, response, usage and response class before validation.
3. Emit Ticket/Slice/workpoint, role, cache hit/miss, section denominator,
   Skill denominator and cumulative cost.
4. A schema or semantic failure routes to its typed issue; it does not select a
   generic retry automatically.

### On failure

1. Identify the earliest failing seam.
2. Compare actual capability/schema/context hashes, not just error text.
3. Preserve the failed artifact and usage.
4. Reproduce through the in-memory or recorded adapter.
5. Fix the owning module once and run its consumer gates.
6. Use a micro-canary before resuming full production.

### On resume

1. Continue from the latest terminal accepted lineage.
2. Import only exact completed artifacts with explicit migration evidence.
3. Keep all ancestor usage/start/budget records.
4. Prove the first uncached role locally.
5. Never count an engineering gate, migration or canary as a completed Skill.

## Rejected approaches

- **Keep adding parser guesses.** It cannot prove intended meaning and spreads
  transport complexity across callers.
- **Retry the same full prompt until lucky.** The current eight-attempt evidence
  shows deterministic repetition and unnecessary cost.
- **Let the model echo control IDs.** The host already knows them and should own
  them.
- **Use only a tiny isolated chunk.** It risks missing phase, FAQ, unit and
  exception dependencies; use a graph-closed proof capsule with expansion.
- **Always send the entire source to every repair.** It makes formatting failures
  needlessly expensive and destabilizes cache/task hashes.
- **Treat JSON Schema as factual validation.** It constrains shape only.
- **Use reviewer consensus as truth.** Existing real reviews have agreed on
  false statements; source, Rules and replay remain authoritative.
- **Silently upgrade old runs.** Historical v1 results remain under their frozen
  contracts and are imported only by explicit migration.

## Definition of done for the reliability change

The optimization is implemented only when all are true:

- one external structured-generation interface serves both production paths;
- exact schema capability is probed before expensive prompts;
- the role schema hash is bound end to end;
- full-context format retries are impossible by contract;
- context-capsule closure and expansion are verified;
- all failure classes have one tested route and bounded retry policy;
- crash/duplicate/ambiguous-send/402 accounting tests pass for SQLite and the
  future PostgreSQL adapter contract;
- the real objectives editor passes structured decode and host materialization
  in no more than the declared canary budget;
- source/Rules/whole-section review still decides semantic acceptance;
- historical attempts, costs and failed judgments remain immutable;
- documentation, TASKS and PROJECT_MEMORY report exact evidence and remaining
  first-five/Ticket counts.

Until then, the current state remains: project 16/22, Ticket 18 at 2/8, Slice
174 active, source-reviewed faction sections 3/15, complete factions 0/2,
offline first-five 1/5 and formal/runtime first-five 0/5.
