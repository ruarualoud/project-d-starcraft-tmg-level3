# Ticket 18 — five usable Skills and stable offline evolution

2026-09-09 deferred user questions: after the foundational five-Skill production closes, review console-triggered/multi-game reflection, paused hypothetical search with plan revision, incremental refresh after source/rule changes, and mathematical/spatial MCP plus multimodal battle planning. See [the recorded questions](post-foundation-skill-design-questions-2026-09-09.md). This records future design work only; it does not add an S174 launch gate, refresh sources, or claim implementation.

User scope: generate one overall-rules Skill, two faction Skills and both
directed matchups; fix shared production failures and prove postgame reflection
and versioned upgrades. This plan expands the existing Ticket 18, not the
22-Ticket project denominator. No Codex subagents or official-source refresh.

Selection: Terran Armed Forces and Zerg Swarm, the two generic official
archetypes. Do not conflate these with all Terran/Zerg subfactions. All generated
strategy is conditional advisory material, never Rules or training truth.

2026-09-11 scope clarification: the post-matchup comparison is not a combined
Terran/Zerg Skill. `Terran Armed Forces` and `Zerg Swarm` each cover only one of
the two currently frozen Faction cards for its Race. After the five foundational
Skills, produce an independent Protoss `Daelaam` Skill. Separately choose exactly
one existing Race and produce its second Faction Skill: either Terran
`Raynor's Raiders` beside `Terran Armed Forces`, or Zerg `Kerrigan's Swarm`
beside `Zerg Swarm`. That choice is not fixed yet; Zerg remains the current
recommendation only. The comparison is between the two independent Faction
Skills under the selected Race. Directed Terran→Zerg and Zerg→Terran matchup
Skills remain separate artifacts.

Current checkpoint (2026-09-11): Slices 172–176 complete; 177–179 pending.
The formal offline foundational pack is `5/5`; all five exact versions are now
runtime-accepted in the isolated online registry after both directed routes
passed candidate and accepted Room Preview→human confirmation→Apply→Replay.
This proves routing and authority flow with an injected deterministic Provider,
not model strength or full-game strategy effectiveness. Ticket 18 is `5/8`
complete with three slices remaining. See the
[directed matchup closure](ticket-18-slice-175-directed-matchup-skill-closure-2026-09-11.md)
and [online arena closure](ticket-18-slice-176-online-strategy-arena-2026-09-11.md).

2026-09-07 follow-up: six preexecution engineering repairs now cover current
frozen-data movement, explicit corrected FAQ routing, resource-aware cases,
shared structured strategy/reflection roles, first-execution prompt lineage
and a zero-paid aggregate preflight. See the
[preexecution repair report](ticket-18-slice-174-preexecution-repair-2026-09-07.md).
These changes do not close174 or grant source/strategy/runtime acceptance.

2026-09-07 clarification: Slice173 qualified the rules-reference dependency,
not a complete strategy guide. User-prioritized repair in Slice174 adds a shared
conditional strategy contract, a host-authored general strategy seed and a
Strategy Case Compiler. Initial 16 component checks / 3 synthetic cases / 6
applied-and-replayed branches pass, but source review, strategy coverage and
paid workflow integration remain open. Full frozen FAQ is already in both
faction production inputs (68/68); the selected pre-FAQ action fixture does not
prove current FAQ Room integration. See
[strategy/compiler checkpoint](ticket-18-slice-174-general-strategy-case-compiler-2026-09-07.md).

2026-09-07 final general-Skill follow-up: the seven-axis initial strategy layer
has now passed 77/77 source-field reviews and 17/17 rules-executed decision
results (10 development,7 held-out). A fresh process recompiled and replayed
all11 frozen cases with identical rules/state/decision semantics. The canonical
offline Skill is `starcraft-tmg.general-rules-and-strategy`, hash
`e06b28c385c12d278d5e3d6ff2a777ef8d20cd520ea8e27e4449afa26218b10b`
(`1.0.1-offline-replay-passed`). The generated `1.0.0` parent remains frozen;
the new version changes only one stale development-case evidence sentence,
uses no Provider call and regrades all17 decisions without changing their
semantics.
It is an accepted dependency for the remaining faction/matchup production,
not a Room-published Skill or complete-game effectiveness claim. See the
[final general-Skill report](ticket-18-slice-174-final-general-rules-strategy-skill-2026-09-07.md).

Ticket18 **2/8 complete,6 remaining**; project16/22. Overall offline production
dependency and formal offline first-five acceptance are now1/5; runtime
acceptance remains0/5. The Slice173 rules reference passed22/22 source controls,
105/105 development and30/30 repeated independent inputs; the new general
strategy layer adds the seven conditional decision axes and small-case proof.
Slice174 stays active until both faction Skills are complete. Frozen official
sources have not been refreshed.

| Slice | Deliverable | Acceptance |
| --- | --- | --- |
| 172 | Complete frozen-source reading plan, reusable bounded role/revision jobs | Every eligible core/FAQ span assigned exactly once; excluded placeholders visible; omissions, fabricated citations, drift and empty repairs rejected |
| 173 | Overall-rules generation, evidence-driven v3 repair and evaluation | Full declared source context; persistent typed issues/local repair; independent semantic review; old failures become development regressions, new held-out cases frozen before generation; real model results retained |
| 174 | Terran Armed Forces and Zerg Swarm Skills | Bind accepted overall-rules dependency and exact official faction/unit/card data; distinguish eligibility from strategic recommendations |
| 175 | Terran→Zerg and Zerg→Terran | Bind both faction packages; conditional plans/counters, supported scenario and actual legal-action choices; never promise wins |
| 176 | Isolated arena, version registry and online loader | Actual room preview/confirmation-policy/apply/replay; authentic evaluation receipts; candidate/accepted separation; exact dependency routing, CAS, rollback |
| 177 | Postgame review→reflection→SkillOpt candidate | Reconstruct real traces, use pre-action information for choices and actual outcomes for review; bounded local revisions, failure resume, no hindsight leakage |
| 178 | Upgrade regression and replay acceptance | Old failures + independently held-out tests + arena comparison; bad candidate quarantined, good version retained as promotable with rollback; no silent live upgrade |
| 179 | Scheduler/store conformance and aggregate | SQLite M1/PostgreSQL Adapter contract, durable leases/budgets/attempts, recovery and predecessor regression; exact remaining production gates |

