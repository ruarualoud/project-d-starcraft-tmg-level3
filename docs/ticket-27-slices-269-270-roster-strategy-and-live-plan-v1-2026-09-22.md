# Ticket 27 / Slices 269–270 — Roster strategy and live plan v1

Date: 2026-09-22. Status: deterministic acceptance complete (`269.1`, `270.1`,
`269.2+270.2`); live acceptance **blocked by one open High finding** after the
three-round live repair convergence limit (`269.3+270.3` attempted, stopped).
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

Focused verifier `node scripts/verify-ticket-27-slices-269-270-roster-strategy-v1.mjs`
passed after the final relevant code change (two repair rounds on the verifier's
own assertions: the `rulesMechanicsPerOutcome` field is the string `"exact"`,
and the determinism twin must share the laboratory identity; no product-code
behavior change except pass-through of the exact value). Report schema
`ticket27_slices_269_270_roster_strategy_report_v1`, `ok: true`.

### Denominators (deterministic, mocked Provider, 0 paid calls)

- Slice 269 strategist checks: **23/23**.
- Slice 270 laboratory checks: **18/18**.
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
- Determinism: identical session re-run reproduces identical plan hash
  `925619d50a16a5e42529e49244b60ea4f4cdacbbe915a170c933eab84fe8d39a`.
- Revision chain: plan v2 `revised` hash-binds v1
  (`e938fa1b520aaa298e3f1091b2b814537ffb22af698aa032ed4cb824b8dc8d98`).
- Negative gates: hidden chain-of-thought field rejected
  (`ROSTER_STRATEGIST_HIDDEN_COT_REJECTED`), Rules-illegal selection rejected
  (`ROSTER_STRATEGIST_SELECTION_NOT_RULES_LEGAL`), unknown candidate selection
  rejected, off-menu proposals rejected, missing directed matchup Skill fails
  closed (`ROSTER_STRATEGIST_SKILL_ROUTE_UNAVAILABLE`).
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

- Strategist runtime descriptor:
  `26d97554fbd0af3070de564a12d6d87bb2a58861ffa4352e6b4d0a6e22e5c951`.
- Laboratory descriptor:
  `368eb71df81e62b3f1046e4ff929eebb80ab227bb60860010e0f3597817b604f`.
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
- Session receipt `1d7242a5bac8f03cfd0b3449e6715215a34cf10143fe0a333b1c9d7d2664ff01`;
  probability estimate `d0b04d0811f46ffe31bda04463795c2503ec2073f6c434c0fd0ff52e978fb77a`;
  threat-exchange estimate `ef4b0a299d715c6bcab82eb203602b11d30ec892550150fe9278d71742380cbf`;
  same-state A/B receipt `29b13a1fd237d7470e86a08e47f8eec5be8763fb427f5a8cb018a19124930ce2`;
  mutation-zero proof `a597834143cfac0187860741a9ed5ab0ad932b2e654bb5024705678921d16e70`.

## Live verification (269.3+270.3) — blocked, High

Runner `scripts/run-ticket-27-slices-269-270-live-roster-plan-v1.mjs`
(two explicit authorization flags, one-attempt lock, macOS Keychain →
isolated Provider egress Worker v2, DeepSeek flash profile
`starcraft-tmg.live-opponent.deepseek-v4-1-flash.v1`, no retry, stop on
401/402/403/ambiguous dispatch/missing attachment). Four bounded attempts
were made — the initial attempt plus the three permitted repair rounds —
each with exactly **1** physical Provider call, **0** automatic retries,
reported model `deepseek-flash`, HTTP 2xx transport. All four failed the
strategist's strict public output contract on the host side:

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

Under the three-round convergence rule no fifth paid attempt was made. The
final Keychain attachment was detached and the parent-side credential bytes
verified zeroed in every attempt; no raw credential entered the prompt, the
repository, the command line, stdout/stderr, the reports or logs.

**Open High finding (blocks live acceptance):** the live model's structured
output does not converge on the strategist's exact public envelope within
three repair rounds. This is the same host-side structured-output transport
class as Ticket 23's terminal tool-JSON blocker. The deterministic
mocked-Provider gate proves the strategist, contracts, laboratory and Rules
binding end-to-end; what remains is either a stricter response contract
(grammar-constrained/native tool-call output through the existing
grammar-only normalizer path) or schema-alias admission in the live port —
both are follow-up scope requiring new authorization, not silent retries.

**Consequence:** no live-generated `RosterPlan` artifact exists; the
preset-roster comparison with `planStatus=no_pregame_plan` is implemented in
the runner but has no passing live counterpart. Live acceptance per the task
brief is **not** met; integration review should treat this as the single
blocking finding for `269.3+270.3`.

## Accounting

- Deterministic gate: 0 Provider calls, ¥0.
- Live attempts: 4 Provider calls total (1 per attempt), all DeepSeek
  `deepseek-flash`, HTTP 2xx, physical attempts 1, automatic retries 0.
  Retained usage: round 3 — 16,561 in / 1,372 out / 17,933 total units,
  9,742 ms; round 4 — 17,612 total units. Rounds 1–2 usage not retained
  (report-format gap above). Estimated cost of the two retained calls at the
  current DeepSeek snapshot: well under ¥0.05 each; no ¥100 threshold crossed.
- No source refresh, no Room mutation (mutation-zero proof in both the gate
  and the live runner), no Skill generation/promotion, no training truth.

## Remaining honest gaps (nonblocking)

- The strategist runtime validates the structure, provenance and Rules
  legality of a plan; it cannot judge the strategic quality of public prose.
- Scenario branches are advisory hypothetical geometry (or Rules-legal
  lifecycle transitions on clones); hypothetical placements claim no Rules
  legality.
- The laboratory reports opponent return fire as unknown by contract; it is
  never promoted to zero.
- Live runner repair-round reports share one report path; only the latest
  failure report survives unless explicitly preserved (rounds 3–4 preserved
  under `repair-round-*.json`).
