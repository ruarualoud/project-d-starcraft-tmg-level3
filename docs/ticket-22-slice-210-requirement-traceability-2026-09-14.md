# Ticket 22 / Slice 210 — requirement traceability

Date: 2026-09-14  
Status: complete  
Source refresh performed: no

## Product outcome trace

| Original outcome | Status | Implementation/evidence | Exact boundary |
| --- | --- | --- | --- |
| Shared Web/App product | `implemented_verified` for shared contract; App device is `external_gate` | `apps/starcraft-tmg-expo/`, `packages/client-domain/`, ADR 0002, `build/ticket-14-closure-v1/report.json`, `build/ticket-20-product-web-user-journey-v1/final.png` | Web user journey passed; APK is built, but no physical-device receipt exists. |
| Authoritative tabletop referee | `implemented_verified` for the official atomic denominator | `packages/authoritative-engine/`, `packages/rule-atoms/`, `packages/room-runtime/`, `build/ticket-11-closure-v1/report.json` | 912/912 actionable RuleAtoms, 80 executor contracts and 114 retained display-only atoms; broader composition coverage is not implied. |
| Official source plus machine translation | `implemented_verified` for the frozen source/review workflow | `packages/source-data/`, `packages/localization/`, `build/ticket-12-closure-v1/report.json` | Development uses the one-time frozen Command Center `U71/C69/R48` plus FAQ V1 source chain. No automatic refresh occurred. Translation remains a display sidecar. |
| Kerrigan Adjutant and configurable role Agents | `implemented_verified` | `packages/character-agent/`, `packages/online-agent-session/`, Ticket 13/15 closure reports | Kerrigan is the default example CharacterPackage; modes and packages are versioned. Restricted source media cannot be published without rights. |
| Secure direct Provider and BYOK | `implemented_verified` for the controlled path | `packages/secure-provider-runtime/`, Ticket 16 live closure | BYOK is session-memory-only and isolated. One authorized live Provider acceptance exists; it is not a blanket production SLA. |
| DSH-backed offline Skill production | `implemented_verified` for the generation pipeline and foundational pack | `packages/skill-generation*`, `packages/skill-production*`, `packages/structured-generation/`, Ticket 17/18 evidence | DSH is confined to offline Skill generation. Five foundational Skills are accepted; full catalogue strategy strength is not proven. |
| Human–Agent and Agent–Agent play | `implemented_bounded` | Ticket 15 browser evidence; Ticket 20 product/browser and A–A evidence | Real H–A UI path and a 1/1 bounded five-round A–A cell exist. Arbitrary roster, map and matchup E2E are not proven. |
| Spatial reasoning, plan and memory | `implemented_bounded` | `packages/online-agent-session/`, Ticket 20 Slices 189–193, A–A traces | Every bounded A–A action binds spatial observation/action-space, continuity context, plan and intent. General multimodal/table-wide tactical strength is not proven. |
| Postgame reflection and Skill evolution | `implemented_verified` for controlled candidates | Ticket 18 evolution reports and Ticket 20 four-episode UI evidence | Candidates remain isolated until evaluation/promotion. No result silently overwrites an accepted Skill. |
| MuZero-compatible training output | `implemented_verified` for export; eligibility is `external_gate` | `packages/training-data/`, Ticket 19 reports | One actual 80-step terminal trajectory round-trips through NDJSON/MuZero/RLDS. No learner was trained; approval remains independent. |
| Production operations | `implemented_verified` as a control-plane contract; real deployment is `external_gate` | `packages/platform-operations/`, Ticket 21 reports | Local demo and controlled experiment ready; KMS, real multi-instance PostgreSQL, privacy/telemetry adapters and rollback drill remain external. |

## Standard template final-condition trace

| # | Level-3 final condition | Status | Evidence | Remaining truth |
| --- | --- | --- | --- | --- |
| 1 | Official rules execute through deterministic atomic actions | `implemented_verified` for the atomic denominator; integrated match remains `implemented_bounded` | Ticket 11 closure; Ticket 18 current-rules match | Catalogue closure does not prove every arbitrary roster/map combination. |
| 2 | H–H, H–A and A–A share one referee and remain permission-isolated | `implemented_verified` for shared authority; full product match range `implemented_bounded` | ADR 0001/0002; Ticket 14/15/20 evidence | A–A closure uses one declared fixture; H–H requires no Provider but no separate broad tournament corpus is claimed. |
| 3 | Actions, RNG, Prompt, Skill, model and recovery are auditable | `implemented_verified` | authoritative receipt/replay, Ticket 15 traces, Ticket 16 attempt store, Ticket 18/20 manifests | External production telemetry storage is still a gate. |
| 4 | Initial Skills, retrieval, postgame candidates and promotion experiments form a loop | `implemented_verified` for the five-Skill controlled loop | Ticket 18 Slices 172–182 | Full catalogue generation and universal playing strength are not claimed. |
| 5 | Harness outcome, cost and failures are version-comparable and rollback-capable | `implemented_verified` in controlled operations | Ticket 20 experiment cells; Ticket 21 release/telemetry/incident reports | A real production rollback drill remains external. |
| 6 | Matches become player-view trajectories with independent eligibility | `implemented_verified`; eligibility `external_gate` | Ticket 19 80-step terminal trajectory | `trainingTruth=false` until a distinct reviewer approves an exact trajectory. |
| 7 | Web/App/background/deployment are reproducible | Web/background `implemented_verified`; App device and production deployment `external_gate` | Ticket 14 Web/build closure, Ticket 20 browser journey, Ticket 21 readiness | Physical device, external KMS/PostgreSQL/adapters and public cold-cache/service proof remain open. |
| 8 | Updates preserve replay, Skill source and experiment attribution | `implemented_verified` by frozen identities and explicit adapters | MatchBinding, historical rules display, source locks, Skill refs, Ticket 21 release manifest | A future source refresh must create a new version; it must not mutate existing rooms or Skills. |

## Ticket-level completion trace

| Ticket range | Delivered capability | Current status |
| --- | --- | --- |
| 1–10 | workspace, source/baseline inventories, authority design and first tracer bullets | complete inputs retained by later closures |
| 11 | official RuleAtom catalogue, executors, LegalSpace, Preview/Apply/Replay | complete |
| 12 | official source, provenance, translation and review workflow | complete |
| 13 | Kerrigan CharacterPackage, eras, worldbook, portraits and rights fallback | complete |
| 14 | shared Expo Web/App and Battle Lab client/workbench | 15/16; device acceptance open |
| 15 | online Tutor/Opponent/Commentator/Companion sessions | complete |
| 16 | secure BYOK and direct Provider execution | complete |
| 17 | DSH offline generation arm and correction/control path | complete |
| 18 | five foundational strategy Skills and evolution loop | complete |
| 19 | player-view trajectory and MuZero/RLDS export | complete |
| 20 | H–A/A–A orchestration, spatial plan/memory and product browser journey | complete, bounded claims retained |
| 21 | production control-plane contracts and readiness classification | complete, external gates retained |
| 22 | final synthesis and handoff | 1/5 after this Slice |

## Acceptance conclusion

The original architecture and development outcomes are represented by working
modules and focused evidence. The repository supports a complete bounded
StarCraft TMG product journey and the intended offline/online learning seams.
It is not yet truthful to claim production Web/App deployment, physical-device
acceptance, independently approved training data, arbitrary-roster complete
match coverage, or universally strong strategy play.
