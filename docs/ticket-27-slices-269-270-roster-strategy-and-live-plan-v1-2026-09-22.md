# Ticket 27 / Slices 269–270 — Roster strategy and live plan v1

Date: 2026-09-22. Status: frozen sub-slices, implementation pending.
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
  profile registry and pricing v2 (BYOK path; not modified).
- Rules kernels remain the sole legality authority; the Strategist and
  laboratory never waive, reinterpret or repair a Rules rejection.

## Receipts

Pending implementation.
