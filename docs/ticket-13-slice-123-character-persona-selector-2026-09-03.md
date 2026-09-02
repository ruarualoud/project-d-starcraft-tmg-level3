# Ticket 13 / Slice 123 — character persona selector

Status: complete.

## Outcome

Slice 123 provides the shared selector state and view model that Slice 124 will
render on Web and App. The current catalogue contains eight timeline personas
and one independent StarCraft TMG context; eight is a data denominator, not a
code capacity. A versioned CharacterPackage may add any number of new persona
worldbooks. A 24-persona scale probe passes without a special branch or
truncation.

All eight current personas now bind a distinct 1254-square development-only
static era portrait. Seven were generated in this Slice after the user expanded
the one-era decision; each has its exact ImageGen prompt, identity input hash,
output hash/bytes/dimensions, rights status and manual visual checks in a sealed
receipt. The post-Zerus primal persona keeps the previously accepted static
anchor and is the only one that additionally binds the current five-frame
dynamic manifest. A persona must never silently reuse another era's portrait.

## Selection contract

- Exactly one `persona_edition` is active. Game/context books are selected on a
  separate list and cannot smuggle in a second persona.
- Persona options are deterministically ordered by spoiler rank, knowledge rank
  and worldbook ID.
- Spoiler and knowledge ceilings are independent. Each unavailable option carries
  a visible `spoiler_ceiling`, `knowledge_ceiling` or fanon-policy reason.
- Selecting the xel'naga epilogue requires explicit rank-80 spoiler and knowledge
  ceilings. Lowering an active ceiling selects the latest safe persona, records
  a fallback reason and never imports later knowledge.
- The selector emits the exact `worldbookIds` and ceiling input already consumed
  by the configured Character Session factory; no translation layer or alternate
  worldbook semantics are introduced.

## State, offline and integrity

State is content-hashed, catalogue/CharacterPackage-bound and revision-CAS
protected. Missing/tampered catalogues, stale events, cross-catalog snapshots and
state/view changes fail closed. The offline snapshot contains only selector
metadata, selected IDs, timeline labels, rank/status data and hashes—never
worldbook facts or prompt bodies. Offline restore is explicitly read-only until
the client reconnects.

## Evidence

- Focused verifier: 13/13 assertions.
- Current catalogue: 8 personas + 1 context.
- Versioned capacity probe: 24 personas without truncation.
- Produced persona visuals: 8 static era anchors; 1 also has a dynamic manifest.
- Seven new PNG assets: 15,634,449 bytes total, each 1254×1254 and byte/hash checked.
- Era-generation plan: `2e59aaf03633aab9662607a2e8b88228cc984b1bec59968157219aa2b54f02ba`.
- Persona-visual binding: `7188cf46173f6c5e8244cddbdbe40e549dbeb05efaf4dd27c45827b3b2c667ea`.
- Catalogue hash: `f4dad5c90405580ec40428d993e0e144f50cac844e65e40f8491d48ad7ff3f81`.
- Default state/view: `16b6af1c...341e` / `fd15d50d...17c0`.
- Offline snapshot: `397517be...146d`.
- Verification report: `7778c3916d5f76c41115853fa6578ef239a30294f4186d219de4d0f5a5d88275`.
- Inspectable shared preview: `build/character-persona-selector-v1/preview.json`.
- Visual comparison: `build/character-persona-selector-v1/era-comparison.html`.

## Authority

The selector chooses presentation/persona inputs only. Lore cannot override
Rules; it cannot mutate a room, apply an action, invoke a Provider, write memory,
generate a Skill, call DSH, create MuZero/self-play data or create training truth.
