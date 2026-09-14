# Ticket 22 / Slice 212 — verification, risk, debt and gate matrix

Date: 2026-09-14  
Status: complete

## Evidence policy

This matrix consumes existing immutable reports. It does not rerun previously
green suites. A report supports only its declared denominator. Only
Critical/High findings block the exact integration scope; Medium findings are
tracked and do not stop unrelated development.

## Primary verification matrix

| Capability | Primary evidence | Result | Claim boundary |
| --- | --- | --- | --- |
| Rules/Referee | `build/ticket-11-closure-v1/report.json` | complete, 12/12 acceptance; 912/912 actionable atoms, 80 executor contracts, 114 display-only | atomic catalogue and bounded executors; not every roster/map interaction |
| Source/translation | `build/ticket-12-closure-v1/report.json` | complete | frozen official-source workflow; translations are display-only |
| CharacterPackage | `build/ticket-13-closure-v1/report.json` | complete | rights-gated Kerrigan default plus configurable package contract |
| Shared client/build | `build/ticket-14-closure-v1/report.json` | Web/build complete; device deferred | Ticket 14 remains 15/16 |
| Native artifact | `build/ticket-14-slice-142-native-v1/android-build-receipt.json` and APK | built; SHA-256 `7d2b2a71b28d1bdd860ec12f50d5818d7a7adb01262d8d1515c043f9036c2fd1` | internal preview only; real device not accepted |
| Online role Agents | `build/ticket-15-closure-v1/report.json` | complete, browser role/failure/recovery evidence | strategy quality outside exact scenarios not implied |
| Secure BYOK/Provider | `build/ticket-16-slice-162-live-provider-closure-v1/report.json` | passed one authorized live call | not a production availability/performance SLA |
| DSH generation | Ticket 17 Slice 163–171 reports and closure docs | complete | offline only; no online DSH dependency |
| Foundational Skills | `build/ticket-18-final-release-conformance-v1/report.json` plus `content/strategy-skills/ticket-18-foundational-v1/` | passed | accepted immutable strategy inputs; full Skill catalogue not asserted |
| Current-rules terminal match | `build/ticket-18-current-rules-complete-match-v1/report.json` | passed bounded match | fixture-scoped rather than arbitrary roster coverage |
| Postgame evolution | `build/ticket-18-real-match-skill-evolution-v1/report.json` | passed | candidate/evaluation/promotion path; no automatic overwrite |
| MuZero trajectory | `build/ticket-19-slice-201-actual-terminal-trajectory-v1/report.json` | passed, 80 steps | no learner training; eligibility remains false |
| A–A complete match | `build/ticket-20-agent-agent-complete-match-v1/report.json` | passed 1/1, 80 applied actions, replay per action | deterministic Skill-guided fixture; strategy strength and arbitrary army false |
| Product Web journey | `docs/ticket-21-post-closure-product-browser-acceptance-2026-09-14.md` and `build/ticket-20-product-web-user-journey-v1/final.png` | passed | local same-origin product path; not public production |
| Production operations | Ticket 21 Slice 202–209 reports | passed focused contracts | local/controlled ready; external production evidence still absent |

## Blocking production and release gates

These are High for the named production scope, but they do not block local demo,
controlled experiments, Ticket 22 synthesis, or unrelated development.

| Gate code | Blocks | Closure evidence required |
| --- | --- | --- |
| `EXTERNAL_KMS_NOT_CONFIGURED` | production Web/App signing/encryption | approved KMS Adapter, real key references, rotation and recovery receipt |
| `REAL_POSTGRES_MULTI_INSTANCE_NOT_CONFIGURED` | multi-instance production room/job durability | real PostgreSQL schema, two-instance CAS/fence and restart receipt |
| `PRODUCTION_PRIVACY_ADAPTER_NOT_CONFIGURED` | production personal-data retention/deletion | deployed delete/pseudonymize/legal-hold Adapter and audit receipt |
| `PRODUCTION_TELEMETRY_SINK_NOT_CONFIGURED` | production SLO/cost/incident observability | durable low-cardinality sink and alerting receipt |
| `REAL_ROLLBACK_DRILL_MISSING` | production release readiness | exact prior release activation, induced failure and real rollback drill |
| `APP_STORE_RELEASE_NOT_ALLOWED` | public native release | rights/release approvals plus physical-device acceptance |
| `PHYSICAL_DEVICE_ACCEPTANCE_MISSING` | Ticket 14 completion and production App | install, cold start, API binding, background/reconnect, room action and replay on a real device |
| `INDEPENDENT_TRAINING_APPROVAL_MISSING` | training-eligible dataset/run | separate reviewer approval of exact trajectory/dataset version |

## Medium non-blocking debt

| Debt | Current evidence | Required future increment |
| --- | --- | --- |
| Arbitrary-roster, arbitrary-map complete match is not proven | Ticket 18/20 fixtures declare `arbitraryArmyBuilderMatchProven=false` | add explicit scenario/roster denominators and terminal matches without compatibility fallback |
| General tactical strength is not proven | A–A report declares `strategyStrengthProven=false`; Provider calls are zero in that fixture | preregister matchup/player-strength comparisons with live model arms and held-out evaluation |
| Spatial/multimodal planning is bounded | traces bind position, threat, plan and intent, but current fixture is simple | add richer terrain, collision, card/token, one-to-many/many-to-one and visual-observation cases |
| Foundational Skill set is intentionally small | accepted general/faction/directional set exists | generate only demand-driven faction/matchup Skills, then evaluate and promote independently |
| Public classic media rights are incomplete | public fallback policy exists; original media is development-internal | acquire rights or ship Project D-original assets/audio |
| Git delivery is not yet a clean commit | nested repo HEAD is `5177c3eca505d5ab2c26208c8a78492a6e70c4f5`; worktree has accumulated changes | use the Slice 214 sealed delivery-tree hash now; later create reviewed commits/push without hiding dirty state |
| Static development server reports HMR WebSocket 404 | browser product errors are zero; only `/hot` and `/message` development noise | use the production host/cache configuration for public deployment evidence |

## Intentional exclusions, not defects

- No MuZero learner is trained in this project phase.
- No Skill candidate is automatically promoted from one match or reflection.
- No user API key, prompt body, raw model response, seat token or private journal
  is placed in a delivery manifest.
- No source refresh runs during the frozen development tranche without an
  explicit command.
- No current Rules version silently executes a historical room whose exact
  dependency is missing.

## Current readiness decision

| Scope | Ready | Reason |
| --- | --- | --- |
| Local demo | yes | all repository-local dependencies and bounded browser path exist |
| Controlled experiment | yes | versioned cells, budgets, recovery, evidence and non-promotion policy exist |
| Production Web | no | external KMS/PostgreSQL/privacy/telemetry/rollback evidence is absent |
| Production App | no | production gates plus physical-device acceptance remain absent |
| Training-eligible run | no | independent approval of an exact player-view trajectory is absent |

This matrix has no new unresolved Critical finding. High findings are the eight
scope-specific external gates above; all other listed debt is Medium and tracked.
