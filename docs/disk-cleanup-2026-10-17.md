# Scoped disk cleanup — 2026-10-17

User requested immediate disk relief; development and six-arm generation remain paused.
Only explicitly inspected, untracked, closed, reproducible build copies are selected.
No source, current A–F checkpoint, paid Provider original, report, screenshot, map source,
dependency installation or worktree is selected for deletion.

## Selected targets

Paths below are relative to `starcraft-tmg-level3/`.

Old generated Expo export directories (their parent receipts and generated configuration remain):

- `.worktrees/ticket-24-semantic-map-integration/build/priority-classic-frozen-art-web-DtF7yE/export`
- `.worktrees/ticket-24-semantic-map-integration/build/official-native-map-web-export-MbPiid/export`
- `.worktrees/ticket-24-semantic-map-integration/build/official-native-temple-web-export-Uh4Emw/export`
- `.worktrees/ticket-24-semantic-map-integration/build/official-native-temple-web-export-markers-crjw42/export`
- `.worktrees/ticket-24-semantic-map-integration/build/official-native-temple-web-export-projection-mNee7w/export`

Only `journal.sqlite`, `journal.sqlite-wal`, and `journal.sqlite-shm` when present in these exact temporary directories:

- `build/ticket-18-faction-production-v1/contract-projection-wiring-9cI8vB`
- `build/ticket-18-faction-production-v1/contract-projection-wiring-BoxQfT`
- `build/ticket-18-faction-production-v1/contract-projection-wiring-UfxYXL`
- `build/ticket-18-faction-production-v1/contract-projection-wiring-YTZCB5`
- `build/ticket-18-faction-production-v1/contract-projection-wiring-YUcnE4`
- `build/ticket-18-faction-production-v1/contract-projection-wiring-ZHiaO6`
- `build/ticket-18-faction-production-v1/contract-projection-wiring-bSY7sm`

## Evidence and protection

- The test generator `scripts/verify-ticket-18-review-contract-projection-wiring-v1.mjs`
  creates these directories using `mkdtemp`, backs up the original journal, and denies Provider calls.
- `scripts/support/faction-field-source-actual-fixture-v1.mjs` identifies the retained original:
  `build/ticket-17-production-redesign-v1/production.sqlite` (760.68 MiB).
- `build/ticket-18-faction-production-v1/contract-projection-readiness-v1.json` remains;
  it reports passed, zero Provider calls and original journal unchanged.
- Git lists no tracked files in the selected targets; no matching running process was found.
- `lsof` found no open selected SQLite files or files beneath the five export directories.
- Observed free disk before cleanup: 4.56 GiB. Selected allocated size: 3.80 GiB.
- These disposable copies are permanently deleted to free space, not moved into Trash.
  They can be regenerated from preserved source/configuration and original journal;
  the exact historical temporary bytes are not promised to be reconstructed.

## Result

Completed: removed five export directories and nineteen SQLite/sidecar files
from the seven named test-copy directories (3.80 GiB allocated before deletion).
Free disk after cleanup: 9.34 GiB. The observed free-space increase is larger
than this batch; concurrent filesystem changes are not attributed to this cleanup.
The original production journal remains. No test or generation was run.

## Additional user-requested cleanup: Android intermediate artifacts

Selected after a fresh repository-only scan on 2026-10-17; this is a separate
batch from the 3.80 GiB above. The six production arms remain paused.

Paths relative to `starcraft-tmg-level3/`:

- `apps/starcraft-tmg-expo/android/app/build/intermediates` — 2232.14 MiB allocated.
- `apps/starcraft-tmg-expo/android/app/.cxx` — 152.37 MiB allocated.

Both are generated Android compilation intermediates, not source or APK outputs.
Exact paths were resolved inside this repository. Git reports no tracked files
under either target; `lsof +D` reports no open files; no Java/Gradle process was
observed. `android/app/build/outputs`, source, installed dependencies, current web
exports, databases, screenshots, reports, paid responses and A–F recovery files
are excluded. Removal is permanent; a later Android build regenerates caches
and will take longer on its first run. No build/test/model call is needed here.

Completed: both exact directories were removed and absence verified; APK outputs
remain. Selected allocated bytes totaled 2,500,341,760 (2.33 GiB). Observed free
disk changed from 9.99 GiB immediately before removal to 12.00 GiB afterward
(net +2.00 GiB; allocation sharing/concurrent filesystem activity means this is
not identical to selected file allocation). No production data was removed.
