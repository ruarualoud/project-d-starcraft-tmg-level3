# StarCraft TMG Level-3

This is the fixed development root for the shared Web/App StarCraft TMG battle and Kerrigan Adjutant platform.

New authority, room, Agent, data, Skill, learning, client, verifier, and evidence work belongs here. Repository-root StarCraft code is currently a read-only legacy Adapter; no integration becomes authoritative without an explicit gate and parity evidence.

Current tracer bullet:

```text
legacy normalized state (read-only input)
  -> authoritative-engine
  -> in-memory room runtime
  -> Level-3 HTTP Adapter
  -> isolated Kerrigan Tutor/Opponent/Commentator/Companion sessions
  -> future Expo Web/App and Battle Lab clients
```

The Expo product baseline is now recovered as a read-only checkout at `imports/sc-tmg-app/`, locked to `ruarualoud/sc-tmg-app` `codex/starcraft-classic-army-builder@f07b3cb78ce6bf119bdc529cde41dbe91e00a61d`. Its five-tab mobile/Web shell is the product UX baseline, while the Battle Lab remains the developer/referee/Agent-observability surface. The retained fix15 APK contains a richer Battle/AI/room delta that is absent from both remote source branches; it is parity evidence, not editable or authoritative source. See the [Ticket 10 parity inventory](docs/ticket-10-expo-baseline-parity-inventory-2026-08-24.md).

The character-Agent slice includes a rights-gated Primal Queen CharacterPackage, a nine-entry provenance-bearing Kerrigan era/context catalogue, a spoiler/knowledge-cutoff selector, bounded worldbook activation receipts, a Project D-original fallback, Character Card V2 JSON import/export, per-mode RoleSkillPacks, prompt-assembly receipts, an OpenAI-compatible direct-Provider Adapter, and session-memory-only BYOK. The Adapter enforces remote HTTPS, configured models, bounded JSON, full-body timeouts, zero internal retry, safe failure classes, and receipt-to-output/profile binding in the Harness trace. PNG card embedding remains unsupported. It currently has only injected-fetch verifiers; no live Provider or UI evidence exists yet.

The source/translation slice now includes an eight-source registry, immutable raw-snapshot receipts, a normalized-dataset lineage manifest, a read-only Adapter for the legacy data pack, a provisional zh-CN glossary, and display-only translation sidecars. One deep source/localization runtime plus a transport-neutral HTTP Adapter lets Web/App read the same provenance, request administrator-gated machine drafts, and publish authenticated human reviews without reimplementing authority rules. Product Firestore records remain unreviewed official-data candidates; community records and Project D-derived presets remain separate. Machine translations cannot target numeric/rules fields, never overwrite canonical data, and fall back to canonical text when stale. Live official-source recovery, rights review, real provider integration, persistent review storage, and UI evidence remain open.

The offline Skill slice now defines one sealed job/candidate/run-receipt interface with two replaceable execution Adapters: pinned DSH and a DSH-off direct-Provider control. Both receive the same staged input/model/tool/budget contract, expose only read-only evidence plus exactly one `emit_candidate_skill`, retain usage/session-log lineage, and can produce only unreviewed candidates with Judge tests and explicit promotion blockers. DSH is not installed or executed by this slice; no Skill is promoted or loaded at runtime.

All runtimes deliberately report `process_memory_v0`, `productionReady: false`, and `trainingTruth: false`.

Key references:

- [Implementation plan](docs/implementation-plan-2026-08-24.md)
- [Expo baseline parity inventory](docs/ticket-10-expo-baseline-parity-inventory-2026-08-24.md)
- [Wayfinder map](../.scratch/starcraft-tmg-level3-platform/map.md)
- [Kerrigan primary-source research](../docs/starcraft-kerrigan-adjutant-primary-source-research-2026-08-24.md)
- [DeepSeek Harness research](../docs/deepseek-harness-skill-generation-primary-research-2026-08-24.md)
- [Source registry](content/source-registry-v1.mjs)
- [Translation sidecar contract](packages/localization/translation-sidecar-v1.mjs)
- [Source/localization runtime](packages/localization/source-localization-runtime-v1.mjs)
- [Direct Provider Adapter](packages/character-agent/openai-compatible-provider-v1.mjs)
- [Offline Skill generation contracts](packages/skill-generation/contracts-v1.mjs)
