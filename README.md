# StarCraft TMG Level-3

This is the fixed development root for the shared Web/App StarCraft TMG battle and Kerrigan Adjutant platform.

New authority, room, Agent, data, Skill, learning, client, verifier, and evidence work belongs here. Repository-root StarCraft code is currently a read-only legacy Adapter; no integration becomes authoritative without an explicit gate and parity evidence.

Current tracer bullet:

```text
legacy normalized state (read-only input)
  -> authoritative-engine
  -> authenticated room runtime
  -> Level-3 HTTP Adapter
  -> isolated Kerrigan Tutor/Opponent/Commentator/Companion sessions
  -> shared Expo Web/App and Battle Lab clients
  -> secure direct-Provider worker and durable attempt store
```

The Expo product baseline is now recovered as a read-only checkout at `imports/sc-tmg-app/`, locked to `ruarualoud/sc-tmg-app` `codex/starcraft-classic-army-builder@f07b3cb78ce6bf119bdc529cde41dbe91e00a61d`. Its five-tab mobile/Web shell is the product UX baseline, while the Battle Lab remains the developer/referee/Agent-observability surface. The retained fix15 APK contains a richer Battle/AI/room delta that is absent from both remote source branches; it is parity evidence, not editable or authoritative source. See the [Ticket 10 parity inventory](docs/ticket-10-expo-baseline-parity-inventory-2026-08-24.md).

The character-Agent stack includes a rights-gated Primal Queen CharacterPackage, a nine-entry provenance-bearing Kerrigan era/context catalogue, a spoiler/knowledge-cutoff selector, bounded worldbook activation receipts, a Project D-original fallback, Character Card V2 JSON/PNG import/export, per-mode RoleSkillPacks and prompt-assembly receipts. Tutor/Opponent/Commentator/Companion are mounted through the shared Expo Web/Battle Lab client boundary. Secure BYOK uses a detached credential/egress worker plus durable SQLite attempt accounting; one separately authorized direct-Provider acceptance call is sealed as Ticket 16 evidence. Public release still falls back when character-asset rights are incomplete, and native-device acceptance remains deferred rather than waived.

The source/translation slice now includes an eight-source registry, immutable raw-snapshot receipts, a normalized-dataset lineage manifest, a read-only Adapter for the legacy data pack, a provisional zh-CN glossary, and display-only translation sidecars. One deep source/localization runtime plus a transport-neutral HTTP Adapter lets Web/App read the same provenance, request administrator-gated machine drafts, and publish authenticated human reviews without reimplementing authority rules. Product Firestore records remain unreviewed official-data candidates; community records and Project D-derived presets remain separate. Machine translations cannot target numeric/rules fields, never overwrite canonical data, and fall back to canonical text when stale. Live official-source recovery, rights review, real provider integration, persistent review storage, and UI evidence remain open.

The historical offline Skill scaffold defines sealed job/candidate/run-receipt shapes and two injected fake execution arms. Ticket 17 has a fixed nine-Slice delivery plan for a pinned DSH arm and a DSH-off direct-Provider control. Slices 163–169 freeze current official source/FAQ/Rules identities, the audited DSH package, MTL Teach/Ctx2Skill lineage, 83 source + 1,163 RuleAtom evidence rows, a registry-driven 1,215-task/1,220-node curriculum, a nine-node Teach/Ctx2Skill correction graph, and a disposable OS runner that behaviorally denies repository/host reads, outside writes, process creation and direct network. Exact DSH `0.1.1-rc.2` is installed with ignored lifecycle scripts; its 35,962-entry runtime, restricted profile, plugin lock and real append-only Session lifecycle are hash-frozen. Both arms share one Ticket 16-grade credential-free Provider broker, arm-neutral prompt compiler and pre-egress ¥100-tier cost guard. The DSH-off executor and the real DSH executor now record independently reconstructable seven-role usage/cost receipts with one physical attempt per role and zero retry; DSH additionally records seven redacted role Sessions plus one exactly-once candidate-tool Session. No Skill is promoted or loaded at runtime, and full-catalogue production still requires separate user confirmation.

All runtimes deliberately report `process_memory_v0`, `productionReady: false`, and `trainingTruth: false`.

Key references:

- [Implementation plan](docs/implementation-plan-2026-08-24.md)
- [Expo baseline parity inventory](docs/ticket-10-expo-baseline-parity-inventory-2026-08-24.md)
- [Wayfinder map](../.scratch/starcraft-tmg-level3-platform/map.md)
- [Kerrigan primary-source research](../docs/starcraft-kerrigan-adjutant-primary-source-research-2026-08-24.md)
- [DeepSeek Harness research](../docs/deepseek-harness-skill-generation-primary-research-2026-08-24.md)
- [Ticket 17 DSH roadmap](docs/ticket-17-slices-163-171-dsh-skill-generation-roadmap-2026-09-04.md)
- [Ticket 17 Slice 163 boundary](docs/ticket-17-slice-163-dsh-boundary-source-denominator-2026-09-04.md)
- [Ticket 17 Slice 164 evidence/curriculum](docs/ticket-17-slice-164-current-official-skill-evidence-curriculum-2026-09-04.md)
- [Ticket 17 Slice 165 Teach/Ctx2Skill graph](docs/ticket-17-slice-165-teach-ctx2skill-role-graph-2026-09-04.md)
- [Ticket 17 Slice 166 disposable OS isolation](docs/ticket-17-slice-166-disposable-os-isolation-2026-09-04.md)
- [Ticket 17 Slice 167 pinned DSH runtime/Session](docs/ticket-17-slice-167-pinned-dsh-runtime-session-2026-09-04.md)
- [Ticket 17 Slice 168 Provider broker/control](docs/ticket-17-slice-168-skill-provider-broker-control-2026-09-04.md)
- [Ticket 17 Slice 169 DSH executor](docs/ticket-17-slice-169-dsh-executor-2026-09-04.md)
- [Source registry](content/source-registry-v1.mjs)
- [Translation sidecar contract](packages/localization/translation-sidecar-v1.mjs)
- [Source/localization runtime](packages/localization/source-localization-runtime-v1.mjs)
- [Direct Provider Adapter](packages/character-agent/openai-compatible-provider-v1.mjs)
- [Offline Skill generation contracts](packages/skill-generation/contracts-v1.mjs)
