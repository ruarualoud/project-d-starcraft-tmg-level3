# Ticket 14 Slice 134 — source, localization, and device migration

Status: complete. Ticket 14 is 7/11; four slices remain. Overall project status
is 13/22 Tickets complete.

## Delivered boundary

Slice 134 removes the recovered Expo client's old bundled/Firestore data paths
from the current product and mounts one optional Client Domain extension for
source/localization metadata. The default four-operation Client Domain contract
remains unchanged. Neither Web nor App becomes a source, Rules, room, replay, or
training authority.

- The projection is metadata-only and exactly binds the frozen Ticket 12 v3
  source/localization chain: Command Center versions `71/69/48`, 271 records,
  and 1,440 fields. Source bodies, translations, images, URLs, credentials, and
  repository/legacy fallback are rejected.
- Source refresh is available only through the explicit
  `refresh_source_localization` intent. Product mount, room changes, lifecycle
  changes, and reconnects never refresh source data implicitly.
- The HTTP Adapter uses the fixed source route, HTTPS except loopback, omitted
  credentials, forbidden redirects, no-referrer/no-store, JSON media type, and
  an incrementally enforced 64 KiB response limit.
- Current and historical rooms are classified by the actual dependency content
  hashes in their MatchBinding. A room's pinned rules artifact is displayed
  only after exact MatchBinding, MIME, size, and content-hash verification.
  Missing or tampered artifacts are quarantined without a current-version
  substitute. The retained rules are display-only; old rule execution stays
  disabled.
- Expo settings expose provenance, freshness, rights status, and an explicit
  scan/import flow. Army and database views fail closed because official card
  bodies are not redistributed by this slice.

## Safe compatibility import

The migration scans exactly nine known legacy keys only after a user action.
Import requires a second inline confirmation bound to the exact `scanHash`.
All source values are re-read, reclassified, and rehashed before and after the
new generation is written.

- Original keys and current preferences/dice are never changed.
- Source and translation material becomes hash-only quarantine.
- Army drafts lose derived stats, costs, keywords, and rules, and remain
  quarantined pending validation against a future rights-approved catalogue.
- Historical matches retain only identity-free score/round summaries. They
  cannot restore rooms, create replay, or enter MuZero data.
- Immutable records are verified before the manifest pointer is published
  last. Same-scan retries do not rewrite; a different scan cannot silently
  replace an already published manifest.
- Missing-to-present and changed-byte races fail closed. Oversized inputs are
  preserved for separate isolation and cannot publish an unverifiable import.
- Reload, scan, and confirm use a single-flight operation epoch. Storage read
  failures surface as an explicit client failure rather than an unhandled
  asynchronous rejection.

## Latest official-source audit

The one-time read-only audit did not refresh the frozen source lock. The
official Command Center gameplay payload still matches `71/69/48`, but the
official Downloads page now exposes FAQ V1.0 (68 questions) that is absent from
the frozen lock. Therefore the current lock remains reproducible but must not
be described as the complete latest official rules corpus. FAQ ingestion,
semantic review, and a new freeze require a separate explicit source-refresh
command. Community faction-card drift was observed but has no official
precedence.

Audit evidence:
`docs/research/official-latest-data-audit-2026-09-03.md`.

## Verification and review

- Source/localization/migration verifier: 23/23.
- Expo React product behavior: 9/9.
- Client Domain regression: 17/17.
- TypeScript: zero errors.
- Slice-focused numbered assertions: 49/49.
- Ticket 14 cumulative numbered assertions: 267/267.
- Contract review: Blocker 0 / High 0 / Medium 0.
- Security review: Blocker 0 / High 0 / Medium 0.
- UI review: Blocker 0 / High 0; remaining browser modal/focus and complete UI
  localization checks are assigned to Slice 136.

No source refresh, Provider call, Skill generation, DSH run, MuZero export,
self-play, memory promotion, or training promotion occurred. `trainingTruth`
remains false and this slice does not claim production readiness.

## Handoff

Slice 135 moves Battle Lab's room, board, Referee, and Agent trace views onto
the same Client Domain Module. Slice 136 then proves the browser build,
responsive geometry, deep-link/reconnect behavior, and accessibility with real
runtime evidence; Slice 137 covers native builds/devices; Slice 138 runs the
cross-surface aggregate and closes Ticket 14.
