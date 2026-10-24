# Ticket 27 / Slice 272 — Provider failure and input-length diagnosis

Date: 2026-10-15. Status: diagnosis, not Teach completion or production acceptance.
T27 5/6; T23 33/36; four main slices remain (272, 248, 249, 250); accepted full games 0/12.
All four matches remain stopped. A Plan9 and B Plan19 are unchanged.

## Conclusions supported so far

1. **There is an independently confirmed upstream incident.** DeepSeek's official status page reports an incident beginning 2026-10-15 00:11 UTC (08:11 China time), affecting V4.1 Flash and V4 Pro APIs. Its detail page currently says `Identified / Full Outage`; updates at 01:06/01:08 UTC say a fix is being implemented. The v209/v212/v215/v217 attempts all occurred after that start. This is strong evidence for a provider-availability problem, but it does not reveal the internal cause of an individual request. [Official incident](https://status.deepseek.com/incidents/7116348214287), [status overview](https://status.deepseek.com/).
2. **Input length was a separate real problem earlier.** B v210 received HTTP400 with `contextLengthExceeded=true`. The v211 lossless evidence interner addressed that expanded request. Do not relabel the later v217 whitespace-only HTTP200 timeouts as another proven context overflow.
3. **The current B input still has significant avoidable volume.** The actual failed request was reconstructed offline with identical body and context hashes, not estimated from a similar prompt. It contains 1,545,364 UTF-8 input bytes, but its exact provider token count is unknown because no usage was returned. Bytes are not tokens.
4. **The current transport did not fail at JSON parsing.** A/B v217 each received only nine whitespace bytes over ten minutes, zero non-whitespace bytes. There was no JSON document available to parse. DNS, TCP, TLS, request write and response headers completed. The local total deadline ended both attempts; this is distinct from a socket-idle timeout.

## Official protocol checks

