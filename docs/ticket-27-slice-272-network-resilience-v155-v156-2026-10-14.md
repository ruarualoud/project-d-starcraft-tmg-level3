# T27 / S272 — Network diagnosis and bounded in-place recovery

2026-10-14, Asia/Shanghai. T27 5/6, T23 33/36; remaining main slices
248/272/249/250 = 4. Accepted full experimental games: 0/12.

## Findings, not all failures are network

- A v152 stopped before sending: `PROVIDER_DNS_RESOLUTION_FAILED`, `ENOTFOUND`,
  physical attempts 0, definitely not sent. No unknown-fee retry required.
- B v154 sent its request, then `ETIMEDOUT` at 185338 ms while waiting for
  response headers. DNS 227 ms, TCP 433 ms, TLS 663 ms, request written 666 ms.
  Original result/fee remain unknown; never classify this as a free request.
- B's prior nested paid JSON reply was actually reused in production:
  `resolved_by_current_validator`, `newModelCalls: 0`, `reusedPaidOutput: true`.
  The math prerequisite returned advisory, not proof of whole-question closure.
- No system HTTP proxy was configured. The configured resolver had duplicate
  entries for the same server, not four independent failovers. This alone does
  not establish the outage's cause. Did not change system DNS, proxy or TLS.
- 14:51 unauthenticated HTTPS probe returned 401 in 993 ms; 14:59 repeated
  system DNS probes succeeded in 21/6/3 ms, configured resolver in 217 ms and
  comparison resolver in 192 ms, direct HTTPS HEAD 401 in 971 ms. No credential
  or model request used. A 401 here means reachability, not model acceptance.
- A/B v155 resumed the exact original offline workspaces, not new game rooms.
  By 15:20 A returned 7 calls / 214717 units and was sending synthesis; B
  returned 9 calls / 110737 units and stopped at synthesis at 15:08:56.
- **B's latest stop is NOT NETWORK:** HTTP 400 `invalid_request_error`,
  `contextLengthExceeded: true`. More retries cannot fix this input-size error.
  It remains a separate engineering blocker. Do not restart this request until
  the synthesis input is repaired without losing strategic evidence.

## Source changes

1. `provider-network-resilience-v1.mjs`: shared pre-send DNS resolution, at most
   three attempts with 300/900 ms backoff and 3 s per lookup. Aborted/late DNS
   cannot cause a send. No alternative resolver, stale-IP cache, redirect or
   credential-bearing network request is used by this helper.
2. Both structured and ordinary egress use the helper, preserve public-address
   validation, pinned destination and TLS verification. TCP keepalive starts
   at 15 s for long non-streaming calls. This mitigates idle disconnects; it
   does not guarantee that an external network/provider cannot fail.
3. DNS diagnostics are separate from physical HTTP attempts: repeated DNS
   lookup is not repeated billing. Worker receipt contracts accept the new
   optional typed diagnostics; historical receipts remain valid. Credential
   content/arbitrary errors do not enter diagnostics.
4. Secure roster deliberation can recover **inside the current logical turn**
   through the product service callback. A terminated transient transport error
   is persisted first; an explicitly enabled policy permits at most one new
   attempt. Ambiguous original fee/result is retained, exact context/body is
   unchanged, authorization is persisted and consumed before the retry send.
   A second network failure stops visibly. Cancellation, auth, JSON, account,
   policy and context-limit failures are not retried as network errors.
5. The policy is session-owned and explicitly activated by
   `automaticNetworkRecovery: true` on the Teach request. The same service
   callback is wired to its initial/resumed planning, Teach, final review,
   review reconciliation and revision ports. It is not enabled for arbitrary
   accounts or other sessions. The existing A/B launcher now requests it on
   its next safe resume under the owner's standing consent.
6. In-place recovery does not rerun scene construction or completed queries,
   shorten strategic material, alter prompts/Skills or change the frozen model.

## Targeted evidence only

Artifacts under `build/ticket-23-three-arm-performance-baseline-20261010-v1/`:

