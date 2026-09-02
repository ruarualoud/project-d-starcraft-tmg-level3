# Ticket 12 Slice 113 — source evidence, precedence, and rights v3

Status: implemented; Ticket 12 remains open at 2/7 planned slices.

## Outcome

The frozen `71/69/48` Command Center chain remains unchanged and no source was
refreshed. A new v3 evidence layer wraps, but does not mutate, Slice 112's
frozen source/localization v2. Every one of its 1,440 public field-provenance
records now has a content-free evidence envelope with exact current record
identity, authority disposition, source-scope review, and an independent
rights decision.

Coverage is:

- 271/271 Command Center record locators;
- 83/83 current product records and all 617 product display fields bound to
  123 reviewed P2P PDF page locators;
- 15/15 rule-section records and all 269 rule-prose fields bound to reviewed
  Core rulebook page ranges, backed by the unchanged 192 structural anchors;
- 554 community fields retained as display-only without an official PDF-page
  claim;
- seven current and seven historical FAQ entry locators.

The field-evidence catalogue is
`d219325b6e3af2e8f86f75be3832fedf40bb66dacccfbc21f0889bfb1862fc99`.
The inspection contract is
`4c098a4e3acf281f544e48a341e535cdc6b179966b6b8e2314e8c0f7d1badec2`.
The reviewed binding is
`ec02bd875b5439b55d4a7e2f16ce7104a20783956fed2f1985857f43b2745af6`.

## FAQ drift and historical retention

The current frozen FAQ capture has semantic hash
`2204754f8a677685505e7e12ea10fccffe5427fdba19cf4ac56d448cad2dafd2`.
It differs from the previously reviewed FAQ semantic hash
`e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92`;
all seven indexed entries changed. The current version is therefore
`quarantined_semantic_drift` and cannot reuse the historical reconciliation.

The reviewed older FAQ is not deleted. It remains available as
historical-display and exact pinned-replay evidence, with its clause/anchor
locators, but it cannot override the current source or Core Rules. This is the
strict old-version freeze policy: visible and replayable, never silently
compatible.

## Precedence and rights

- Current product values come from the frozen Command Center snapshot. P2P is
  history/cross-check only. If a current value is missing, the record is
  quarantined; P2P, repository, and legacy data are not fallbacks.
- General Rules remain owned by the room-pinned Rules kernel and frozen Core
  rulebook dependencies. Command Center rule prose and FAQ cannot auto-override
  them.
- Historical rooms resolve by their exact pinned source and Rules
  dependencies, not by the newest source.
- Translation is a display sidecar and community content is display-only.
- The public v3 provenance API returns hashes, locators, and statuses only.
  Raw bytes, extracted text, images, source payloads, translated source bodies,
  and public display release all remain blocked pending independent rights and
  redistribution review. Six current source classes remain rights-unresolved.

## Verification

The Slice 113 gate passes 13/13. Adjacent gates also pass: Slice 112 official
localization 11/11, source lock 4/4, rule-source manifest 10/10, Core anchors
8/8, P2P aliases 11/11, historical FAQ source 8/8, exact FAQ reconciliation
12/12, supplemental FAQ reconciliation 12/12, and Ticket 11 closure 12/12.

The ctx2skill loop was used only as a `fact_probe`: zero Skills were read,
generated, or promoted; 13 Judge checks and the cross-time historical-source
retention check passed. DSH, MuZero, self-play, memory promotion, and training
promotion did not run. Real Provider work remains assigned to Slice 115.

## Remaining Ticket 12 work

Slice 114 is next: explicit-command-only importer, immutable raw capture,
version/diff classification, review queue, rollback, and room pinning. Slices
115–118 remain the real Provider, SQLite/PostgreSQL review store, shared Web/App
UI/offline cache, and aggregate closure.
