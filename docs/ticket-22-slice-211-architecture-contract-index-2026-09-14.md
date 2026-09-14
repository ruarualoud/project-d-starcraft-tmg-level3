# Ticket 22 / Slice 211 — architecture, ADR and contract index

Date: 2026-09-14  
Status: complete

## System map

```text
official sources ──> source/localdata + localization ──> frozen SourceBinding
                                                        │
rules atoms/executors ──> LegalSpace/transition ────────┤
                                                        v
Web/App ──> Client Domain ──> HTTP ──> Room Runtime/Store/Referee ──> journals/replay
   │                                  ^
   └─ floating Adjutant/Agent client ─┤ typed candidate only
                                      │
accepted Skills + memory + tools ─> online Agent session
                                      │
Provider/BYOK ─> isolated Gateway ────┘

room journals ─> postgame/evaluation ─> candidate Skill ─> promotion registry
      └────────> player-view trajectory ─> NDJSON/MuZero/RLDS ─> approval gate

release/RBAC/KMS/queue/privacy/telemetry/incident control the exact deployment,
but do not own rules, room truth, Skill truth or training truth.
```

## Deep-module ownership

| Plane / owner | Primary modules | Public responsibility | Must not own |
| --- | --- | --- | --- |
| Source | `packages/source-data`, `packages/localization` | immutable capture, precedence, normalization, diff/review, provenance and translation sidecars | state transitions, strategy, training labels |
| Rules | `packages/rule-atoms`, `packages/authoritative-engine` | complete LegalSpace, deterministic transition, geometry/chance and source lineage | user identity, UI state, Provider calls |
| Referee | `packages/room-runtime`, `packages/room-store`, `packages/http-adapter` | grants, revision/CAS, leases/fences, Preview/Apply, journals and Replay | inventing rules, strategy ranking |
| Client | `packages/client-domain`, `apps/starcraft-tmg-expo`, `apps/starcraft-tmg-battle-lab` | `bootstrap/read/dispatch/subscribe`, viewer-scoped projections, human confirmation and presentation | authoritative mutation, private-room cache, client RNG |
| Character | `packages/character-agent` | CharacterPackage/worldbook, era/context, rights and presentation | rule facts or room mutation |
| Online Agent | `packages/online-agent-session` | scoped observation/tools/memory/TurnPlan, typed action proposal, role isolation | direct Apply, cross-seat context, promotion |
| Provider | `packages/secure-provider-runtime` | ephemeral credential attachment, egress allowlist, attempts, budget and recovery | plaintext secret persistence, game authority |
| Skill production | `packages/skill-generation*`, `packages/skill-production*`, `packages/structured-generation` | Teach/Ctx2Skill DAG, structured recovery, candidates and generation receipts | online room authority or automatic publication |
| Skill runtime/evolution | `packages/strategy-skills`, `packages/skill-evaluation` | immutable accepted pack retrieval, postgame candidates, freshness, evaluation and promotion/rollback | changing historical play or source facts |
| Learning | `packages/training-data` | viewer-safe steps, rewards/discounts, action/recurrent lineage, export and eligibility review | future/private leakage or inferred policy labels |
| Operations | `packages/platform-operations` | environment/RBAC/KMS/job/release/privacy/telemetry/incident controls | semantic rule compatibility, automatic Skill/training approval |
| Product composition | `packages/product-composition` | compose existing deep modules for a bounded runnable product | duplicate authority implementations |

## Stable public seams

| Seam | Contract |
| --- | --- |
| Rules | `descriptor / enumerate / apply` through `OfficialExecutableRuleRuntime` |
| Authority | `createEnvelope -> legalSpace -> preview -> apply -> replay` |
| Client Domain | `bootstrap / read / dispatch / subscribe` |
| Room persistence | RoomStore atomic revision/CAS and append-only journal contract with SQLite and PostgreSQL Adapters |
| Online Agent | authenticated session lifecycle, viewer-scoped role context, decision preview and events |
| Provider | credential-free parent process plus isolated credential/egress worker and durable attempt outcome |
| Skill | version/hash/scope/source evidence, immutable accepted release, explicit candidate/promotion state |
| Training | player-view observation/action/reward/discount/chance/recurrent lineage plus separate eligibility |
| Operations | exact environment/release/scope decisions; default deny; external-adapter evidence is never inferred |

## Version and dependency policy

- `MatchBinding` freezes source, normalized data, rules catalogue/runtime,
  action schema, geometry, RNG and referee identities for one room.
- A content hash identifies exact bytes. A semantic version or named Adapter
  decides compatibility. Neither substitutes for the other.
- Historical rules and source material remain displayable under their frozen
  identity. Missing dependencies quarantine the affected replay; there is no
  latest-version fallback.
- Skill releases pin their source/rules evidence and reverse dependencies. An
  update marks only affected Skills stale and routes them through review.
- Experiments pin both seat Skills, Provider/model profiles, Harness, source,
  Rules, scenario, roster, map, RNG and budgets.
- Release records pin Web/native/Rules/data/action-space/Skill/source/schema/
  Provider/training-export versions and media rights.

## Decision index

| ADR | Decision |
| --- | --- |
| [0001](adr/0001-authoritative-transition-journal.md) | One authoritative transition and journal chain owns state change and replay. |
| [0002](adr/0002-expo-and-battle-lab-share-client-domain-module.md) | Expo and Battle Lab share one Client Domain Module; neither becomes a second authority. |
| [0003](adr/0003-five-authority-planes-and-version-compatibility.md) | Five planes remain separate; hashes prove lineage while versions/Adapters decide compatibility. |
| [0004](adr/0004-agent-skill-learning-and-operations-boundaries.md) | Agent proposal, Skill generation/evolution, training approval and operations remain distinct bounded authorities. |

## Dependency direction rules

1. Source may be consumed by Rules, clients and Skill evidence, but never imports
   them back.
2. Referee depends on a Rules port and RoomStore port; Rules never depends on
   HTTP, client or Provider code.
3. Client and Agent both consume viewer-scoped Referee projections. The Agent
   cannot use a wider client/private state object.
4. Learning consumes immutable journals and manifests, never live mutable room
   internals.
5. Operations wrap exact artifacts and scopes. Their readiness status cannot
   change a domain truth flag.

This ownership lets individual components be replaced behind versioned ports
without spreading credential, authority or compatibility logic across the UI.
