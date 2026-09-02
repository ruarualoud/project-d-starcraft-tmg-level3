# Ticket 12 Slice 114 — explicit source import workflow v4

Status: implemented; Ticket 12 remains open at 3/7 planned slices.

This slice adds an offline, content-bound workflow around future official-source
captures. It does not contact any upstream endpoint and does not refresh the
frozen `71/69/48` development input.

## Contract

- Every capture becomes an immutable revision manifest binding raw byte hashes,
  the normalized record/schema index, snapshot, dataset, versions, and upstream
  verification receipt.
- Staging, promotion, and rollback each require a distinct `human_cli` command
  with principal, reason, target revision, and the exact current pointer hash.
  Scheduled or automatic refresh commands fail before state changes.
- Staging computes a complete record diff but never changes the current pointer.
  Same-version community drift enters display review; official product/rule prose
  changes need independent scope, semantic, and rights evidence; schema,
  authority, version-conflict, and rollback-shaped candidate drift are
  quarantined.
- Review does not promote. Promotion is a separate CAS command. Rollback creates
  another immutable pointer event to a known revision; it never deletes or edits
  a capture.
- A room binds the exact pointer, revision, snapshot, and dataset present at room
  creation. Later promotion or rollback cannot change that room.
- The exported ledger replays without network access and verifies its pointer
  chain and every room binding.

This workflow remains source/display infrastructure. It cannot alter RuleAtoms,
replay truth, or training truth.

## Verification

Focused verifier: `npm run verify:official-source-import-workflow`.

It covers the frozen 271-record/21-capture manifest, tamper rejection,
explicit-command enforcement, same-version display-only drift, official-value
review evidence, schema quarantine, no silent replacement, CAS promotion,
immutable room pins, exact rollback, and offline ledger replay.

ctx2skill is used only as a `fact_probe`: no Skill was read, generated, or
promoted; DSH, MuZero, self-play, memory, and training promotion remain off.
