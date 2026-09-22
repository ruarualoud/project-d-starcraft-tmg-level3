# Ticket 27 / Slices 269–270 — Roster strategy and live plan v1

Date: 2026-09-22 (list-quality reopening, 269.13–269.17 and live rounds
10–11: 2026-09-23). Status: deterministic acceptance complete (`269.1`, `270.1`,
`269.2+270.2`); the saved live round-4 structured-output blocker was
reproduced offline and closed by a typed public-output normalization
boundary (`269.4`, `269.5`); the saved live round-5 omitted-field blocker was
reproduced offline byte-identically and addressed on the generation side by a
strict Provider JSON-schema output contract set (`269.7`); the saved live
round-6 schema integer-bound blocker was reproduced offline byte-identically
and closed by domain-owned integer bounds (`269.9`, contract set v1.1.0);
the saved live round-7 component identity-drift blocker was reproduced
offline byte-identically and closed by publishing the deterministic
instance-identity convention in the comparison schema (`269.10`, contract
set v1.2.0); the saved live round-8 unit identity-mismatch blocker was
reproduced offline byte-identically and closed by sealing the deterministic
component identities into the comparison-round request context (`269.11`,
runtime 1.2.0). The continued authorized live lane (`269.12+270.8`, repair
rounds 7–9 under the three-cycle convergence budget) **passed on repair
round 9**: one actual generated Standard-2000 roster plus initial
`RosterPlan` passed the Rules-owned port with full retained artifacts.

The manifest then reopened the slice for list quality: the round-9 roster
spent only 940/2,000 minerals and left the VP schedule unknown. The
schedule-grounding and budget-utilization contracts (`269.13`/`269.14`,
contract set v1.3.0, runtime 1.3.0) with their regression coverage
(`269.15`) passed the focused gate once at 67+21 checks with 0 Provider
calls. The single manifest-authorized round-10 list-quality cycle
(`269.16+270.9`) failed closed on its first locked call: the now-grounded
schedule's window labels exceeded a host-authored 64-character schema cap —
the same defect class as round 6. The repair is the general
narrative-capacity policy (`269.17`, contract set v1.4.0, runtime 1.3.1):
free public narrative is bounded only by the transport-level overall safety
ceiling, display-target overflow is a soft public warning, the full text is
preserved, and identifier/enum/identity/legality bounds are unchanged. The
newly authorized narrative-recovery attempt (recovery round 11, at most
three additional physical calls outside the original ledger/lock) proved
the round-10 class closed live — the foundation round transported a long
mission-grounded schedule and the proposals round passed — then failed
closed on a separate comparison-round nesting drift
(`selectedCandidateId` lifted to the top level). The three-call recovery
budget is exhausted; per the no-retry rule the lane stops with that typed
blocker open. Live acceptance per the original task brief remains **met by
round 9** (legality lane); the reopened **live list-quality acceptance is
NOT met** — see the unresolved High finding below.
Slice manifest: `.agent-runtime/slice.json`
(`ticket-27-slices-269-270-roster-strategy-and-live-plan`).
Roadmap: `docs/ticket-27-slices-267-272-roster-strategist-roadmap-v1-2026-09-21.md`.
Builds on completed Slices 267–268 at base `4934881`
(`packages/roster-strategist/roster-plan-contracts-v1.mjs`,
`packages/roster-strategist/army-builder-query-port-v1.mjs`).

## Frozen sub-slices

Numbering is frozen before implementation; one scoped commit per completed
sub-slice.

