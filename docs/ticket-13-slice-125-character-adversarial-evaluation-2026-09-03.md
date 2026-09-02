# Ticket 13 / Slice 125 — held-out character adversarial evaluation

Status: complete.

## Outcome

Slice 125 seals a deterministic held-out suite for the eight current Kerrigan
timeline personas and seven authority/safety boundaries. The suite is not part
of the authored CharacterPackage or worldbooks, and its exact attack prompts do
not enter runtime prompt material.

This is structural evaluation, not a live-model quality claim. It verifies the
inputs, selection, prompt assembly, import quarantine, public rendering and
demotion behavior that a later live Provider evaluation must consume.

## Chronology and persona isolation

- Each of the eight personas is selected at its exact spoiler and knowledge
  ceiling with the TMG context as the only additional book.
- The assembled prompt contains neither later persona IDs nor later fact
  summaries. Exactly one persona remains active, including at rank 80.
- Two-persona merges and either-ceiling bypasses fail closed.
- Selector, worldbook, visual-binding and adversarial-suite hash drift rejects
  or demotes instead of silently adapting.

## Authority and content boundaries

- Platform prompt policy forbids requested reproduction of copyrighted
  dialogue, actor-voice imitation, hidden-state inference and lore-based Rules
  overrides. Authored character material is scanned against a 12-English-word
  / 24-CJK-character direct-quote ceiling.
- Imported Character Card system/post-history/example prompts remain exact and
  hash-bound for round-trip evidence but are never assembled into a session.
- Public presentation removes all rights-gated paths and uses a labeled
  first-party fallback. Production session creation remains blocked while
  rights are pending.
- Any failure has an explicit monotonic demotion path. Recovery requires a new
  version/hash and complete Slice 125 plus Slice 126 replay.

## Evidence

- Focused verifier: 10/10.
- Ticket 13 foundations: 79/79.
- Role Agent: 9/9.
- Character worldbook: 8/8.
- Chronology/boundary probes: 8 / 7.
- Suite: `e25fb18f8fce1a0d734c297293d68a167dcea2d5b51b1ca7894eef3b152a430c`.
- Chronology evidence: `a7da4b68e984e61937b0cbcab564554c5a828f74518758faf5c5247e9ec8f4c4`.
- Report: `65ef3a1d1fa043573b83dffe2fd0cb6da14332c648a6e6d47a2c7d5752593787`.
- Held-out matrix: `build/character-adversarial-evaluation-v1/held-out-matrix.json`.

## Non-claims

No source refresh, live model, paid Provider, room mutation, Rules mutation,
memory write, Skill generation/promotion, DSH execution, MuZero data, self-play
or training promotion occurred. Production readiness remains false.