Completion is separately reported as Ticket slices, generated candidates,
evaluation-passed Skills, and runtime-accepted Skills. Merely creating five
files does not complete this request. A source-coverage receipt does not prove
every source sentence was correctly understood. Kernel drills do not prove
whole-game strategy effectiveness. Authenticated administrator publication
remains separate from automated evaluation; developer authorization is not
mislabelled as a human's substantive review of unseen output.

Ticket 20 retains full human-agent/agent-agent season orchestration, opponent
pools and self-play experiment operations. Its minimum postgame/SkillOpt
primitives are pulled forward into 177–178 so the first five have an upgrade
path before broader gameplay work.

## 2026-09-08 user requirement: spatially competent tabletop agents

Read-only integration finding (while faction production is running):
`packages/client-domain/battle-workbench-threat-v1.mjs` already exports
one-to-many/many-to-one relations, nominal move/fire/charge circles and
friendly/enemy overlays, but deliberately labels them `coverage=partial`.
Its maximum-base-dimension radius and nominal reach omit target-specific LOS,
terrain, legal paths, elevation and declared modifiers. They are UI previews,
not an exact spatial oracle for a battle agent. The future harness must keep
that distinction visible and cannot turn a displayed circle into a legal-shot
or safe-position claim. Reuse the actual footprint/edge-distance operations
in `packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs`
(`createOfficialModelBaseFootprintV1`, `evaluateOfficialBaseMeasurementV1`,
`evaluateOfficialWithinWhollyWithinV1`) with the current rule-bound state;
then query action-specific Preview/Apply for movement, firing and blocking.
This is a confirmed integration gap, not a newly completed spatial case or
permission to change the frozen rules during Skill production.

Finish the first-five Skills first, then continue harness implementation. Human
versus agent and agent self-play must demonstrate correct spatial reasoning;
textual claims that a Skill "understands positioning" do not satisfy acceptance.
This adds concrete acceptance to176/177/178 and Ticket20, not new completed
Slices or an unbounded production-Skill count. The implementation is pending.

The Rules-derived observation/query seam must expose current world-space
positions, physical footprints and per-model formation geometry, edge-to-edge
distance, legal full-path movement, intervening terrain/units, relevant sight
and targeting constraints, and current objective relationships. Physical base
size must not be conflated with a similarly named rule keyword. UI pan/zoom,
screen pixels and world units are separate transforms. Hidden opponent
information stays outside the agent's player-view observation.

Threat analysis must be action/weapon/resource/timing specific: stationary
shooting, move-then-attack when legal, charge, different weapons and card/ability
modifiers. Include one-to-many/many-to-one and friendly/enemy overlays, narrow
lanes and mutual support; a single radius is not an exact tactical model.
Evaluate an actual legal destination/path and resulting formation, not merely
whether a unit centre falls inside a circle. Unsupported calculations must be
reported as unknown, never silently approximated as exact legal reachability.

The agent compares Rules Preview-backed alternatives for screening, blocking,
occupying or escaping a threat boundary, concentration of fire, mutual support
and entering/exchanging fire zones. Explanations must state the affected units,
actions, resources, retaliation windows and scenario/score consequences. A
legal move is not automatically a good move; dice probabilities and heuristic
preferences remain separate from exact transitions and source facts.

Planned minimum before spatial acceptance: six families with two development
and two frozen held-out cases each (24 cases, NOT yet built):

| Family | Required behavioural difference |
| --- | --- |
| Footprints and formation | Centre-valid/edge-invalid placement, formation expansion and path clearance are distinguished |
| Blocking and screening | Narrow passage, interposed unit and escape route change the selected reachable position |
| Threat boundaries | Stationary/moving/charge/weapon/card conditions change safe and exposed destinations |
| Concentration and support | One-to-many/many-to-one and friendly coverage change target/position choices |
| Fire-zone exchange | Small position changes alter retaliation and resource/unit trade-offs, not merely distance prose |
| Objective tempo | Position changes control/reinforcement/score timing and can outweigh damage preference |

Each case freezes the rule/source/state binding, legal candidates, observable
pre-action information and objective criteria. Include actual Apply/Replay,
small positional counterfactuals, map-rotation/translation where applicable and
UI zoom/pan invariance. Recompute after state changes and reject stale queries.
Do not relabel the current four first-actor drills as coverage of these six
families.176 proves the minimum connected arena, Ticket20 adds actual human-agent
and self-play series;177/178 trace spatial mistakes through review and a
versioned Skill candidate, preserving negative cases and rollback. MuZero
exports use authoritative state/action/reward and legal-action masks; model
spatial explanations and strategy preferences are not training truth labels.

Cost baseline before these changes: known lower bound 4,556,327 tokens;
known-usage estimate ¥7.535144; historical unknown-call reserve ¥28.961350;
combined estimate/reserve ¥36.496494, not an invoice. Continue the existing
SQLite provider ledger, notify before each ¥100 cumulative tier, and stop all
development on exhausted API balance. Never use a chat-pasted credential.

At plan creation: Ticket17 8/9 (171 in progress); Ticket18 0/8;
first-five evaluation/runtime acceptance 0/5; project15/22 complete.
