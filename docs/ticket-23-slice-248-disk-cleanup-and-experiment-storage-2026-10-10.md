# Slice 248 — finished-copy cleanup and experiment storage

## Result

Owner requested cleanup before further performance work. Only two terminal
performance matrices were pruned/compacted. Original Rooms, BYOK, maps, Skills,
paid model results, costs, screenshots and unrelated projects remain unchanged.

| Operation | Finished copies | Net reclaimed |
| --- | ---: | ---: |
| Archive exact Room branch deltas; remove repeated whole-history databases | 36 | 7.908645 GiB |
| Compact Provider-record databases; preserve complete rows and paths | 36 | 4.729607 GiB |
| Total | | **12.638252 GiB (about 13.57 GB)** |

Actual available filesystem space at the final observation: **18.822891 GiB**.
Other processes use this volume; reclaimed totals come from per-file ledgers,
not from attributing all filesystem changes to this task.

Private ledgers:

- `build/ticket23-performance-copy-cleanup-20261010.private.json`
- `build/ticket23-provider-copy-compaction-20261010.private.json`

The first protective Room cleanup attempt stopped before any deletion: these
diagnostic copies intentionally lacked some public/idempotency prefixes. The
successful archive records their exact sparse references. Every archive was
inflated and matched completely before its old database was removed.

The Provider copies occupied 5.511589 GiB; 4.729607 GiB were unused SQLite pages
left by uncompressed historical seeds and subsequent compressed updates. New
compact files retain byte-identical record_json, scope, revision and timestamp
fields, identical schema and original paths. Complete row/schema equality and
SQLite integrity checks preceded replacement. Only terminal copies with empty
WAL were eligible; replacements retain WAL mode. Zero model calls, zero original
source writes and zero model records removed.

Room-copy recovery is **source Room plus retained delta**, not the removed
isolated-room.sqlite path. Each matrix retains
`retained-room-deltas/*.room-delta.private.json.gz`, with reconstruction steps
and original source references. These are not independent full backups: do not
delete their original sources.

## Measured normal footprint

These are unfinished 2000-point Rooms, not complete-match measurements. Sizes
include both seats, model history, action receipts and images.

| Arm | State revision | Round / phase | Current size | MiB/revision | Images |
| --- | ---: | --- | ---: | ---: | ---: |
| A, fixed roster plus plan | 39 | 1 / assault | 0.396 GiB | 10.397 | 84.981 MiB |
| C, no opening plan | 132 | 2 / combat | 0.883 GiB | 6.850 | 289.331 MiB |
| B, fresh roster plus plan | 162 | 3 / movement | 1.272 GiB | 8.042 | 351.309 MiB |

Folders contain about 6.2–6.6 image files per revision, 2.17–2.19 MiB/revision,
including multiple views/evidence captures. Image retention was not changed.

## Capacity allowance, not a measured final size

No complete match has been measured. Provisionally allowing 400–600 state
revisions and observed 6.85–10.40 MiB/revision suggests about **3–6 GiB per
match**, rounded. Unit losses, queries, corrections and termination change this.

- Twelve retained experiments: **36–72 GiB**.
- Review/what-if workspaces: allow **10–15 GiB** initially (planning allowance,
  not a measured completed review).
- Three concurrent jobs, exports and archive staging: **5–10 GiB** additional
  temporary space, without repeatedly cloning entire histories.
- Filesystem safety margin: approximately **10 GiB** for app/other work.

Practical target: **80–100 GiB available** for twelve experiments plus review;
about **30 GiB available** for just the first three-room batch. Current 18.82
GiB cannot guarantee the full programme without further cleanup or a proven
retention/archival improvement. This is an estimate, not a new runtime hard
limit or experiment-scope reduction. Refine it after a genuinely terminal batch.

## Other large outputs deliberately preserved

Old semantic-map integration build: **5.002 GiB**; older semantic reset build:
**1.839 GiB**. They contain signed map-admission Rooms, rules receipts, images
and reports, not clearly useless caches. Whole K3 worktrees, source assets and
these acceptance folders were not deleted. Finished Web exports/large plain
snapshots also remain; record their consumers and recovery paths before pruning.

## Mainline resume

T23 33/36, T27 5/6; open mainline slices 248/272/249/250; new experiments 0/12.
The four-plan real-Flash matrix is terminal: 18 attempts, 15 complete actions,
three retained failures. Performance is **not accepted**. Twenty original-input
queries remain unmeasured: enumerable internal loadOwnedRoom leaked through a
public Store spread decorator, bypassing restored RAM loadRoom and causing a
LegalSpace hash mismatch before timing. Repair the source seam, then run only
these twenty queries once; reuse three natural matches. Do not repeat eighteen
paid actions, passed gates or reinitialize the original Rooms.

Future diagnostics should avoid uncompressed full-history seeds and archive
finished branch deltas promptly. Automatic retention was **not** implemented by
this cleanup; production action semantics, retention and strategy inputs are
unchanged.
