# Ticket 26 / Slice 266 — K3 companion backend module closure v1

Date: 2026-09-21 (CB-1..CB-4), 2026-09-22 (CB-5 + High repair). Owner: K3.
Integration owner: Codex. Headless backend module: no screenshots, 0 Provider
calls, 0 network I/O, ¥0 cost for product execution and verification.

## Scope and commits

| Step | Commit | Content |
| --- | --- | --- |
| CB-1 | `17e942f` | contracts, errors, registry, in-memory ports, single `index.mjs` surface |
| CB-2 | `e892329` | worldbook/context/memory/relationship engine |
| CB-3 | `0f612e0` | multi-speaker session, branch/checkpoint/resume, permission runtime |
| CB-4 | `97e6d2d` | Provider/persistence ports, deterministic audit/replay, presentation state |
| CB-5 + High repair | this commit | aggregate verifier, closure doc, provider-gateway High repair |

Allowed paths touched: `packages/companion-backend-module-v1/` and
`docs/ticket-26-slice-266-*` only. No pre-existing file outside the module was
modified. The untracked K3 brief is unchanged.

## Codex-reviewed High repair (fixed before CB-5)

**Finding.** `createCompanionProviderGateway` rejected every injected provider
adapter that carried network capability (`baseUrl`/`endpoint`/`url`/`fetch`/
`socket`/`transport`, or `network != "none"`) with `PROVIDER_NETWORK_FORBIDDEN`,
and hard-coded `networkAttempts: 0` / `paidInference: "not_performed"` in
receipts and stats even after `provider.complete` succeeded. That confused the
module's own no-network/no-credential guarantee with the injected port's
external execution: the port contract forbids network I/O, credential handling
and paid inference **inside this module**, not in an opaque external adapter.

**Repair.**

- `COMPANION_PROVIDER_PORT_V1` (contracts-v1.mjs) now states the guarantee
  precisely: `directModuleNetworkCallsForbidden: true`,
  `credentialsForbidden: true`, `hiddenChainOfThoughtForbidden: true`,
  `externalProviderExecution: "allowed_outside_module_via_injected_port"`,
  `externalAccounting: "provider_reported_preserved"`. The integration
  descriptor's optional `provider` dependency reason was updated to match.
- The gateway no longer rejects network-capable injected adapters. Port
  conformance and the recursive credential scan on stored adapter data remain
  enforced; credentials are still forbidden in module requests and adapter
  data; the module itself still performs zero direct network I/O
  (`directModuleNetworkAttempts: 0`, `directModuleNetwork: "none"`).
- An injected port may return `{ ok, response, receipt }` with a
  provider-reported receipt `{ networkAttempts, paidInference,
  reportedCostUnits }`. Valid receipts are preserved verbatim in the call
  receipt (`networkAttempts`/`externalNetworkAttempts`, `paidInference`,
  `reportedCostUnits`, `accountingSource: "provider_receipt"`), in
  `stats()` (`externalNetworkAttempts`, `paidInferencePerformed`,
  `paidInferenceUnknown`) and in the `provider.response` audit subject.
  Malformed receipts fail closed with the new `PROVIDER_RECEIPT_INVALID` code
  instead of being trusted.
- Zeros are never invented for external execution: an adapter declaring
  `network: "none"` (the pure in-memory port) truthfully reports
  `accountingSource: "adapter_declared_no_network"` zeros; an opaque adapter
  reporting nothing yields `"unknown"` external attempts/paid inference
  (`accountingSource: "unreported"`), not a fabricated zero.
- No-provider remains fail closed: a rejection record with all zeros, never a
  throw, never a network attempt.
- The in-memory provider adapter is unchanged and stays pure/no-network.

**Proof.** `verify-cb4-v1.mjs` gained the check "opaque external provider port
executes externally and its provider-reported accounting is preserved (High
repair)" and its strict-port check now asserts that endpoint/transport-carrying
adapters are accepted while credentials are still rejected. The aggregate
verifier re-proves the same behavior through `composeCompanionBackend`
(section 7). Per instructions the historical CB-4 verifier was not run
separately; its updated assertions are subsumed by the aggregate run below.