- The documented `deepseek-flash` model is V4.1 Flash with a 1,048,576-token context window shared by input and output; the listed maximum output is 393,216 tokens. Our requested output ceiling of 32,768 is within that maximum. This does not prove the input fits. [Model metadata](https://api-docs.deepseek.com/api/list-models/).
- Responses supports our fields: `input` string, `instructions`, `reasoning.effort=none`, `max_output_tokens`, non-streaming mode and `text.format=json_schema`. It is stateless; it does not support retrieving a stored response via `previous_response_id`, server-side `background`, or automatic truncation. Exceeding the context window returns HTTP400. [Responses guide](https://api-docs.deepseek.com/guides/responses_api/), [API reference](https://api-docs.deepseek.com/api/create-response/).
- Non-streaming empty lines are documented keep-alives. If inference has not started after ten minutes, the server closes the connection. Our timing/whitespace pattern is consistent with waiting, not evidence of model output. A non-streaming trace cannot establish precisely whether inference had started internally. [Keep-alive documentation](https://api-docs.deepseek.com/quick_start/rate_limit/).
- Generic JSON-mode empty-output caveats do not establish this cause: the present failure is an unfinished HTTP body, not a completed response with an empty assistant message. Our instructions already explicitly request JSON. [JSON guide](https://api-docs.deepseek.com/guides/json_mode/).
- Token estimation by character ratio is approximate. No compatible pinned Flash tokenizer was found in the inspected project paths; no new package/model/tokenizer was installed. Do not use the generic ratio as an exact admission gate. [Token usage](https://api-docs.deepseek.com/quick_start/token_usage/).

## Exact B envelope: v218

Evidence directory: `build/ticket-23-three-arm-performance-baseline-20261010-v1/`.
Read `common-v218-B-request-diagnostic.private.json` and `common-v218-B-captured-request.private.json.gz`.

| Measurement | Result |
|---|---:|
| Complete wire JSON | 1,654,102 bytes |
| Model input string | 1,545,364 bytes |
| System instructions | 1,076 bytes |
| Output JSON schema | 2,117 bytes; 20 object nodes; depth 6 |
| Requested maximum output | 32,768 tokens |
| Exact duplicate strings of at least 512 bytes | 137,126 redundant bytes (8.87% of input) |

Largest prompt nodes:

| Node | Bytes |
|---|---:|
| Teach experience | 1,053,809 |
| Whole-plan claim index | 189,121 |
| Verified plan facts | 119,355 |
| Reviewed claims | 88,310 |
| Current-plan alignment | 46,620 |
| Cited final review | 35,828 |

Within Teach experience, evidence is 923,565 bytes across 52 retained entries (34 advisory, 18 historical unknown). The current synthesis is only 43,704 bytes. The old unknown entries are retained history, not 18 newly unresolved strategic questions. Query repair payloads account for 235,624 evidence bytes. One Goliath/Raptor scene receipt is 187,347 bytes, mostly nested follow-up receipts (175,590 bytes).

Example duplication: the same 13,560-byte public summary appears three times in reviewed claims, whole-plan index and alignment. Existing interning addresses repeated evidence objects, but does not deduplicate these strings across all Plan views. This is a measured optimisation opportunity, **not proof that removing 8.87% would cure the outage**.

The product's secure factory passes `contextBudget` into the profile binding, but this structured send path does not compute the model's actual input tokens. It enforces a separate wire-byte ceiling (16 MiB + 4,096 bytes) and the output limit. Therefore a configured 1,000,000-unit context budget is not proof that a request has been token-counted. B's current 1.65 MB wire body is below that byte ceiling.

Relevant code:

- `packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs`: request construction, error classification and one-send dispatch records.
- `packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs`: byte admission, total/idle timeouts and body parsing.
- `packages/roster-strategist/roster-teach-framework-v1.mjs`: evidence projection and same-input interning.
- `packages/roster-strategist/roster-strategist-runtime-v1.mjs`: revision evidence, whole-plan and alignment views.

Prior successful large calls are counterevidence to a simplistic size-only explanation: saved B synthesis receipts report 649,357 and 659,796 input tokens; A synthesis reports 495,846 and 530,762. These are earlier different requests, not controlled A/B proof and not a tokenizer for the present input.

## A reconstruction limitation

`common-v218-A-request-diagnostic.private.json` records a diagnostic-script-only missing `roundIndex` dependency, with zero model/Native calls. The corrected offline capture in `common-v218r2-A-request-diagnostic.private.json` completed but did **not** match the actual failed body/context hashes. Saved query context is insufficient to claim exact reconstruction without restoring the original branch context.

Do not present its 510,151-byte approximate input as A's actual sent size. No production fix or third attempt was made merely to force a matching diagnostic. Both runs preserved the original draft. B's exact result and A's v217 transport evidence remain valid independently.

## One authorised minimal request: v219

The user authorised exactly one tiny same-model diagnostic, not another A/B retry. Script:
`scripts/diagnose-slice272-minimal-provider-v219.mjs`.

It uses the production secure factory, credential ingress, isolated worker, official endpoint, model and non-thinking/JSON-schema transport. It carries no army, Plan or Teach history: input string 288 bytes plus the unchanged 1,076-byte production system instruction, three-field schema, maximum output 512 tokens. There is one `deliberate` call, no recovery callback, no automatic retry, and an exclusive result reservation. A small reply is requested: `schemaVersion`, `roundKind`, `ok=true`.

Authorisation: `call_da2ae23f55bf44d2a1f0a201f84e724c`.
Dispatch: `roster-connectivity-probe-02f86055-15b6-4b32-9d47-07ef5138f26a`.
Started 03:10:15.557 UTC. Maximum wait 600 seconds, matching the current diagnostic timeout.
Read the single terminal record `common-v219-minimal-provider-diagnostic.private.json`; do not restart this script.
The request ended at03:20:16.646UTC: HTTP200 headers1,160ms,9whitespace bytes,
zero non-whitespace,9chunks,first byte61,160ms,last541,253ms; total deadline
600,235ms. Exactly one physical attempt, no retry, no model answer or usage.
Cost remains unknown and separate from A/B. The secure worker was closed.
Thus large input is not necessary to reproduce the present endpoint/account
failure. Combined with the official incident this supports provider unavailability,
without proving a specific internal scheduling cause or eliminating future capacity work.

Interpretation after terminal result:

- Tiny request also waits/fails: large context is not necessary to reproduce unavailability on this endpoint/model/account; combine with the official incident. This does not exclude an additional large-input cost.
- Tiny succeeds: the service can answer that small request at that instant; it does not prove the earlier failures were caused by length or that large production requests are healthy.

## User-authorised Kimi Code fallback check: v220

The subsequent user instruction authorised a temporary test using the locally
installed K3 Code Plan. It used **Kimi Code CLI2.0.2**, existing managed subscription
alias `kimi-code/k3`, not Codex calling K3 directly and not the separately stored
project API key. Global configuration/login was not changed.

The independent `project-d-connectivity-probe` profile has no tools or subagents.
Actual session `profile.bind` confirms `activeToolNames=[]` and `subagents=[]`.
Working directory is the dedicated build subdirectory `kimi-code-connectivity-v220`;
no army, Plan, Teach history, workspace development or game action was supplied.

**Result: passed connectivity check, not passed Teach.**

```json
{"schemaVersion":"kimi_connectivity_probe_v1","ok":true}
```

- CLI exit0; total launch-to-close20,768ms, model-turn10,890ms.
- Saved wire records contain one `llm.request` and one `usage.record`; requested model`k3`.
- Usage:360uncached input +93output =453tokens, no cache tokens.
- Existing subscription usage; no monetary amount returned. Do not invent a yuan price or call it zero cost. Separate diagnostic accounting, no A/B ledger reset.
- No tools, file modifications by K3, delegated agents, retries or game launch observed.
- Session:`session_e11ae6a9-3d25-4de0-82b3-0b0fa54fdb9a`.
- Product-local receipts:`common-v220-kimi-code-diagnostic.private.json`, `common-v220-kimi-code.stdout.private.jsonl`, and `common-v220-kimi-code-acceptance.private.json`.

This proves the configured alternative works for a small request now. Full B Plan
revision / A native fact investigation remain unverified with K3; a temporary
provider adapter or explicitly isolated shadow workflow must retain the same
evidence contracts, source bindings and accounting. Do not treat this probe as
authority to relabel existing A/B results, bypass rules, or resume all games.

## Recommended next work — no strategy changes in this diagnosis

1. **Service health before expensive recovery.** Preserve drafts, proofs, old costs and request identities. On a confirmed outage, keep semantic work pending and report it as unavailable; use a separately authorised low-volume half-open probe after recovery rather than repeated large Teach sends. A timeout without usage remains unknown cost.
2. **One context assembler for Teach and Plan consumers.** Keep one canonical Plan, one evidence table, typed current conclusions and explicit dependencies. Reuse those by reference in other views; expand to exact original values for a losslessness check. This is separate from deleting strategic alternatives.
3. **Separate storage from active input.** Keep all old attempts for audit, but provide current question/evidence bindings and a retrievable archive. Retain both supporting and contradicting evidence and the conditions/uncertainty. A role without evidence-fetch turns must receive its complete dependency closure; never replace needed facts with unreachable references.
4. **Token-aware admission.** Record final serialized bytes, compatible tokenizer version/count when available, output reservation and per-node attribution before send. If the estimate is uncertain, label it; do not invent a hard character limit. Explicit context400 should route to lossless reduction or evidence paging, not identical retries. A global timeout should not trigger text deletion.
5. **Bounded sequential evidence paging if still necessary.** Shared strategic spine, model-chosen question groups, durable evidence IDs and final cross-question consistency synthesis. Include negative evidence and retained alternatives so chunking does not silently weaken strategy. Establish need from actual token/latency data after service recovery.
6. **Expose waiting versus working.** Current telemetry distinguishes empty keep-alive from content only on terminal receipt. A future stream adapter can expose first useful output and terminal usage, but requires a separate scoped contract change; turning on `stream:true` in the current non-streaming parser is not a valid fix.

## Scope and verification

No production prompt/model/timeout/army/Plan/game changes in this diagnostic round. No new rule data, installs, deletions, subagents, passed-test reruns, commit or push. The v218 scripts are offline observations, not acceptance gates. New physical calls: one DeepSeek diagnostic (unknown fee) and, after separate user instruction, one Kimi Code K3 diagnostic (453tokens under subscription). Both are recorded separately from unchanged A/B historical ledgers.

Skills applied: diagnosis kept alternative causes distinct; harness observability required actual request/transport evidence; offline Teach boundaries prevented diagnostic results from becoming game strategy or accepted Plan. Research uses primary official sources and is performed directly because the user prohibited subagents.
