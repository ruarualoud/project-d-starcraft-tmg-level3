# Ticket 13 CharacterPackage and worldbook roadmap

Status: active; 5/8 implementation slices complete.

Ticket 13 turns the existing `1.0.0-demo.1` CharacterPackage and nine-book
catalogue into a versioned, visible, importable and adversarially verified
character product. Ticket 14 will mount the resulting shared interfaces into
the actual Expo Web/App and Battle Lab shells; Ticket 15 will bind them to
online Agent sessions.

## Fixed user decisions

- Network image acquisition and AI image transformation are authorized for
  this workspace when every source, raw byte hash, prompt, output and rights
  status remains explicit.
- The approved development direction uses StarCraft II Kerrigan modeling and
  upper-body anatomy as the identity/structure reference, StarCraft I analogue
  communication-portrait composition and mood, and high-resolution Western 2D
  science-fiction painting. Anime facial construction, horror deformation,
  low-resolution pixel enlargement, giant pauldrons and detached metal-bustier
  chest shapes are explicitly rejected.
- Rights-gated Kerrigan derivatives may be used in development evidence. They
  may not be represented as public-release-cleared without independent rights
  evidence. The Project D-original Vesper package is the public fallback.
- Any large-scale DSH Skill production, batch paid-Provider execution or batch
  Skill promotion requires a new explicit user confirmation. Ticket 13 does
  not run DSH or generate Skills.

## Planned slices

| Slice | Scope | Closure evidence |
| --- | --- | --- |
| 119 | **Complete.** Freeze visual source, rights, transformation, output-role and fallback contracts. | Sealed manifest; HTTPS/source/rights checks; planned-vs-realized truth; public fail-closed selection; Harness trace. |
| 120 | **Complete.** Capture one selected official reference and generate the dialogue avatar plus card portrait development assets. The generated full-body study is retained only as an ignored local design reference and is not product-selectable. | Immutable raw hashes; two prompts and generation receipts; dimensions/file hashes; visual inspection; full-body quarantine; development-only rights labels. |
| 121 | **Complete.** Implement an SC1-style dynamic dialogue-portrait state machine, five identity-bound keyframes, mode/cue variants and shared Web/App animation contract. | Server-owned mode/phase; finite model `visualCue`; deterministic reducer; actual local six-phase preview; public-rights fallback; no room/Rules authority. |
| 122 | **Complete.** Implement Character Card V2 PNG `chara`/base64/UTF-8 embedding and exact JSON/PNG import-export while freezing the old JSON-only Adapter. | CRC/base64/UTF-8/payload/chunk/dimension limits; byte-exact carrier and JSON round trip; strict Project D integrity binding; tamper/duplicate/foreign-card quarantine; no Rules authority. |
| 123 | **Complete.** Implement the era/persona/spoiler selector and shared character view model. Current data supplies eight personas plus TMG context, but the contract admits any number of versioned additions. All eight current personas have distinct development-only static era anchors; post-Zerus primal additionally has the five-frame dynamic manifest. | Exactly one persona plus independently selectable contexts; separate spoiler/knowledge ceilings; deterministic disclosed fallback; eight exact static visual bindings without cross-era reuse; one separately declared dynamic binding; revision CAS; content-free read-only offline snapshot. |
| 124 | Implement accessible Web/App semantic character-card and dynamic-avatar renderers. | Hash-identical semantic content; responsive desktop/tablet/mobile and native tree; 44px targets; portrait animation semantics; no battlefield geometry backflow. |
| 125 | Run chronology, quote-copying, hidden-state, source, rights and fallback adversarial evaluation. | Held-out persona probes; quote budget; later-era leakage rejection; room-hidden-state non-mutation; rollback/demotion evidence. |
| 126 | Run Ticket 13 aggregate, cross-version replay, security audit and handoff. | Fixed denominators, stable report hash, adjacent Rules/room/Provider gates and explicit Ticket 14/15 interfaces. |

## Harness boundary

Ticket 13 may expose only read/select/render/import/export character operations
plus a presentation-only finite `visualCue` selected from the current mode's
allowlist. Session mode and conversation phase remain server-owned.
It cannot apply a game action, mutate a room, call DSH, publish a Skill, or
create training truth. Any missing, drifted or non-releasable image resolves to
an explicit placeholder or the configured first-party fallback; it never
silently substitutes unrelated art.
