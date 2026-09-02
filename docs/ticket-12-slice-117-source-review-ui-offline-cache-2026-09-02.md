# Ticket 12 Slice 117 — shared source-review UI and offline cache v1

Status: implemented; Ticket 12 remains open at 6/7 planned slices.

Web and App now consume one source/review view model. Web renders accessible
semantic HTML/CSS; App receives an accessibility-labelled native component tree.
Both use the same content hash and review-store CAS controller.

## Product behavior

- The panel shows source hashes, authority, rights/review status, current and
  historical locator metadata, canonical text, machine draft, reviewed text,
  and approve/correct/reject controls.
- Until public-body rights pass, text is visible only to an authenticated
  translation administrator while online. A viewer receives content-free
  provenance only. Every mutation requires the admin role, online connectivity,
  and the current review revision.
- Desktop uses a side panel, tablet a sheet, and phone a full-width sheet. All
  controls are at least 44 CSS pixels. Layout/DPR/fit/zoom/pan never changes
  battlefield world-to-CSS scale, base/token geometry, or collision rules.
- Locale resolution is deterministic (`zh-* -> zh-CN`, `en-* -> en-US`, then an
  explicit fallback chain).
- The bounded device cache stores only hashes, locators, rights/review status,
  and review/provider receipt hashes. It never stores raw source bodies,
  canonical text, translated bodies, or credentials. Offline/stale views are
  read-only metadata. Reconnect replaces a changed snapshot/dataset entry;
  expected old hashes fail closed; corruption invalidates the entry.

`npm run verify:source-review-ui-offline-cache` covers Web/App parity, role
isolation, SQLite-backed correction CAS, desktop/tablet/mobile layout,
accessibility, locale fallback, stale and network-error fallback, reconnect,
version invalidation, content-free caching, tamper rejection, and board-geometry
isolation.

This is a framework-neutral shared module ready for the actual Web and native
shell integration in later deployment tickets; productionReady remains false.
ctx2skill is fact-probe only with zero Skills read/generated/promoted; no DSH,
MuZero, self-play, memory, or training promotion runs here.
