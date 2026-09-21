# Ticket 26 / Slice 266d — Companion Tavern completion (scoped Tavern-equivalent contract)

Owner: Kimi · Worktree `.worktrees/ticket-26-slice-266c-companion-product-binding`
Base: `253c5ac48a68c22b5a63cb40a802fe6c11ef65f8` (Slice 266c closure) · Date: 2026-09-22
Slice manifest: `.agent-runtime/slice.json` (`ticket-26-slice-266d-companion-tavern-completion`)

> Status: **in progress** — this file opens as the frozen sub-slice plan (266d-SS-1)
> and closes as the full closure document (266d-SS-8).

## Invariants honored for the whole slice

- No change to Rules, Authority, battle actions, strategy, replay/Skill
  evolution, source snapshots, credentials, or the main Codex match run.
  `packages/character-agent`, `packages/http-adapter`, the mount-runtime/dock
  files and `packages/companion-backend-module-v1/verify-*.mjs` gates are
  untouched; all backend edits stay inside the manifest-allowed paths and are
  additive/backward-compatible.
- No paid Provider, no source-data refresh, no credential read, no Git push,
  no dispatched agent. The browser/headless gate uses verifier-controlled
  deterministic Provider responders only; `trainingTruth: false` everywhere.
- The companion path still never persists seat tokens, never reads
  opponent-private plans/memory, never requests or stores hidden
  chain-of-thought, never fabricates a model reply, and holds no
  Preview/Confirm/Apply or Room-mutation authority — the gate re-proves zero
  Room mutations and an unchanged `stateRevision`.
- Read first, as ordered by the brief: the SillyTavern parity matrix
  (`docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md`)
  and the Slice 266c closure
  (`docs/ticket-26-slice-266c-companion-product-binding-v1-2026-09-22.md`).
- No third-party extension marketplace is implemented (explicit exclusion).
- Multi-companion deterministic order, @mentions, Provider
  interruption/Continue and seat isolation from 266c must remain intact; the
  extended gate keeps every 266c check.

## Frozen numbered sub-slices (one scoped commit each, dependency order)

1. **266d-SS-1 — this frozen plan** (docs only).
2. **266d-SS-2 — CB-2 backend extension (additive, backward-compatible).**
   `packages/companion-backend-module-v1/worldbook-memory-engine-v1.mjs` +
   `index.mjs`: worldbook entry `scope` tier
   (`global | character | persona | chat`, optional in the sealed entry so
   existing hashes/bytes are unchanged; absent ≡ `character`), deterministic
   multi-scope merge in `assembleContext` (`additionalScopes` overlays:
   worldbook + rolling summary + episodic + relationship; `extraEntries` for
   inline deterministic entries), bounded trigger recursion
   (`maxRecursionDepth`, default 0 = exact old behavior; the product wires 2),
   insertion priority (priority desc → scope tier → entryId → entryHash) with
   per-entry provenance and `firedAtDepth`, and a rollback-safe rolling
   summary: every write also stores an immutable `v{n}` record in a separate
   history namespace (layer isolation unchanged), plus
   `listRollingSummaryVersions` / `rollbackRollingSummary` (rollback writes a
   NEW current version — nothing is ever overwritten or deleted).
3. **266d-SS-3 — product construction: durable persistence + six-package
   portrait binding.**
   - `companion-product-module-v1.mjs` + `index.mjs`: export and wire the
     existing encrypted SQLite M1 / PostgreSQL production persistence port
     (`createStarcraftTmgCompanionProductPersistenceV1`) so product
     construction can compose the durable adapters (managed key / codec
     required, fail-closed as the adapters already enforce); pass an injected
     `assetCatalog` through to the composed backend presentation resolver.
   - `content/characters/companion-portrait-asset-registry-v1.mjs` (new):
     the server-safe registry binding all six companions' six portrait states
     to the committed approved keyframes (the five portrait-state contracts'
     `frameBindings` plus Kerrigan's receipted SC1 dialogue frames, with the
     honestly-shared `damaged_concerned ≡ alert_combat` frame labelled).
   - `companionProductPackageInputFromCatalogueEntryV1(entry, extras)` gains an
     optional `extras.presentationAssets` so the sealed packages carry the
     receipt/hash-bound presentation assets; catalogue registration stays
     data-driven and extensible.
4. **266d-SS-4 — service + HTTP contracts** (`companion-room-session-service-v1.mjs`,
   `companion-product-module-v1.mjs`):
   versioned user-persona binding to the authenticated seat (read/put/rollback,
   32-version bound); worldbook wiring (pack character entries sealed into
   package extensions and injected inline, persona entry derived from the
   current persona, product-level global entries, persisted chat-scope
   register/list, recursion depth 2); layered memory operations (read,
   summary edit, summary rollback, episodic fact, observed relationship
   event); swipe/reroll/edit-as-branch with lineage (branches list/open,
   provider reroll entry, user edit entry, accept — appends a NEW turn, never
   overwrites — , discard); Author's Note depth/frequency injection into the
   provider request; safe import/export/restore for conversations, character
   cards (packages) and chat worldbooks (schema validation, integrity/version
   metadata, credential + hidden-CoT scans, restore-never-overwrite);
   audit export/verify + replay candidate of public companion turns; and the
   four permission surfaces (human-vs-agent, human-vs-human,
   agent-vs-agent-observer, review mode) computed live through a probe session
   — opponent-private always denied, canSpeak honesty, never any
   Preview/Confirm/Apply.
5. **266d-SS-5 — Client Domain companion client extension**
   (`packages/client-domain/client-domain-v1.mjs`): the new operations and
   endpoint mapping; the four-operation domain interface, the trusted-ingress
   credential handoff and every existing guarantee stay byte-identical in
   behavior.
6. **266d-SS-6 — floating Web/App UI** (`tactical-adjutant-panel.tsx`,
   `companion-catalogue-panel.tsx`, `client-domain-provider.tsx` typing):
   persona card, worldbook card (merged scoped entries + chat entry add +
   last-turn fired provenance), memory card (layers, summary edit/rollback,
   episodic, relationship), swipe/reroll/edit-branch controls with lineage,
   Author's Note editor, import/export/restore + audit/replay cards,
   permission-surfaces card; catalogue gap rows flipped honestly to
   `connected (Slice 266d)` only where the contract is real; responsive at
   desktop and 390px with zero horizontal overflow.
7. **266d-SS-7 — verifier extension + one gate run.**
   `scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
   extended (never a second test): durable SQLite process-restart resume
   phase, persona/worldbook/memory/branch/author's-note/import-export/audit/
   permission headless proofs, six real portrait pixel checks (one per
   companion), the full 266c browser journey kept intact, new UI card
   interactions at desktop + 390px, screenshots and the machine report.
   Run exactly once after the final relevant code change.
8. **266d-SS-8 — this closure finalized**: exact files, commits, evidence,
   receipts, and any honest nonblocking gap.

## Verification strategy

`selfVerificationByImplementer: true`. Single focused gate:
`node scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
— run once after the final relevant code change; a failed run may be repaired
and re-run, and the same repair loop stops and reports after three
non-converging rounds. Only Critical/High findings block. 0 Provider calls / ¥0.

## Evidence, commits, gaps

_To be completed at 266d-SS-8._