- `common-v156-network-resilience-red.private.json` reproduced both transient
  DNS failures, missing keepalive and a structured cancel-during-DNS send bug.
- `common-v156-network-resilience-green.private.json`: six failed cases fixed;
  previously passed ordinary cancellation was explicitly skipped, not rerun.
- `common-v156-network-autoresume-red.private.json`: actual product service had
  no automatic recovery callback. First attempted GREEN reached the recovered
  response but the synthetic output schema lacked `additionalProperties`.
  Corrected that fixture only; `common-v156-network-autoresume-final.private.json`
  proves real service + real secure factory + durable dispatch barriers:
  identical request recovers, unknown original is retained, consumed-before-send,
  one-retry bound, non-network rejection does not retry. Fake Worker only.
- Compatibility inspection found that an old ordinary Worker field allowlist
  would reject the new DNS diagnostic. Specific
  `common-v156-network-worker-contract-red.private.json` reproduced
  `PROVIDER_SUCCESS_SHAPE_REJECTED`; corresponding GREEN proves the actual
  success classifier accepts the actual transport receipt after the fix.
- No pre-existing passed suites, full builds, strategy tests or game gates were
  rerun. All regression probes used zero real Provider/Native/Room calls.

## Loading and next steps

Final observation at about 15:24: A finished this Teach invocation, 8 new calls /
593999 units (cumulative128 /21326447), no transport failure. It still has six
unresolved questions Q2–Q7: opponent asset scenario, opportunity-cost comparison,
anti-armour/flying capability, post-loss control, formation legality, hero/Medic
synergy. Completed invocation is NOT accepted strategy/Plan. Preserve the idle
A host7389 for the next source-corrected continuation; no reason to restart it
just to observe the same completed result. B host36429 actually started at
http://127.0.0.1:61286 with live deliberation attached and no Room launch attached,
three restored sessions / zero quarantined, no submitted model request. Its
context-limit terminal record is unchanged. The new network policy is activated
on the next explicit safe Teach resume, not retroactively in the old A process.
The final service-only policy-persistence line was saved after B startup; reload
both affected hosts at the next paid continuation so they use the same final
source. No in-flight paid request was killed to load these changes.

B's old host 7320 was verified terminal/idle through the existing API and exact
process identity before replacement by host 36429 at 15:19:50. Existing B
workspace/history/failure retained; no model request submitted. See
`common-v156-B-network-hardened-host.private.json` and its startup log for ready
state. A host7389/observer7195 was left running to preserve its in-flight paid
synthesis; do not hot-restart or treat an observation timeout as termination.
Its run remains `common-v155-A-teach-network-resume-progress.private.json`.
New source is not retroactively loaded into A's already-running process.

Next: observe A's actual terminal result, load at its safe boundary; repair B's
oversized synthesis separately; finish actual A/B Teach/final Plans; then shared
consumer/performance audit before the four new same-code games. No claim of
Teach acceptance, complete permanent Internet repair, full live performance
acceptance or completed games. No source refresh, deletion, install, subagent,
commit or push this round.

Harness loop used: true. Routes: existing Teach/strategist only. Changed scope:
Provider transport + dispatch supervision, not strategy authority. UI/Room
actions: none. Existing public outputs and traces retained for later review;
failed/unknown results are not promoted to strategy knowledge. Rollback trigger:
changed logical prompt/body, duplicated unaccounted paid sends or lost trace.

### Final diff summary (this change only, not the historical dirty worktree)

- 9 product files: shared network helper; structured/ordinary transports and
  error receipt; Worker v1/v2 and success classifier; roster secure factory and
  workspace service.
- 3 scripts: existing safe resume launcher plus two concrete regression probes.
- Task/memory/current-work entries and this report updated. No commit/push.
- Network and Worker gates passed once per relevant changed case; the service
  automatic-recovery proof uses injected failure, not a claim that a new real
  provider disconnect has already occurred under v156. External outages can
  still happen; exhausted recovery remains visible instead of silently charging
  an unbounded retry loop.