## Aggregate verification receipt

Command (run exactly once after the final code change):

```
node packages/companion-backend-module-v1/verify-v1.mjs
```

Result: **PASS — 11/11 checks.** Coverage:

1. Data-only seventh companion: six packages registered, a seventh added
   through the same data APIs with no code change; memory scopes fully
   isolated from the other six.
2. Worldbook/context: always/keyword/regex triggers, priority-desc ordering,
   token-budget truncation, omission disclosure with provenance receipts;
   invalid trigger kinds rejected.
3. Layered memory/observed relationship: six isolated layers, immutable
   canon, rolling-summary versions, durable memory only via explicit user
   approval; relationship updates require typed observed player-visible
   events, opponent-private inference is rejected, unknown renders "unknown"
   (never 0).
4. Multi-speaker mentions/permissions: user plus two companions in one
   conversation, explicit rotation, deterministic mention queue, no duplicate
   turn ownership; player-seat/observer/review read policies; opponent-private
   denied fail-closed for every seat; read-only seats cannot speak or be
   mentioned.
5. Non-overwriting branch: swipe and edit branches append new turns; original
   accepted turns are byte-identical afterwards.
6. Checkpoint resume: long session checkpointed at turn 3, extended to 5,
   rolled back (session state and mirrored transcript), continued as a
   different turn 4, and crash-resumed from a fresh runtime over the same
   store.
7. External provider accounting + no-provider fail-closed (High repair, at
   compose level): provider-reported `networkAttempts: 2`,
   `paidInference: "performed"`, `reportedCostUnits: 0.0042` preserved while
   `directModuleNetworkAttempts` stays 0; credentials in adapter data still
   rejected; no-provider rejection all zeros; in-memory port reports truthful
   zeros.
8. Six receipt-bound presentation states (idle, speaking, listening,
   alert_combat, damaged_concerned, reflective) resolve from externally
   supplied receipt-bound assets; a missing asset fails closed per-state.
9. Deterministic replay candidate: identical audit exports across two fresh
   composed runs, export integrity verified and tamper detected; candidate
   carries `trainingTruth: false`, `promotion.automatic: "forbidden"`,
   manual-approval-only skill/memory promotion, and both candidate requests
   and audit records for promotion are rejected.

Historical focused verifiers (`verify-cb1..cb4-v1.mjs`) remain in the module
for reference; the aggregate command above is the single slice gate.

## One-file future integration recipe

Codex integrates the whole module by changing exactly one existing
composition/entry file:

```js
import { composeCompanionBackend } from "./packages/companion-backend-module-v1/index.mjs";

const companion = composeCompanionBackend({
  persistence,          // REQUIRED: conformant companion_persistence_port_v1 adapter (durable = Codex integration)
  provider,             // optional: opaque companion_provider_port_v1 port; executes externally, reports accounting
  assetCatalog,         // optional: receipt-bound presentation assets
  registry,             // optional: defaults to an empty in-process registry
});
```

Startup fails with `DEPENDENCY_MISSING` when `persistence` is absent
(`COMPANION_BACKEND_INTEGRATION_DESCRIPTOR` lists every dependency). No
consumer imports a second module file.

## Limitations

- Persistence is the in-memory conformance adapter only (explicitly
  `volatile_in_memory`, fake durability forbidden); durable adapters are a
  later Codex integration.
- No Provider implementation ships in the module; without an injected port the
  gateway fails closed. Provider-reported accounting is preserved as reported;
  the module cannot independently verify an external adapter's self-report.
- Replay candidates are evidence only; WikiSkill/EvoTest evaluation and any
  Skill/memory promotion remain external, gated and manual-approval-only.
- Relationship and memory truth never override Rules/Authority; match-state
  reads stay `room_tools_only`.

## Unresolved Critical/High concerns

None.
