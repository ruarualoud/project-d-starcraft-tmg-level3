# ADR 0003: Five authority planes and explicit version compatibility

Date: 2026-09-14  
Status: accepted

## Context

The platform combines official source ingestion, deterministic rules, rooms,
Agents/Skills and training export. Content hashes are valuable lineage
identities, but treating every hash change as runtime compatibility would make
intentional maintenance and recovery fragile. Conversely, accepting a current
component wherever a historical dependency is absent would make replay and
training claims unverifiable.

## Decision

The platform has five non-interchangeable authority planes:

1. Source owns captured bytes, precedence, normalization and display-only
   translation.
2. Rules owns LegalSpace, deterministic effects, geometry, chance consumption
   and rule-source lineage.
3. Referee owns room revisions, capabilities, Preview/Apply, fencing, receipts,
   journal projection and replay.
4. Agent/Skill owns observations, prompts, tools, memories, plans, provider
   attempts, Skill retrieval and candidate promotion state. It may propose but
   cannot mutate authoritative game state directly.
5. Learning owns player-view steps, rewards, exports, split lineage and
   independent training eligibility. It cannot reinterpret historical play.

Content hashes identify exact artifacts and prove lineage/tamper resistance.
Compatibility is decided only by an explicit semantic version or named Adapter.
An old room resolves its frozen dependency set. A new source, Rules runtime,
Skill or Harness version creates a new binding; it never silently mutates an
existing room, replay or experiment.

Historical versions stay resolvable for replay and old-rules display. If an
exact dependency is missing, that historical scope is quarantined. It is not
silently forwarded to a current implementation.

Short-lived HMAC seals protect live Preview/control envelopes; Ed25519
signatures protect durable receipts and release records. These mechanisms do
not replace semantic versioning and are not required merely to start an
administrator-requested generation job.

## Consequences

- Web and App use projections and typed intents rather than owning source,
  Rules or room state.
- Provider/model output is untrusted until typed, sourced and policy-checked.
- Machine translation, CharacterPackage lore, memory and strategy advice cannot
  overwrite official facts.
- Source/data/rules updates can invalidate dependent Skills for review without
  forcing unrelated Skills to regenerate.
- Exact historical replay may become unavailable if an artifact is lost, but it
  fails visibly instead of producing a false replay.
- Production release manifests must pin versions, hashes, Adapters and rights;
  local fixtures cannot satisfy external operational evidence.

## Rejected alternatives

- One shared mutable application state: it conflates UI convenience with game
  authority and makes private views unsafe.
- Hash equality as the only compatibility rule: harmless rebuilds or versioned
  migration would become needless blockers.
- Always load latest: historical receipts, Skill attribution and experiments
  would silently drift.
- Remove lineage hashes entirely: tamper detection and exact provenance would
  be lost even though semantic compatibility is a separate concern.
