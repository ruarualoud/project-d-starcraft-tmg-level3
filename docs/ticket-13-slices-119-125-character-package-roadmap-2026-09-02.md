# Ticket 13 CharacterPackage and worldbook roadmap

Status: active; 1/7 implementation slices complete.

Ticket 13 turns the existing `1.0.0-demo.1` CharacterPackage and nine-book
catalogue into a versioned, visible, importable and adversarially verified
character product. Ticket 14 will mount the resulting shared interfaces into
the actual Expo Web/App and Battle Lab shells; Ticket 15 will bind them to
online Agent sessions.

## Fixed user decisions

- Network image acquisition and AI image transformation are authorized for
  this workspace when every source, raw byte hash, prompt, output and rights
  status remains explicit.
- The visual direction is a high-end Japanese cinematic science-fiction RPG
  finish. It may use the polish target named by the user as an intent reference,
  but must not copy another franchise's characters, costumes, props, logos or
  exact compositions.
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
| 120 | Capture selected official references and generate the avatar, card portrait and full-body development assets. | Immutable raw hashes; prompts and generation receipts; dimensions/file hashes; visual inspection; development-only rights labels. |
| 121 | Implement Character Card V2 PNG embedding and exact JSON/PNG import-export. | Payload/chunk limits; round trip; integrity binding; tamper and foreign-card quarantine; no Rules authority. |
| 122 | Implement the era/persona/spoiler selector and shared character view model. | Eight mutually exclusive personas plus TMG context; spoiler/knowledge ceilings; deterministic fallback and offline-safe state. |
| 123 | Implement accessible Web/App semantic character-card and avatar renderers. | Hash-identical semantic content; responsive desktop/tablet/mobile and native tree; 44px targets; no battlefield geometry backflow. |
| 124 | Run chronology, quote-copying, hidden-state, source, rights and fallback adversarial evaluation. | Held-out persona probes; quote budget; later-era leakage rejection; room-hidden-state non-mutation; rollback/demotion evidence. |
| 125 | Run Ticket 13 aggregate, cross-version replay, security audit and handoff. | Fixed denominators, stable report hash, adjacent Rules/room/Provider gates and explicit Ticket 14/15 interfaces. |

## Harness boundary

Ticket 13 may expose only read/select/render/import/export character operations.
It cannot apply a game action, mutate a room, call DSH, publish a Skill, or
create training truth. Any missing, drifted or non-releasable image resolves to
an explicit placeholder or the configured first-party fallback; it never
silently substitutes unrelated art.