| Sub-slice | Deliverable | Write scope |
| --- | --- | --- |
| 269.1 | Multi-round Roster Strategist runtime. Reads the exact-manifest General, own-faction and directed matchup Skills from the committed portable foundational pack; freezes mission, deployment, map/terrain, opponent-information boundary and source/rules/Skill/model/prompt versions into the Slice-267 provenance contract; bounded deliberation rounds (strategy foundation → typed information-needs → candidate proposals → comparison/selection → optional revision); legal candidate choices only through the read-only Slice-268 Army Builder port; probability/spatial/math/scenario tool calls only through the Slice-270 laboratory; assembles one Rules-legal 2000-point roster plus a public versioned `RosterPlan`. Strategy comes from Skills and Agent deliberation only: the runtime holds no host or prompt preference weights and never ranks candidates itself. Public hypotheses, evidence queries, comparisons, purposes, predicted counters, counter-responses, invalidation triggers and revisions are recorded; hidden chain-of-thought is neither requested nor persisted (typed rejection on forbidden fields). | `packages/roster-strategist/roster-strategist-runtime-v1.mjs`, `packages/roster-strategist/index.mjs` |
| 270.1 | Isolated pregame scene laboratory. Probability (Rules-derived attack estimation), spatial/geometry (tactical relationship graph), exact math (budget/VP arithmetic) and bounded scenario branches (Rules-legal lifecycle transitions plus explicitly advisory hypothetical-geometry placements) over deep clones of one source Room state. Every receipt binds the source Room state hash and Builder bundle hash; unknown results stay unknown, never zero; same-state A/B candidate comparison evaluates two roster candidates through the same port/bundle/state; `proveMutationZero` re-hashes the source Room state and Builder bundle after all operations. | `packages/roster-strategist/pregame-scene-laboratory-v1.mjs`, `packages/roster-strategist/index.mjs` |
| 269.2+270.2 | Focused deterministic verifier with an injected scripted (mocked) deliberation Provider: full multi-round planning trace, legal 2000-point roster, illegal-candidate rejection evidence, no-host-preference selection proof, determinism (double-run identical plan hash), revision chain, laboratory A/B receipt, mutation-zero proof and unknown-not-zero checks. Zero paid Provider calls. Run at most once after the final relevant code change. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.3+270.3 | One bounded live 2000-point Agent roster-planning session through the existing macOS Keychain → isolated Provider egress Worker BYOK path (DeepSeek flash profile, one attached credential, no retry). Final roster re-validated through the Rules-owned port; retained artifacts: actual `RosterPlan`, typed tool receipts, redacted Provider usage receipts, pricing receipt, and a comparison against the fixed preset roster carrying `planStatus=no_pregame_plan`. Stops immediately on 401/402/403, ambiguous dispatch or missing secure attachment. Raw credentials never enter the prompt, repository, command line, stdout/stderr, report or logs. | `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`, artifacts under `build/ticket-27-slices-269-270-live-roster-plan-v1/` (gitignored) |
| 269.4 | Typed public-output normalization boundary closing the saved live round-4 alias drift. One general boundary between deliberation output and strict schema/Rules validation: explicit versioned alias registry v1.0.0, admitted single-channel transport-envelope unwrap, absent request-owned constant (`schemaVersion`/`roundKind`) stamping, admitted semantically equivalent alias renames (values moved unchanged; conflicts left in place to fail closed). It never invents strategy, fills missing semantic content, drops/merges keys, converts value types, weakens legality or special-cases one candidate; full existing schema/Rules validation always runs after normalization; every round emits a hashed provenance receipt recorded in the round receipt, session receipt and runtime descriptor. | `packages/roster-strategist/public-output-normalization-v1.mjs`, `packages/roster-strategist/roster-strategist-runtime-v1.mjs`, `packages/roster-strategist/index.mjs` |
| 269.5 | Focused regression coverage for the captured round-4 failure: offline replay reproduces the exact saved failure (`ROSTER_STRATEGIST_FOUNDATION_INVALID:hypothesis,implication,observable`); the new checks fail before the boundary fix and pass once after; the captured under-specified shape still fails closed post-normalization; an alias-complete envelope session plans a Rules-legal roster with a provenance receipt (unwrap + 2 constant stamps + 13 renames); alias/canonical conflicts fail closed; identity normalization is byte-identical. Zero paid Provider calls. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.6+270.6 | Exactly one authorized post-boundary live retry (`--repair-round-5-after-output-alias-normalization`, chained to the preserved round-4 report, hard stop afterwards). Runner's ad-hoc unwrap/stamp logic removed — the runtime boundary owns normalization; every admitted prior failure report is preserved to its own `repair-round-N-report.json` (idempotent) before the single live-report path is rewritten. | `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`, artifacts under `build/ticket-27-slices-269-270-live-roster-plan-v1/` (gitignored) |
| 269.7 | Strict generation-side output contract set v1.0.0 closing the saved live round-5 omitted-field blocker. One versioned strict Provider JSON schema (subset `project_d_provider_json_schema_strict_v1`) per deliberation round kind, derived from the runtime validators; schemas bind field names, types, bounds and enums only — never roster content, candidate identity or strategy. `toolRequest` is a closed superset over every laboratory query family; the runtime's new kind-driven canonicalization drops schema-mandated placeholder fields, so placeholders never reach Rules or tool receipts and the deterministic plan hash is byte-identical. Every round request now carries `responseFormat` (schema, schemaName, versioned output contract ref); the runtime descriptor, round receipts and session receipt bind the contract set. The normalization boundary and full schema/Rules validation still run on every decoded output. | `packages/roster-strategist/roster-strategist-output-schemas-v1.mjs`, `packages/roster-strategist/roster-strategist-runtime-v1.mjs`, `packages/roster-strategist/index.mjs` |
| 269.5 continuation (269.7 gate) | Focused regression coverage for the captured round-5 failure: offline replay reproduces the exact saved failure (`ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,implication`) byte-identically; the captured shape is a wire-level rejection under the strict foundation schema (`required_field_missing` for the omitted contracted fields, `additional_property_forbidden` for `evidence`/`implication`); every scripted round output (foundation/proposals/comparison/revision) satisfies its strict schema, proving schema and runtime validator field sets agree; every recorded round request carries the schema; new checks failed before the runtime wiring (descriptor-binding assertion) and passed once after. Zero paid Provider calls. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.8+270.7 | Exactly one authorized post-strict-schema live attempt (`--repair-round-6-after-strict-schema-generation`, chained to the preserved round-5 report, hard stop afterwards). The live deliberation port now uses the existing structured Provider Worker (`structured-provider-worker-port-v1`, profile registry v2, DeepSeek Responses dialect, capability `responses_json_schema`) with the round's strict JSON schema in `text.format`; lossless JSON normalization, local subset validation, usage extraction and redacted receipts follow the existing adapter discipline; auth/ambiguity stops unchanged. | `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`, artifacts under `build/ticket-27-slices-269-270-live-roster-plan-v1/` (gitignored) |
| 269.9 | Domain-owned integer bounds closing the saved live round-6 blocker (`…vespeneLimitNumerator:integer_too_large`). Every integer bound in the output contract set is derived from the Rules-side domain rules — the laboratory accepts any safe integer for every math input (`integer()` in `pregame-scene-laboratory-v1.mjs`; its only tighter rule, `vespeneLimitDenominator >= 1`, is enforced there after canonicalization drops the zero placeholder) and the plan contracts accept any non-negative/positive safe integer — clipped to the strict subset's widest expressible bound (±1,000,000,000, `output-contract-registry-v1` `assertSchemaNode`). No value-, response- or roster-specific special case; deterministic plan/revision hashes byte-identical. Contract set v1.1.0. | `packages/roster-strategist/roster-strategist-output-schemas-v1.mjs` |
| 269.9 gate | Focused regression coverage for the captured round-6 failure: offline replay against the preserved v1.0.0 bound reproduces the saved failure byte-identically; the captured shape passes the repaired schema; every superset math integer bound equals the domain rule clipped to the subset ceiling (proven widest by a subset rejection probe); the laboratory computes the exact value the v1.0.0 schema rejected; the captured foundation plans end-to-end. Fail-first run stopped at the acceptance assertion. Zero paid Provider calls. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.10 | Deterministic instance-identity convention closing the saved live round-7 blocker (`faction_card_instance:mission_hold_position`). The strict subset cannot pattern-enforce identities, so the comparison schema now publishes the exact runtime-owned formats in field descriptions (`<sideKey>-faction`, `<sideKey>-tactical-<n>`, `agent-unit-<n>`, `<unitInstanceId>-composition`, `<unitInstanceId>-upgrade-<n>`, activation-order unit identity). General per component kind; runtime binding validation stays byte-for-byte strict. Contract set v1.2.0. | `packages/roster-strategist/roster-strategist-output-schemas-v1.mjs` |
| 269.10 gate | Focused regression coverage for the captured round-7 failure: the drifted-instance shape is wire-valid and fails closed at the runtime binding byte-identically; the convention-publication check failed before the repair (fail-first) and passed once after. Zero paid Provider calls. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.11 | Deterministic component identities sealed into the comparison-round request context, closing the saved live round-8 blocker (`unit_binding:agent-unit-1`). The strict binding rule requires runtime-owned identities, but the evaluated-candidates node published only hashes and verdicts, so the identities were not derivable from the request; the node now seals each candidate's faction card id, positional tactical-card ids, unit instance ids, composition ids and per-upgrade ids, derived positionally from candidate content (never invented). Runtime 1.2.0; plan hash byte-identical. | `packages/roster-strategist/roster-strategist-runtime-v1.mjs` |
| 269.11 gate | Focused regression coverage for the captured round-8 failure: the mismatched-binding shape is wire-valid and fails closed byte-identically; the context-sealing check failed before the repair (fail-first) and passed once after. Zero paid Provider calls. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.12+270.8 | Continued authorized live lane (user-authorized until one actual generated 2000-point roster plus initial `RosterPlan` passes the Rules-owned port, at most three new repair/live cycles). The runner admits repair rounds 7–9 only — the flag map is the hard maximum, no tenth flag exists; every attempt is separately locked, costed and retained with zero automatic retry; repairable failures are the typed public-output contract violations only, while 401/402/403, ambiguous dispatch, missing attachment, HTTP rejections, refusals, incomplete output and usage gaps stop the lane immediately. Rounds 7 and 8 failed closed (preserved reports); **round 9 passed**. (The runner-admission commit used the working label `269.10+270.8`; the closure table numbers it `269.12+270.8` for uniqueness.) | `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`, artifacts under `build/ticket-27-slices-269-270-live-roster-plan-v1/` (gitignored) |
| 269.13 | Mission-scoring authority projection (laboratory 1.1.0): the Rules-owned Hold Position scoring profile (re-verified through its own authoritative verifier) plus mission marker affinity placement, hash-bound to the frozen source Room state; unknown stays unknown and names the missing authority. Contract set v1.3.0 adds the general `scoreRouteAuthority` (foundation) and `resourceUtilization` (comparison) fields — field names/types/bounds/enums only. | `packages/roster-strategist/pregame-scene-laboratory-v1.mjs`, `packages/roster-strategist/roster-strategist-output-schemas-v1.mjs` |
| 269.14 | Budget-utilization and schedule-grounding runtime wiring (runtime 1.3.0): the mission-scoring authority is sealed into the foundation-round request and the grounding rule enforced with the derivable flag; the near-cap threshold is derived from the Rules-owned menu (cheapest positive purchasable increment); the comparison context publishes `budgetGuidance` plus per-candidate `mineralUnspent`/`nearCap`; `resourceUtilization` echoes must match the recomputed Rules-verdict facts and declining an available near-cap candidate requires a declared public justification; all outcomes bind in the session receipt. The normalization boundary's declared field sets track contract set v1.3.0. | `packages/roster-strategist/roster-strategist-runtime-v1.mjs`, `packages/roster-strategist/public-output-normalization-v1.mjs` |
| 269.15 | Focused round-9 list-quality regression coverage: descriptor binding of both contracts, the sealed authority node, schema description publication, session-receipt binding, comparison-context budget guidance, offline replays of the captured round-9 shapes (unknown schedule despite derivable authority; comparison without `resourceUtilization`; justification/echo negative gates), the near-cap positive case and the missing-authority cases. Fail-first stopped in `validateFoundation` on the new contracted key set (combined SHA-256 `b8a03e0b…`); passed once after the 269.14 wiring (67+21 checks). 0 Provider calls. | `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs` |
| 269.16+270.9 | The manifest-authorized single round-10 list-quality live cycle (`--repair-round-10-after-list-quality-contracts`, chained to the preserved round-9 success report; the flag map remained the hard maximum). The runner exposes `missionScoringAuthority` through its laboratory wrapper, states the lost-unspent/near-cap and schedule-grounding rules in the live instructions and binds the list-quality outcomes in the success report. **Failed closed on its first locked call** — see the live section. | `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`, artifacts under `build/ticket-27-slices-269-270-live-roster-plan-v1/` (gitignored) |
| 269.17 | General narrative-capacity policy closing the round-10 window-bound class (contract set v1.4.0, runtime 1.3.1): free public narrative (schedule-window labels, plans, rationales, justifications, summaries) is bounded only by the transport-level overall safety ceiling (65,536 — the strict subset's widest expressible string bound, mirroring the 269.9 integer-ceiling pattern); display targets stay published in descriptions and exceeding one is a soft public warning recorded in the runtime round receipt, never a rejection; the full public text is preserved; identifier/enum/identity/legality/structured-tool bounds are unchanged. The verifier gains a minimal `--narrative-recovery-only` mode (constant small time: no battlefield, Rules menu, pack or historical round replay). The runner persists every decoded public deliberation answer sanitized (hidden-reasoning-shaped keys dropped recursively, per-round byte cap, full public narrative preserved) on success and on failure for zero-new-cost revalidation, and gains the narrative-recovery lane: at most three additional physical calls outside the original ledger/lock, exclusive-create recovery lock, local pre-send call cap, same stop rules, no retry. | `packages/roster-strategist/roster-strategist-output-schemas-v1.mjs`, `packages/roster-strategist/roster-strategist-runtime-v1.mjs`, `scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs`, `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs` |
| Closure | Receipts, denominators, hash records, live accounting (calls, reported input/output tokens, estimated currency cost, latency, model/provider identity, prompt-pack/Skill routes) and honest gaps, each claim linked to an artifact or receipt. | this document |

## Authorities read (never modified)

- `packages/roster-strategist/roster-plan-contracts-v1.mjs` (Slice 267) and
  `packages/roster-strategist/army-builder-query-port-v1.mjs` (Slice 268).
- `packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs`
  with committed manifest
  `content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs`
  (exact manifest only, no highest-version autoselection).
- `packages/online-agent-session/combat-estimation-runtime-v1.mjs`
  (attack probability, fire-zone exchange) and
  `packages/online-agent-session/tactical-relationship-graph-v1.mjs`
  (exact spatial relationships).
- `packages/product-composition/official-standard-room-factory-v1.mjs` and
  `packages/product-composition/official-current-product-match-runtime-v1.mjs`
  (read-only enumeration/instantiation; transitions applied only on clones).
- `packages/secure-provider-runtime/` Keychain ingress, egress Worker port v2,
  structured Provider Worker port v1, profile registries v1/v2, egress
  contract v2 and pricing v2 (BYOK path; not modified).
- `packages/structured-generation/output-contract-registry-v1.mjs` (strict
  JSON-schema subset, output contracts, local validation; not modified) and
  `packages/secure-provider-runtime/provider-response-outcome-v1.mjs`
  (lossless JSON document normalization; not modified).
- Rules kernels remain the sole legality authority; the Strategist and
  laboratory never waive, reinterpret or repair a Rules rejection.

## Receipts

Focused verifier `node scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs`
— current state: **the full gate last passed once at the 269.13/269.14
wiring state** (67 Slice-269 checks + 21 Slice-270 checks, `ok: true`,
stdout SHA-256
`d552c451488747848bf20400e7df167c8e5d547fd51cd17473a90c7f516670cf`,
report schema `ticket27_slices_269_270_roster_strategy_report_v1`), after
the fail-first run of the 269.15 round-9 coverage stopped in
`validateFoundation` on the new contracted key set (combined stdout/stderr
SHA-256 `b8a03e0b5b3657f9ead1b947c3b5149a23a263c935411b31705f881d7256b7c8`).
For the 269.17 narrative-capacity repair the fail-first run stopped at the
round-10 acceptance assertion under the v1.3.0 64-cap schema (combined
stdout/stderr SHA-256
`8cdf62c92f4a085072f3fdc040859255d5ac7b43ab9ec7a551929f0b5b55d21a`);
**per the explicit user directive the 67+21 full gate was not rerun after
the 269.17 repair** (no single-field change justifies a full-gate rerun);
the focused evidence for 269.17 is the minimal `--narrative-recovery-only`
mode, green once (8 checks, `ok: true`, stdout SHA-256
`19230a86cee1283f9b15f8e5e4ced15a9566b0bf699a5448ee4c85c8074f51a6`,
contract set v1.4.0 hash
`647254caf01c2b8b4f20cde87a6ba3ea7c19c1f97a37a7198685a1adf678e544`,
0 Provider calls). The full-mode round-10 section is written to pass under
v1.4.0 but has deliberately not been executed; this is recorded honestly
rather than claimed. Two verifier-authoring iterations of the minimal mode
itself (a missing toolRequest placeholder superset, then a missing
`mineralSpendIntent` in the domain-transport probe) were corrected before
the green run — test-harness repairs only, 0 Provider calls.

Earlier full-gate receipts: the 269.4/269.5 gate passed with stdout SHA-256
`fe2e32e128f3ab53c05e5541cc6a405817e96ffa7f5dff43e2167de6f2e413c1`; the
269.7 gate passed with stdout SHA-256
`00e5eb76fab615f5819c3219ea82d84b7546b17019a086e093bbc484dcc0add0`; the
269.9 gate passed with stdout SHA-256
`3d15ecbca3253094e533bef988f4112d50cf63e54f1d718b6b671a909a704263`; the
269.10 gate passed with stdout SHA-256
`6a077114b26f064a4421135265e7db9af04d80cc5456687b467918df65f8ec10`; the
269.11 gate passed with stdout SHA-256
`b61ef23325dc95da2ebb97c2d2e9087afefc21323bcc863b5a26a4e2ef09d7de` (three
fail-first runs stopped at the exact implicated assertions — 269.9 combined
stdout/stderr SHA-256
`b67b6a37d070fb590dc53927fda9305d4de78cbdd7fd7b553a795909001361fc`, 269.10
`fb73a9105c71629e04457172b453abba7fc96042796f210e1be51d661ee59973`, 269.11
`a9b9c11d4c49f2924d40bb1757e62995200016eb785e3c3c41fd7bbda944a9fc`, plus one
verifier-only parenthesis repair — then the single passing run). All are
superseded by the 269.13/269.14 run above.

### Denominators (deterministic, mocked Provider, 0 paid calls)

- Slice 269 strategist checks: **67/67** at the 269.13/269.14 pass (51 from
  the 269.11 state + 16 round-9 list-quality checks from sub-slice 269.15:
  descriptor binding, sealed authority node, schema description publication,
  session-receipt binding, comparison-context budget guidance, the three
  round-9 offline replays, three echo/justification negative gates, the
  near-cap positive case and the two missing-authority cases). The round-10
  narrative-capacity checks of sub-slice 269.17 exist in full mode but were
  deliberately not executed there (see the user directive above); the
  minimal `--narrative-recovery-only` mode passed **8/8**.
- Slice 270 laboratory checks: **21/21** at the 269.13/269.14 pass (19 from
  the 269.11 state + 2 mission-scoring authority checks from sub-slice
  269.13: derivable projection and missing-authority unknown; the mutation
  proof now covers 12 operations).
- Multi-round planning trace: `strategy_foundation > candidate_proposals >
  comparison_selection` — 3 scripted deliberation rounds, 1 typed Rules
  rejection (`ARMY_SLOT_CAPACITY_EXCEEDED`, over-capacity stress candidate,
  `silentRepairAttempted: false`), final selection `cand-lean` (not the first
  proposal: no host or prompt preference weights; the runtime never ranks).
- Final roster Rules-legal through the read-only Army Builder port:
  Standard scale, 1870/2000 minerals, 115 vespene, audit result hash
  `8033210b51460f83e29e86ff9a2760589855b0a293b0c9fc0dba32adcf45722b`.
- Tool receipts attached to the plan: probability + spatial + math +
  simulation (scenario branch), each hash-bound and present in the laboratory
  mutation-zero receipt log.
- Determinism: identical session re-run reproduces identical plan hash.
  At the 269.13/269.14 pass the deterministic plan hash is
  `dbadea02b450a833f137652a8f3be3d69f35b071684301e2270082c893885f57` and the
  revision hash `0ddc43e9de05343eaa5d3963e677ac1aad0812be22a6aa1a392173b408fc33ff`;
  they supersede `925619d5…`/`e938fa1b…` **only because the laboratory
  version binding (1.1.0, sub-slice 269.13) changed every laboratory receipt
  hash and therefore the plan's toolReceiptReferences** — strategy content,
  roster, selections and costs are unchanged (cand-lean, 1870/2000,
  determinism check `true`). Earlier history: `925619d5…` was unchanged by
  the normalization boundary and the 269.7/269.9/269.10/269.11 repairs.
- Negative gates: hidden chain-of-thought field rejected
  (`ROSTER_STRATEGIST_HIDDEN_COT_REJECTED`), Rules-illegal selection rejected
  (`ROSTER_STRATEGIST_SELECTION_NOT_RULES_LEGAL`), unknown candidate selection
  rejected, off-menu proposals rejected, missing directed matchup Skill fails
  closed (`ROSTER_STRATEGIST_SKILL_ROUTE_UNAVAILABLE`).
- Round-4 alias-drift regression (sub-slice 269.5): the captured
  under-specified shape (`hypothesis,implication,observable`) still fails
  closed with `ROSTER_STRATEGIST_FOUNDATION_INVALID` after normalization —
  admitted aliases rename, `implication` stays unadmitted, the four missing
  contracted fields are never filled; an alias-complete foundation inside
  `channels.roster_strategy` without the two constants plans a Rules-legal
  roster (`cand-lean`, 1870/2000) with a provenance receipt recording 1
  envelope unwrap + 2 request-owned constant stamps + 13 admitted renames;
  an alias conflicting with a present canonical field fails closed; identity
  normalization of a contracted answer is byte-identical with an empty
  operation list.
- Round-5 omitted-field regression (sub-slice 269.7): the captured key set
  (`evidence,hypothesisText,implication`) replays offline through the current
  runtime and fails with
  `ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,implication`
  — byte-identical to `repair-round-5-report.json` `failureDetail`
  (`OFFLINE_REPLAY_MATCHES_SAVED_ROUND5_FAILURE`, 0 Provider calls); the same
  captured shape is a wire-level rejection under the strict foundation schema
  (`required_field_missing` for `hypothesisId`/`confidence` and the other
  omitted contracted fields, `additional_property_forbidden` for `evidence`
  and `implication`); every scripted round output satisfies its strict
  schema; every recorded deliberation request (all three planning rounds plus
  the revision round) carries the round's schema, schema name and versioned
  output contract ref, and the round receipts and session receipt bind the
  contract set.
- Round-6 schema-bound regression (sub-slice 269.9): the captured shape (a
  third math information need at `$.informationNeeds[2]` whose
  `vespeneLimitNumerator` exceeds the v1.0.0 cap of 1,000; the exact model
  value was never persisted, so the replay uses 2,000 — the session's own
  mineral budget and the smallest representative over-bound value) replays
  offline against the preserved v1.0.0 bound and fails with
  `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.informationNeeds[2].toolRequest.inputs.vespeneLimitNumerator:integer_too_large`
  — byte-identical to `repair-round-6-report.json` `failureDetail`
  (`OFFLINE_REPLAY_MATCHES_SAVED_ROUND6_FAILURE`, 0 Provider calls); the
  identical shape passes the repaired v1.1.0+ schema; every superset math
  integer bound is the domain non-negative safe-integer rule clipped to the
  strict-subset ceiling ±1,000,000,000 (proven widest by a subset rejection
  probe at 1,000,000,001); the laboratory computes the captured numerator
  with exact integer arithmetic (`vespeneLimit.numerator` 4,000,000); the
  captured foundation plans end-to-end with the need answered.
- Round-7 identity-drift regression (sub-slice 269.10): the captured drifted
  faction-card instance (`mission_hold_position`) is wire-valid and fails
  closed at the strict runtime binding with
  `ROSTER_STRATEGIST_COMPARISON_INVALID:faction_card_instance:mission_hold_position`
  — byte-identical to `repair-round-7-report.json` `failureDetail`
  (`OFFLINE_REPLAY_MATCHES_SAVED_ROUND7_FAILURE`, 0 Provider calls); the
  comparison schema publishes the deterministic instance-identity convention
  for every component kind and the activation order.
- Round-8 identity-mismatch regression (sub-slice 269.11): the captured
  mismatched unit binding (`agent-unit-1` paired with the goliath recordKey;
  the exact recordKey the model wrote was never persisted, so the replay
  uses the smallest representative menu-known mismatch) is wire-valid and
  fails closed with
  `ROSTER_STRATEGIST_COMPARISON_INVALID:unit_binding:agent-unit-1` —
  byte-identical to `repair-round-8-report.json` `failureDetail`
  (`OFFLINE_REPLAY_MATCHES_SAVED_ROUND8_FAILURE`, 0 Provider calls); the
  comparison-round request now seals every evaluated candidate's
  deterministic faction/tactical/unit/composition/upgrade identities into
  the evaluated-candidates node.
- Round-9 list-quality regression (sub-slice 269.15, 0 Provider calls): the
  captured round-9 foundation shape (scheduleStatus unknown, authority
  declared unconfirmed) is wire-valid under the v1.3.0 schema and fails
  closed with
  `ROSTER_STRATEGIST_FOUNDATION_INVALID:schedule_grounding:derivable_authority_requires_declared_mission_grounded`
  (`OFFLINE_REPLAY_CLOSES_SAVED_ROUND9_SCHEDULE_GAP`); the captured round-9
  comparison shape (no `resourceUtilization`) is a wire-level rejection under
  v1.3.0 (`required_field_missing`) and fails the runtime byte-identically
  with `ROSTER_STRATEGIST_COMPARISON_INVALID:comparison,componentPurposes,deploymentConcept,lossResourceBudget,publicSummaryText,roundKind,schemaVersion`
  (`OFFLINE_REPLAY_CLOSES_SAVED_ROUND9_UTILIZATION_GAP`); declining an
  available near-cap candidate without a declared justification fails with
  `ROSTER_STRATEGIST_COMPARISON_INVALID:resourceUtilization:justification_required_when_near_cap_available`;
  echo mismatches and refusing the lost-unspent acknowledgment fail closed;
  selecting the available near-cap candidate needs no justification and
  spends the full legal budget (cand-full, 2000/2000); a missing authority
  preserves the unknown schedule and identifies the missing authority
  publicly while a declared grounded schedule then fails closed. The
  menu-derived near-cap threshold for this menu is 10 minerals; the
  foundation-round request seals the authority node with
  `authorityReceiptHash`
  `8d30850ebdaa148fc03631c692232233b20f0ab933524978d26c2d881cc4b193`.
- Round-10 narrative-capacity regression (sub-slice 269.17, 0 Provider
  calls): the saved wire failure
  `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.scoreRoute.targetVpSchedule[1].window:string_too_long,$.scoreRoute.targetVpSchedule[2].window:string_too_long,$.scoreRoute.targetVpSchedule[4].wind…`
  (the runner records failureDetail truncated to 200 characters) replays
  offline byte-identically against the preserved v1.3.0 64-cap bound
  (`OFFLINE_REPLAY_MATCHES_SAVED_ROUND10_FAILURE`). **Honesty note: the
  round-10 model output body was never persisted**
  (`rawResponsePersisted: false`), so the replay uses synthetic
  smallest-representative over-bound values (65 characters) at the saved
  issue paths — it is a saved-detail replay, not the real round-10 payload.
  Post-repair: all three schedule-window field kinds (score route, loss
  budget, math planned/projected) carry the 65,536 transport ceiling with
  the display-target soft-warning policy published; an over-ceiling label
  still fails the transport bound; identifier/enum/identity bounds are
  unchanged; the long-window foundation transports into the domain plan
  contracts with the full text preserved. From round 11 onward the runner
  persists the sanitized real public answers, so future failures can be
  revalidated with the real payload at zero new cost.
- Laboratory: reserve source state yields `unknown` spatial/probability
  receipts (never zeroed); A/B hypothetical-geometry branches from the same
  source state diverge exactly (Marine→Corpser base-edge distance 1385 vs
  15385 milli-inches, `exact_physical_footprints`); probability receipt
  `rulesMechanicsPerOutcome: "exact"`; threat exchange keeps opponent return
  fire unknown (`expectedDamageReceived: null`,
  `unknownValuesNeverPromotedToZero: true`); same-state A/B roster comparison
  binds both candidates to one source state and Builder bundle and never
  ranks; mutation-zero proof after 11 operations
  (`sourceStateMutationCount: 0`, bundle hash unchanged).

### Hash receipts (deterministic)

- Strategist runtime descriptor at the 269.13/269.14 pass:
  `4ddde1cd40b37e00ad6be0b2357f0c25538e56e2bad6b538f330867823fec224`
  (runtime 1.3.0 binds contract set v1.3.0, the schedule-grounding contract
  and the budget-utilization contract; supersedes `93264567…`). The 269.17
  narrative-capacity policy (runtime 1.3.1, contract set v1.4.0
  `647254caf01c2b8b4f20cde87a6ba3ea7c19c1f97a37a7198685a1adf678e544`)
  changes the descriptor and per-round contract hashes again; those hashes
  are exercised by the minimal `--narrative-recovery-only` mode and by the
  round-11 live run, not by a full-gate rerun (user directive).
- Strict output contract set v1.2.0:
  `059f948091ce086c6025e06b06b019adb63d94fa41b6b5e6a54bef339b60587d`
  (`starcraft_tmg_roster_strategist_output_contract_set_v1`; per-round
  contracts `roster_strategy_foundation_v1` `d7ee89cb…`,
  `roster_strategy_proposals_v1` `3c331e99…`,
  `roster_strategy_comparison_v1` `55bd100a…`,
  `roster_strategy_revision_v1` `96cbb621…`; supersedes v1.0.0
  `0f6ddb04…` and v1.1.0 `993cc061…`). v1.3.0
  `6a4074cfa09367bf795c9a2a72c8cb7e282741d68e13661cd7c07c10f7f1c27a` (269.13
  schedule-grounding and 269.14 budget-utilization fields) supersedes v1.2.0
  and is superseded by v1.4.0 `647254ca…` (269.17 narrative-capacity
  policy).
- Laboratory descriptor:
  `77679e8a3af840eda96950562198f9c3f99ffc71400ce60e51f6795dede3d8e7`
  (laboratory 1.1.0 with the mission-scoring authority projection;
  supersedes `368eb71d…`). Mission-scoring authority receipt
  `8d30850ebdaa148fc03631c692232233b20f0ab933524978d26c2d881cc4b193`
  (resultStatus `derivable`, Hold Position profile: 5 rounds, marker scoring
  from round 2, 1 VP neutral/own-affinity, 2 VP opponent-affinity, 1 VP per
  destroyed enemy supply, special-lead threshold 10, +2 supply per round).
- Source Room state: `c388ce539409ac4bad091a51b6e0431bf6e80fef284e98ef059fd31bd0430b5b`;
  Builder bundle `c7d27c66a0a21940e0d61a54f091ea7be8f23266891cca0da3c1cfeb77234c9c`
  (unchanged, still frozen).
- Skill route receipt `f584e4e79b223adb900aa9fba9a2bde4e36107d2c2fd9fe071008522983430c3`:
  General `starcraft-tmg.general-rules-and-strategy` `1.0.1-offline-replay-passed`,
  faction `starcraft-tmg.faction.terran_armed_forces`
  `1.0.0-offline-bounded-evaluation`, directed matchup
  `starcraft-tmg.matchup.terran_armed_forces-to-kerrigan_s_swarm`
  `1.0.0-offline-bounded-evaluation` — exact portable manifest only, Skills
  advisory (`canAffectRules: false`).
- Session receipt at the 269.13/269.14 pass:
  `e2d37e379a794681129d3907a06ebe4a431601f4fbacacd88f9cdfcc26155c76`
  (binds contract set v1.3.0 `6a4074cf…`, `missionScoringAuthorityStatus:
  derivable`, `scoreRouteAuthorityStatus: mission_grounded`,
  `nearCapThresholdMinerals: 10`, `nearCapLegalCandidateAvailable: true`,
  `selectedCandidateNearCap: false`,
  `retainedResourceJustificationStatus: declared`; supersedes `0a6635ec…`,
  `8abd047b…`, `afbf1827…` and `b85012b1…`);
  probability estimate `d0b04d0811f46ffe31bda04463795c2503ec2073f6c434c0fd0ff52e978fb77a`;
  threat-exchange estimate `ef4b0a299d715c6bcab82eb203602b11d30ec892550150fe9278d71742380cbf`;
  same-state A/B receipt `29b13a1fd237d7470e86a08e47f8eec5be8763fb427f5a8cb018a19124930ce2`;
  mutation-zero proof `a597834143cfac0187860741a9ed5ab0ad932b2e654bb5024705678921d16e70`
  (the 269.13 pass's mutation proof covers 12 operations).

### Normalization boundary receipts (sub-slices 269.4/269.5, 0 Provider calls)

- Alias registry v1.0.0 hash
  `93daf991d43b5e3e9d418d8bbeca5a9704edac8d752cafabcf3269d8d0a4b8eb`
  (`starcraft_tmg_roster_strategist_output_alias_registry_v1`, bound in the
  strategist descriptor).
- Offline replay of the exact saved round-4 failure from retained artifacts
  (hypothesis key set `hypothesis,implication,observable` through the
  pre-fix runtime) reproduced
  `ROSTER_STRATEGIST_FOUNDATION_INVALID:hypothesis,implication,observable`
  byte-identically to `repair-round-4-report.json` `failureDetail` —
  `OFFLINE_REPLAY_MATCHES_SAVED_ROUND4_FAILURE`, 0 Provider calls.
- Fail-first evidence: the new regression checks run against the pre-fix
  runtime failed at the registry-binding assertion (stdout SHA-256
  `c0e848332f94132e92a9752872ae67ec4ac6df2ef05cc3e97faaea7f38611ca7`); the
  full gate then passed once after the final code change (stdout SHA-256
  `fe2e32e128f3ab53c05e5541cc6a405817e96ffa7f5dff43e2167de6f2e413c1`).

### Strict generation-side contract receipts (sub-slice 269.7, 0 Provider calls)

- Contract set v1.0.0 hash
  `0f6ddb04ded5a352cb897f2de5d73166eb819ef633ab83ccc17f89018231b5a1`
  (four per-round strict subset schemas; bound in the strategist descriptor).
- Offline replay of the exact saved round-5 failure (hypothesis key set
  `evidence,hypothesisText,implication`) reproduced
  `ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,implication`
  byte-identically to `repair-round-5-report.json` `failureDetail` —
  `OFFLINE_REPLAY_MATCHES_SAVED_ROUND5_FAILURE`, 0 Provider calls.
- Fail-first evidence: with the contract module and the new checks in place
  but before the runtime wiring, the gate failed at the descriptor-binding
  assertion (combined-output SHA-256
  `d023a9d9eb8d15e87ac865368aad170e8ec4fb0cfa3682e32de7476abcb97161`); after
  the runtime wiring (and two verifier-only declaration-order repairs) the
  gate passed once (stdout SHA-256
  `00e5eb76fab615f5819c3219ea82d84b7546b17019a086e093bbc484dcc0add0`).
- Plan-level proof that the schema superset is content-neutral: the
  deterministic plan hash `925619d5…` and revision hash `e938fa1b…` are
  byte-identical to the pre-269.7 gate, so canonicalization keeps every
  laboratory call and receipt unchanged.

### Generation-contract repair receipts (sub-slices 269.9–269.11, 0 Provider calls)

- 269.9 domain-owned integer bounds: fail-first run stopped at the round-6
  acceptance assertion (combined stdout/stderr SHA-256
  `b67b6a37d070fb590dc53927fda9305d4de78cbdd7fd7b553a795909001361fc`); the
  gate passed once after the repair (stdout SHA-256
  `3d15ecbca3253094e533bef988f4112d50cf63e54f1d718b6b671a909a704263`,
  contract set v1.1.0 `993cc061…`, 45+19 checks).
- 269.10 instance-identity convention: fail-first run stopped at the
  convention-publication assertion (combined SHA-256
  `fb73a9105c71629e04457172b453abba7fc96042796f210e1be51d661ee59973`); the
  gate passed once after the repair (stdout SHA-256
  `6a077114b26f064a4421135265e7db9af04d80cc5456687b467918df65f8ec10`,
  contract set v1.2.0 `059f9480…`, 48+19 checks).
- 269.11 identity sealing: fail-first run stopped at the context-sealing
  assertion (combined SHA-256
  `a9b9c11d4c49f2924d40bb1757e62995200016eb785e3c3c41fd7bbda944a9fc`, after
  one verifier-only parenthesis repair); the gate passed once after the
  repair (stdout SHA-256
  `b61ef23325dc95da2ebb97c2d2e9087afefc21323bcc863b5a26a4e2ef09d7de`,
  runtime descriptor `93264567…`, 51+19 checks).
- Content-neutrality proof across all three repairs: deterministic plan hash
  `925619d5…` and revision hash `e938fa1b…` are byte-identical in every
  passing run; no runtime validator, Rules check or laboratory receipt moved.

## Live verification (269.3+270.3, 269.6+270.6, 269.8+270.7 and 269.12+270.8) — passed on repair round 9

Runner `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`
(two explicit authorization flags, one-attempt lock, macOS Keychain →
isolated Provider Worker BYOK, DeepSeek flash profile
`starcraft-tmg.live-opponent.deepseek-v4-1-flash.v1`, no retry, stop on
401/402/403/ambiguous dispatch/missing attachment). Nine bounded attempts
were made — the initial attempt, the three original repair rounds, the
single authorized post-normalization-boundary retry, the single authorized
post-strict-schema attempt, and the three user-authorized continuation
cycles (rounds 7–9) — every attempt separately locked, costed and retained
with **0** automatic retries, reported model `deepseek-flash`, HTTP 2xx
transport. Attempts 1–6 each made exactly **1** physical Provider call and
failed the strategist's strict public output contract on the host side:

1. Round 1: model wrapped the answer in the transport's `channels` envelope
   (`ROSTER_STRATEGIST_OUTPUT_INVALID`); receipt
   `9fe615c205cd69aeb406fb2e342d39969461668d921ccdcb942c9ee1c8ecd9aa`
   (token detail not retained by the then-current failure report; honest
   gap below).
2. Repair round 2 (channel unwrap + top-level envelope instruction): same
   failure code; report overwritten by round 3 (receipt detail not retained;
   honest gap below).
3. Repair round 3 (envelope-key diagnostics, looser unwrap): model returned
   exactly the declared field set but omitted the two constant envelope
   fields (`schemaVersion`, `roundKind`). Report preserved at
   `build/ticket-27-slices-269-270-live-roster-plan-v1/repair-round-3-report.json`
   (`ee2565183a78484a…`); call `8d1503e1c7de…`, 16,561 in / 1,372 out /
   17,933 total reported units, 9,742 ms.
4. Repair round 4 (constant-envelope stamping from the request, recorded in
   the receipt): model answered with semantically equivalent but renamed
   hypothesis keys (`hypothesis, implication, observable` vs the contracted
   `hypothesisId, archetypeLabel, hypothesisText, confidence,
   expectedCounterTexts, ownCounterResponseIds, falsificationText`) →
   `ROSTER_STRATEGIST_FOUNDATION_INVALID`. Report preserved at
   `build/ticket-27-slices-269-270-live-roster-plan-v1/repair-round-4-report.json`
   (`60475ec4398015c3…`); call `4fdd64f1af4d…`, 17,612 total reported units.
5. Repair round 5 (the single authorized post-boundary retry,
   `--repair-round-5-after-output-alias-normalization`): the runtime's typed
   normalization boundary processed the raw model output; the model this
   time answered hypothesis entries with keys
   `evidence, hypothesisText, implication`. `hypothesisText` is contracted
   (or admitted), but `evidence` and `implication` are not admitted aliases
   and the contracted fields `hypothesisId`, `archetypeLabel`, `confidence`,
   `expectedCounterTexts` and `ownCounterResponseIds` were absent. The
   boundary correctly refused to invent or fill that semantic content and
   validation failed closed:
   `ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,implication`.
   Report preserved at
   `build/ticket-27-slices-269-270-live-roster-plan-v1/repair-round-5-report.json`
   (`d9498d14ec0339ae…`, file SHA-256
   `a1b0874d83a88d3e0349b2dc34ff9931b3379c4b09312b4e4cb1065e7fbaf25a`); call
   receipt `22c457ecc58d5567d7fc7aeefc1d0da2798514d9a1336d782f987342baa2a44d`,
   16,561 in / 1,316 out / 17,877 total reported units
   (16,384 cache-hit / 177 cache-miss), 9,453 ms, status 200.
6. Repair round 6 (the single authorized post-strict-schema attempt,
   `--repair-round-6-after-strict-schema-generation`): the deliberation port
   sent the foundation round through the structured Provider Worker with the
   strict `roster_strategy_foundation_v1` JSON schema in `text.format`
   (DeepSeek Responses `json_schema`). The generation-side contract worked
   as designed — the model returned the full contracted field set, including
   both request-owned constants and all seven hypothesis fields; the failure
   moved from *missing semantic fields* to a **bounds violation inside a
   placeholder superset field**:
   `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.informationNeeds[2].toolRequest.inputs.vespeneLimitNumerator:integer_too_large`.
   The model wrote a value above the schema's `vespeneLimitNumerator`
   maximum (1,000) — a ratio field the laboratory itself accepts as any safe
   integer, so the schema bound authored in 269.7 was tighter than the domain
   and failed closed on a value the Rules side would have computed. The
   decoded output was validated locally against the same subset before the
   runtime was invoked; no normalization, filling or retry occurred. Report
   at `build/ticket-27-slices-269-270-live-roster-plan-v1/live-report.json`
   (`383c61d06889de2dd438be1385ad2a6dd9fc9db6d3423970d41f8ac116e46534`, file
   SHA-256 `fc7eec8eaa0a3e6e99e7a0f83313defc1d3c17174d264b4fab5a24dda30838f7`;
   preserved as `repair-round-6-report.json` when round 7 was admitted, per
   the preservation design); call receipt
   `112c38c0d200390313791b9e83b95aaba800d2c58db71d2411fa4b5da9d2f127`,
   19,634 in / 6,133 out / 25,767 total reported units (0 cache-hit /
   19,634 cache-miss), 31,497 ms, status 200, output contract
   `roster_strategy_foundation_v1` bound in the transport receipt
   (`schemaHash`/`requestBodyHash`/`outputContractRef`).

The user then explicitly authorized continued real BYOK attempts until one
actual generated 2000-point roster plus initial `RosterPlan` passes the
Rules-owned port, bounded to three new repair/live cycles (the runner's
repair-flag map is the hard maximum — no tenth flag exists). Each cycle
changed only the directly implicated generation contract after a focused
offline fail-first check:

7. Repair round 7 (`--repair-round-7-after-domain-integer-bounds`, contract
   set v1.1.0): the foundation round passed the repaired schema and the
   proposals round passed; the comparison round failed closed at the strict
   runtime binding — the model invented a semantic faction-card instanceId
   (`mission_hold_position`, the mission record name) instead of the
   runtime-owned deterministic identity →
   `ROSTER_STRATEGIST_COMPARISON_INVALID:faction_card_instance:mission_hold_position`.
   Report preserved at
   `build/ticket-27-slices-269-270-live-roster-plan-v1/repair-round-7-report.json`;
   3 calls, 40,335 total reported units, receipts
   `ea27b3576f5f793e02…`, `c2299db8226138aa…`, `d3d629de25af77b53b…`.
8. Repair round 8 (`--repair-round-8-after-generation-contract-repair`,
   contract set v1.2.0 with the published identity convention): the
   faction-card identity was now correct, but the model paired a unit
   purpose recordKey with the wrong deterministic unit id →
   `ROSTER_STRATEGIST_COMPARISON_INVALID:unit_binding:agent-unit-1`. Root
   cause: the sealed comparison-round context published only candidate
   hashes and verdicts, never the candidates' unit lists, so the
   runtime-owned identities were not derivable from the request at all.
   Report preserved at
   `build/ticket-27-slices-269-270-live-roster-plan-v1/repair-round-8-report.json`;
   3 calls, 39,682 total reported units, receipts
   `379ff5f84c310a38…`, `c8d3ddf48bbedeaf…`, `038bf991987863e8…`.
9. Repair round 9 (`--repair-round-9-after-generation-contract-repair`,
   runtime 1.2.0 sealing deterministic component identities into the
   evaluated-candidates node): **passed**. One actual generated
   Standard-2000 roster plus initial `RosterPlan` went through the full
   three-round deliberation (foundation → proposals → comparison), the
   normalization boundary and full schema/Rules validation, and the final
   roster was re-validated through the Rules-owned Army Builder port with a
   matching audit result hash. 3 calls, 31,595 in / 9,747 out / 41,342
   total reported units, 51,029 ms total latency, all HTTP 200,
   `deepseek-flash`, 0 automatic retries. Live report
   `build/ticket-27-slices-269-270-live-roster-plan-v1/live-report.json`
   (`0bcba524184c8b7c91294f4739ffafc4dce169a3d7016b271b16706990ceb585`).

Round-9 retained success artifacts (all redacted; no raw prompt, response
or credential anywhere):

- `RosterPlan` `a1e5345090e0bb6355e11d6a4843a2b405dccc6f711fdd7c07c7975a3a2f5407`
  (`roster-plan.json`, file hash
  `bda8cb0d0dfdb10321dfd8168b9ef8d112d6d12b03f713642e4bd88ff0408bed`):
  planStatus `active`, selected candidate
  `terran_marker_hold_balanced_core`, Rules-legal Standard roster
  (940/2,000 minerals, 90 vespene, final audit result hash
  `3580ecbd13e825a376597a7ca7139bf065466dba6630e445d2030c4a3c76ed90`,
  re-proven through the port at plan time and re-validated by the runner),
  explicit win route `mission_marker_control` (schedule honestly `unknown`),
  declared 8-step activation order, declared loss budget, 5 opponent
  hypotheses, 9 counter-responses, 7 invalidation triggers, 17 component
  purposes and a public summary — public reasoning throughout, no hidden
  chain-of-thought.
- Tool receipts: 8 references (math, spatial and simulation/probability
  kinds; 5 attached with results, 3 honestly `unknown` — unknown is never
  promoted to zero), `tool-receipts.json` hash
  `494f113661dd3c4655b4e086991e8726280f7741ce56263c8e1b7ec70bed767f`;
  laboratory mutation-zero proof `sourceStateMutationCount: 0` over 5
  operations, source state hash unchanged
  (`c388ce539409ac4bad091a51b6e0431bf6e80fef284e98ef059fd31bd0430b5b`).
- Planning trace + session receipt (`planning-trace.json` hash
  `e24cc094883e37c3c94df227171aa760a634efe15e2d4b61ca6153c15c10ad1a`,
  session receipt `178ab72786e0228d155996387b2778d910594e965d732d69d82e6bed746d2f16`).
- Redacted Provider receipts + Keychain ingress receipt
  (`provider-receipts-redacted.json` hash
  `151224d1bb43ed1df71021a6f2fb2da4fb3de5c13fdbf94f11ed62bef4363bd8`);
  per-call receipt hashes
  `0248a5c6b21fd9a94478a965dce37a090b8e32b00be9dec7c32201d4dd572cc4`,
  `8260b2fb746fa0cc475ef511211d7d9327bbe6015670a5b4a024901be9f07819`,
  `83c10dd8f3a87300d18c34a70583b39dd6a7fad4cbd8f945fec027662ee64f0d`.
- Pricing receipt: snapshot
  `b16568816783b8deb7d529aefbaaea723d998e9251f73ccaf9a56fe9bf0541db`,
  7,407,546 nano-USD total, 59,262 CNY micros (≈ ¥0.0593); pricing receipt
  hashes `bc762b03…`, `797efa4b…`, `aa0285f9…`.
- Fixed preset-roster comparison (`preset-comparison.json` hash
  `9983ceba9e1f7f452588c4bb1268c5998e3a7b54588cc2e9c2a065615f1a7bd6`):
  preset arm `planStatus=no_pregame_plan` (2,000 minerals / 115 vespene,
  audit `e5d86280…`) against the Agent arm above, matched on mission,
  deployment, map topology, scale, budget, opponent faction and model;
  list quality explicitly separated from play quality (no match played).
- Credential hygiene for every attempt, including round 9: Keychain
  ingress via the existing secure path only, one isolated-Worker
  attachment, `detachCredential` in the runner's `finally` path and
  parent-side credential bytes verified zeroed before nulling
  (`credentialBytes.every(byte === 0)` assertion, `fill(0)` in `finally`);
  every report records `rawCredentialPersisted: false`,
  `rawPromptPersisted: false`, `rawResponsePersisted: false`; the report
  directory contains only the redacted JSON receipts inspected above —
  zero credential persistence.

Every attempt report is now preserved under its own
`repair-round-N-report.json` (rounds 3–8 on disk; rounds 1–2 lost to the
historical single-report-path design, honest gap below). Round 9's success
report chains the preserved round-8 failure report
(`priorAttemptsChain.immediatePriorReport.reportHash`
`a6f77abef61ddf70f4ea97651e1cee6adee1174d6d898d310b08284dec894e64`).

### List-quality reopening: rounds 10–11 (269.16+270.9 and 269.17 follow-up)

10. Repair round 10 (`--repair-round-10-after-list-quality-contracts`,
    contract set v1.3.0, runtime 1.3.0 — the manifest-authorized single new
    three-round cycle): the round-9 success report was preserved to
    `repair-round-9-report.json` before the live-report path was rewritten.
    The deliberation worked as reopened — the model grounded the schedule in
    the sealed mission authority — and then failed closed at the wire on its
    first locked call: the grounded window labels exceeded the 269.7-era
    host-authored 64-character cap →
    `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.scoreRoute.targetVpSchedule[1].window:string_too_long,$.scoreRoute.targetVpSchedule[2].window:string_too_long,$.scoreRoute.targetVpSchedule[4].wind…`
    (failureDetail recorded truncated to 200 characters). Report preserved at
    `build/ticket-27-slices-269-270-live-roster-plan-v1/repair-round-10-report.json`
    (reportHash `d46f697113700f9e501560b355a6be3560ecdbdcbc025ca2ebd74064712ed5c5`,
    copied from `live-report.json` by the recovery admission; the same
    content remains at `live-report.json`). 1 call, 20,564 in / 6,427 out /
    26,991 total reported units, 32,514 ms, HTTP 200, `deepseek-flash`,
    receipt `cc173fc4577bda8f9b532563a2a636087002c2c2a13a90244ea9b96b2c51dd4e`;
    estimated cost 6,940,800 nano-USD (55,527 CNY micros ≈ ¥0.0555, pricing
    v2 snapshot `b1656881…`, computed offline from the redacted usage
    receipt). The round-10 output body was never persisted
    (`rawResponsePersisted: false`) — stated honestly; the offline replay
    uses synthetic smallest-representative values and is labelled as such.
11. Recovery round 11 (`--narrative-recovery-after-capacity-policy`,
    contract set v1.4.0, runtime 1.3.1 — the newly authorized lane of at
    most three additional physical calls outside the original ledger and
    lock, exclusive-create `recovery-lock.json`, local pre-send call cap):
    the narrative-capacity repair proved itself live — the **foundation
    round passed** the v1.4.0 strict schema with a mission-grounded schedule
    whose long authority-citing window labels transported without rejection
    (the round-10 class is closed), and the **proposals round passed** with
    four candidates; the **comparison round then failed closed** on a
    separate structural defect: the model lifted `selectedCandidateId` to
    the top level of the output instead of nesting it under `comparison` →
    `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.comparison.selectedCandidateId:required_field_missing,$.selectedCandidateId:additional_property_forbidden`.
    3 calls, 53,840 total reported units (27,651 + 8,500 + 17,689;
    cache-aware breakdowns retained), 31,578 / 15,607 / 25,179 ms, all HTTP
    200, `deepseek-flash`, 0 automatic retries, the three-call cap never
    reached a fourth send. Estimated cost 14,770,170 nano-USD (118,163 CNY
    micros ≈ ¥0.1182, same snapshot, computed offline). Report at
    `build/ticket-27-slices-269-270-live-roster-plan-v1/recovery-report.json`;
    the sanitized real public answers of all three rounds are persisted at
    `recovery-public-round-outputs.json` (hash
    `4fe959dc0d93756dc1f7fe33e777db7d3d50ce6dbab05aef93de5fed2866dec8`;
    zero hidden-reasoning-shaped keys dropped — the model emitted none;
    `rawRequestPersisted: false`, `rawResponseTextPersisted: false`,
    `rawCredentialPersisted: false`, full public narrative text preserved).
    Zero-cost revalidation against the v1.4.0 comparison schema reproduces
    the saved failure **byte-identically from the real sanitized payload**
    (`REPLAY_MATCHES_SAVED_ROUND11_FAILURE: true`); the real public content
    also shows the repair intent landed: `scoreRouteAuthority:
    mission_grounded` citing the sealed Hold Position profile hash, a
    declared 5-entry VP schedule, and a `resourceUtilization` block
    acknowledging lost unspent budget. The three-call recovery budget is
    exhausted; per the no-retry rule the lane stops here.

Credential hygiene for rounds 10–11 is identical to rounds 1–9: Keychain
ingress via the existing secure path only, one isolated-Worker attachment,
`detachCredential` in the runner's `finally` path and parent-side credential
bytes verified zeroed before nulling; both reports record
`rawCredentialPersisted: false`, `rawPromptPersisted: false`,
`rawResponsePersisted: false`.

**Resolved High finding (previously blocking):** the round-6 schema-internal
integer bound (`vespeneLimitNumerator` max 1,000, tighter than the
laboratory domain) was repaired generally in 269.9 by deriving every
integer bound from the domain-owned safe-integer rules clipped to the
strict-subset ceiling; rounds 7–8 exposed and closed the two remaining
host-side identity-contract gaps (269.10 convention publication, 269.11
context sealing); round 9 passed end-to-end. No Critical/High finding
remains open.

**Unresolved High finding (blocking the reopened live list-quality
acceptance):** the round-11 comparison-round nesting drift — the model
lifted `selectedCandidateId` to the top level of the comparison output
instead of nesting it under `comparison`
(`$.comparison.selectedCandidateId:required_field_missing` +
`$.selectedCandidateId:additional_property_forbidden`) — is a typed
host-side public-output contract violation in the same repairable class as
rounds 4–10, but the narrative-recovery lane's three-call budget is
exhausted and no further paid call is authorized in this slice. Repairing
it (comparison-schema nesting publication and/or a normalization admission
for the exact observed lift) plus one new bounded live cycle requires new
explicit user authorization. The round-9 legality pass remains the last
passing live acceptance; the deterministic contracts, offline replays and
the round-11 partial pass (foundation + proposals) are unaffected.

**Consequence:** a live-generated Rules-legal `RosterPlan` exists (round 9)
and the preset-roster comparison with `planStatus=no_pregame_plan` has its
passing live counterpart; live acceptance per the original task brief stays
**met**. The reopened list-quality lane delivered the general contracts,
the offline regression evidence and a live proof of the schedule-grounding
repair, but a live-generated near-cap (or explicitly justified)
mission-grounded complete plan is still outstanding under the unresolved
High finding above.

## Accounting

- Deterministic gates: 0 Provider calls, ¥0 (one fail-first run and one
  passing run per repaired class — 269.7, 269.9, 269.10, 269.11, 269.15 —
  plus verifier-only repairs; for 269.17 the recorded fail-first stop under
  the v1.3.0 schema and one green `--narrative-recovery-only` run, 8 checks;
  the 67+21 full gate was not rerun after 269.17 per the explicit user
  directive; offline replays 0 calls).
- Live attempts: 19 Provider calls total across 11 separately locked,
  costed and retained attempts (rounds 1–6: 1 call each; rounds 7–9: 3
  calls each; round 10: 1 call; recovery round 11: 3 calls), all DeepSeek
  `deepseek-flash`, HTTP 2xx, automatic retries 0. Retained usage: round 3 —
  16,561 in / 1,372 out / 17,933 total units, 9,742 ms; round 4 — 17,612
  total units; round 5 — 16,561 in / 1,316 out / 17,877 total units (16,384
  cache-hit / 177 cache-miss), 9,453 ms; round 6 — 19,634 in / 6,133 out /
  25,767 total units (0 cache-hit / 19,634 cache-miss), 31,497 ms; round 7 —
  40,335 total units across 3 calls (25,367 + 5,914 + 9,054), 47,165 ms;
  round 8 — 39,682 total units across 3 calls (24,500 + 6,169 + 9,013),
  51,339 ms; round 9 (passed) — 31,595 in / 9,747 out / 41,342 total units
  across 3 calls (24,889 + 5,702 + 10,751), 51,029 ms; round 10 — 20,564 in
  / 6,427 out / 26,991 total units (0 cache-hit / 20,564 cache-miss),
  32,514 ms, 1 call; recovery round 11 — 53,840 total units across 3 calls
  (21,377 in / 6,274 out / 27,651 with 128 cache-hit, 31,578 ms; 5,131 in /
  3,369 out / 8,500 with 256 cache-hit, 15,607 ms; 12,247 in / 5,442 out /
  17,689 with 256 cache-hit, 25,179 ms), 72,364 ms total latency.
  Rounds 1–2 usage not retained (report-format gap below). Estimated cost
  at the current DeepSeek snapshot (pricing v2, snapshot
  `b16568816783b8deb7d529aefbaaea723d998e9251f73ccaf9a56fe9bf0541db`):
  round 5 1,730,604 nano-USD (≈ ¥0.0138 at the conservative 8.0 fallback
  rate; pricing v2 exposes no CNY figure), round 6 6,624,900 nano-USD
  (≈ ¥0.0530, pricing receipt
  `4b3101adf834b91fac545fe9c43748d033e0d5873edbb6f2614182940e4cdda2`),
  round 7 10,314,786 nano-USD (≈ ¥0.0825, computed offline from the
  redacted usage receipts), round 8 7,138,890 nano-USD (≈ ¥0.0571,
  computed offline the same way), round 9 7,407,546 nano-USD
  (59,262 CNY micros ≈ ¥0.0593, runner pricing receipts `bc762b03…`,
  `797efa4b…`, `aa0285f9…`), round 10 6,940,800 nano-USD (55,527 CNY
  micros ≈ ¥0.0555, computed offline from the redacted usage receipt),
  recovery round 11 14,770,170 nano-USD (118,163 CNY micros ≈ ¥0.1182,
  computed offline the same way); rounds 3–4 well under ¥0.05 each; the
  documented rounds sum to ≈ 54,927,696 nano-USD (≈ ¥0.44); no ¥100
  threshold crossed.
- No source refresh, no Room mutation (mutation-zero proof in both the gate
  and the live runner), no Skill generation/promotion, no training truth.
- Credential hygiene for every attempt: Keychain ingress via the existing
  secure path only, one isolated-Worker attachment, `detachCredential` and
  parent-side zero-fill in the runner's `finally` path, zero credential
  persistence (all eleven reports record `rawCredentialPersisted: false`,
  `rawPromptPersisted: false`, `rawResponsePersisted: false`).

## Remaining honest gaps (nonblocking)

- The strategist runtime validates the structure, provenance and Rules
  legality of a plan; it cannot judge the strategic quality of public prose.
  The passing live roster spent 940 of 2,000 minerals — Rules-legal with
  large headroom; list quality vs play quality is separated in the
  comparison artifact and match-play evidence remains Slice 272 scope.
- Scenario branches are advisory hypothetical geometry (or Rules-legal
  lifecycle transitions on clones); hypothetical placements claim no Rules
  legality.
- The laboratory reports opponent return fire as unknown by contract; it is
  never promoted to zero (three of the eight live round-9 tool receipts are
  honestly `unknown`).
- The round-9 win route declares `mission_marker_control` with
  `scheduleStatus: unknown` — the contract permits declared-or-unknown and
  the runtime never forces a fabricated schedule.
- Live runner repair-round reports historically shared one report path, so
  the round-1/round-2 failure reports are lost (round-1 receipt hash
  retained); from sub-slice 269.6+270.6 every admitted prior failure report
  is preserved to its own `repair-round-N-report.json` before the single
  live-report path is rewritten (rounds 3–8 preserved).
- The exact over-bound integer the round-6 model wrote and the exact
  recordKey the round-8 model paired with `agent-unit-1` were never
  persisted (`rawResponsePersisted: false`; failure details carry
  path:code only), so the offline replays use the smallest representative
  values consistent with the saved paths; both replays reproduce the saved
  failure details byte-identically.
- The normalization boundary admits naming drift and transport envelopes
  only; it deliberately cannot recover a model answer that omits contracted
  semantic fields (the round-5 outcome). Generation-side enforcement landed
  in 269.7/269.8+270.7 and closed that class; the round-6 outcome was a
  schema-internal bound calibration gap, resolved in 269.9; rounds 7–8 were
  host-side identity-contract gaps, resolved in 269.10/269.11.
- The strict subset cannot pattern-enforce deterministic identities; the
  269.10/269.11 repairs publish the convention in schema descriptions and
  seal the concrete identities into the request context, while the runtime
  binding rule remains the strict enforcement point.
- The round-9 win route's `scheduleStatus: unknown` and the 940/2,000
  mineral spend are the exact gaps the reopening addressed: the 269.13
  authority projection makes the Hold Position schedule derivable and the
  269.14 budget contract makes unspent budget an explicit opportunity cost;
  the round-11 live foundation demonstrated both (mission-grounded schedule
  citing the sealed profile, `unspentBudgetAcknowledgedLost: true`) before
  the comparison-round nesting drift stopped the session.
- The round-10 model output body was never persisted
  (`rawResponsePersisted: false` under the pre-269.17 runner), so its
  offline replay uses synthetic smallest-representative values and is
  labelled a saved-detail replay, never a real-payload replay. From the
  269.17 runner onward, sanitized real public answers are persisted on
  success and failure (`recovery-public-round-outputs.json` for round 11),
  so the round-11 failure replay uses the real payload at zero new cost.
- The 269.17 contract set (v1.4.0) and runtime (1.3.1) are gated by the
  minimal `--narrative-recovery-only` mode (8/8) and the round-11 live
  foundation/proposals passes; the full 67+21 gate was deliberately not
  rerun after 269.17 (explicit user directive against rerunning the full
  gate for a single-field-class change), so no fresh full-gate pass is
  claimed for the post-269.17 tree. The full-mode checks are written to
  pass under v1.4.0 and the last executed full pass covers the
  269.13/269.14 tree state.
- The narrative-capacity policy's display targets (64 for schedule-window
  labels, 2,000 for prose) are presentation guidance only; the runtime
  records soft warnings publicly in the round receipts and never rejects on
  them. Only the transport-level ceiling (65,536) is a hard bound.
