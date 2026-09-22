# Ticket 26 / Slice 266d — Companion Tavern completion (scoped Tavern-equivalent contract)

Owner: Kimi · Worktree `.worktrees/ticket-26-slice-266c-companion-product-binding`
Base: `253c5ac48a68c22b5a63cb40a802fe6c11ef65f8` (Slice 266c closure) · Date: 2026-09-22
Slice manifest: `.agent-runtime/slice.json` (`ticket-26-slice-266d-companion-tavern-completion`)

> Status: **implementation complete — closed (266d-SS-8).** All eight sub-slices
> are committed in dependency order on
> `agent/kimi/ticket-26-slice-266c-companion-product-binding`. Per the slice
> rules the single browser gate run is reserved for the integrating Codex; the
> implementer's evidence is the full headless mirror of the gate (all green)
> recorded below.

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

### Commits (base `253c5ac` → HEAD, one scoped commit per sub-slice)

| Sub-slice | Commit | Files |
|---|---|---|
| SS-1 frozen plan | `a34a5e0` | `docs/ticket-26-slice-266d-companion-tavern-completion-v1-2026-09-22.md` |
| SS-2 backend extension | `54c952a` | `packages/companion-backend-module-v1/worldbook-memory-engine-v1.mjs`, `packages/companion-backend-module-v1/index.mjs` |
| SS-3 durable persistence + portrait registry | `dd57c9d` | `packages/product-composition/companion-product-module-v1.mjs`, `packages/product-composition/index.mjs`, `content/characters/companion-portrait-asset-registry-v1.mjs` |
| SS-4 service + HTTP contracts | `eb857e5` | `packages/product-composition/companion-room-session-service-v1.mjs`, `packages/product-composition/companion-product-module-v1.mjs` |
| SS-5 client domain extension | `a3b30a7` | `packages/client-domain/client-domain-v1.mjs` |
| SS-6 floating UI cards | `733a301` | `apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx`, `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx`, `apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx` |
| module hardening | `89d5415` | `packages/product-composition/companion-product-module-v1.mjs` (replay-candidate route rejects `promote`/`automaticPromotion` with `COMPANION_AUDIT_AUTOMATIC_PROMOTION_FORBIDDEN`) |
| SS-7 gate extension | `b718550` | `scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs` (+1021 lines; every 266c check retained) |
| SS-8 this closure | _(this commit)_ | `docs/ticket-26-slice-266d-companion-tavern-completion-v1-2026-09-22.md` |

`git diff --name-only 253c5ac..HEAD` touches exactly the 12 files above, all
inside the manifest `allowedPaths`. No push performed.

### Evidence (implementer-side, 0 Provider calls / ¥0)

1. **Headless gate mirror — `SS7 PREFLIGHT ALL OK`** (2026-09-22, worktree
   HEAD `b718550`). A headless script asserting the exact SS-7 headless
   contract surface passed end-to-end, including:
   - versioned persona bound to the authenticated seat: v1 → v2 put,
     append-only rollback to v1 content as v3 (`persona.current.v3`);
   - worldbook: keyword + regex triggers; `global`/`character`/`persona`/
     `chat` tiers all present; bounded recursion proven (`rec-alpha` depth 0 →
     `rec-beta` depth 1, `maxDepth: 2, bounded: true`); insertion order
     strictly priority-desc (10, 9, 8, 7, 6, 5); cross-companion determinism —
     shared tiers byte-identical between Kerrigan's and Zagara's assemblies,
     character tier sealed per companion package (Kerrigan 0, Zagara 3
     always-active pack entries);
   - Author's Note: `depth 2, frequency 1` injection proven **inside the
     captured deterministic Provider request** at the exact reported position,
     as a system message, on both companions;
   - memory: summary v1/v2 + rollback (current returns to "Summary one." with
     all three versions retained), episodic fact, typed relationship event
     (`observed_match_outcome`, trust +5), `SUMMARY_VERSION_NOT_FOUND` on
     unknown version;
   - branches: swipe open → provider reroll → accept (new turn appended, prior
     `turnHash` chain unchanged, lineage recorded); edit-as-branch on own user
     turn → accept; `COMPANION_BRANCH_EDIT_REQUIRES_OWN_USER_TURN` and
     `COMPANION_BRANCH_SWIPE_REQUIRES_COMPANION_TURN` rejections; branch list
     shows both branches `accepted`;
   - export/restore: integrity hash matches, no seat token or credentials in
     the export JSON, duplicate restore → `COMPANION_CONVERSATION_ALREADY_EXISTS`,
     tampered payload → `COMPANION_IMPORT_INTEGRITY_MISMATCH`, cross-seat →
     `COMPANION_EXPORT_SCOPE_MISMATCH`; sealed package export/import with six
     64-hex `presentationAssets` content hashes; chat-worldbook export/import;
   - audit: export + verify + independent `verifyCompanionAuditExport` on the
     serialized string (entry count + head hash match); replay candidate of
     public turns; automatic promotion rejected;
   - permission surfaces: exactly four (`human_vs_agent`, `human_vs_human`,
     `agent_vs_agent_observer`, `review_mode`); opponent-private reads denied,
     observer `canSpeak: false`, no Preview/Confirm/Apply anywhere;
   - **durable restart**: two independent product compositions over one
     encrypted SQLite file resumed transcript, persona (v3), Author's Note,
     rolling summary and branch lineage after a simulated process restart;
     module status reports `persistence.durable === true`; wrong key,
     missing key and unknown kind all fail closed
     (`DEPENDENCY_MISSING` / `COMPANION_PRODUCT_PERSISTENCE_KIND_UNKNOWN`);
   - 401 without a seat token on the product API.
2. **Backend module gates** `verify-v1`, `verify-cb2`, `verify-cb3`,
   `verify-cb4`: all PASS after SS-2 (backward compatibility of the sealed
   worldbook/memory engine preserved).
3. **Service/HTTP/client smokes**: direct service, HTTP-route and
   client-transport smokes all green end-to-end (persona v3 rollback, four
   worldbook tiers firing, note injection in provider request, summary
   rollback, branch lineage, export/tamper/cross-seat rejections, audit, four
   permission surfaces).
4. **tsc** on the Expo app: 29 errors before the slice, 29 after — no new
   type errors introduced (the 29 are the pre-existing baseline in the three
   touched UI files).
5. The single slice gate
   `node scripts/verify-ticket-26-slice-266c-companion-product-binding-v1.mjs`
   was **not run by the implementer** (slice rules: the integrating Codex runs
   it exactly once). `node --check` passes on the extended verifier.

### Repair-loop record

One non-converging assertion was found by the preflight and repaired in a
single round: the SS-7 draft asserted byte-identical worldbook assemblies
across companions, which is wrong by design — character-tier entries are
sealed per companion package (Zagara's pack carries three always-active
entries; Kerrigan's backend-bound reference pack carries none). The assertion
was re-scoped to the honest contract (shared tiers byte-identical + character
tier companion-scoped) in both the preflight and the gate; the loop then
converged. Total repair rounds: 1 of max 3.

### Honest nonblocking gaps (no Critical/High findings open)

- **Browser phase unexecuted by the implementer.** The new desktop/390px
  UI-interaction blocks (persona save, worldbook register, memory
  save/rollback, branch swipe/edit accept, export/restore, audit, permissions)
  and the six real-portrait pixel proofs
  (`companion-card-portrait-{slug}-img`) are written into the gate but have
  only been validated headlessly; their first live-browser execution is the
  integrating Codex's gate run.
- **Catalogue parity rows** for animation and pack-backend-promotion remain
  honestly marked pending — those are Codex-owned gaps outside this slice;
  only rows backed by real 266c/266d contracts were flipped to
  `connected (Slice 266c/266d)`.
- **Kerrigan character-tier worldbook**: the backend-bound reference pack
  carries no sealed worldbook entries (pre-existing pack data, not changed by
  this slice); her character tier is empty by data, which the gate asserts
  explicitly.
- **`verify-ticket-14-client-domain-module-v1.mjs`** fails identically on the
  pre-slice baseline (missing local
  `.worktrees/starcraft-tmg-local/data/starcraft-tmg-data.json`) — a
  pre-existing environment issue, not introduced here.
- No third-party extension marketplace was implemented (explicit exclusion).

## Integrating-Codex browser acceptance (2026-09-22)

The K3 closure commit `77d532dc6bd3b240934ec690ce3a1abb337ad133`
was merged by `e7c25ff`. The integrating gate exposed and repaired two verifier
integration defects before browser execution:

1. the legacy adapter input resolved three directories above the nested
   repository instead of the actual parent `project-d` root;
2. backend scope was compared from the slice base to the moving current HEAD,
   falsely attributing later Ticket 23 work to K3. It now proves that the fixed
   closure commit is an ancestor of HEAD and audits only the fixed
   base-to-closure range.

The third and final run reached the real browser journey. It passed 28 checks,
including the live identity pin repair, two-companion ordered conversation,
checkpoint/interrupt/explicit-continue/reload, real portrait pixels, persona,
four-tier worldbook, layered memory rollback, Author's Note save, accepted
swipe/edit branches, safe export/restore, audit/replay permissions, desktop
overflow, honest BYOK unavailability, six companion portraits, 390px resume,
speaker pixels, responsive cards and close-conversation behavior. It then
stopped on `NOTE_REQUESTS_NOT_CAPTURED` with `captured: 1`.

Per the three-round convergence rule there is no fourth integrating repair in
this round. Ticket 26 / Slice 266d remains implemented and merged but browser
acceptance-blocked. K3 owns the next isolated repair: determine whether the
Author's Note request capture count or its expected denominator is wrong,
preserve the already-passing 28 checks, and produce a new closure for one fresh
acceptance round. No real Provider was called and no formal match Room was
mutated.

## Resolution addendum (2026-09-22, Slice 266e)

Resolved by Ticket 26 / Slice 266e
(`docs/ticket-26-slice-266e-companion-final-product-closure-v1-2026-09-22.md`).
The diagnosis stood: the product emitted the correct two Author's
Note-injected Provider requests; the verifier indexed its capture window by
the call counter, which also counts the verifier-armed outage that throws
before its request is recorded. The window is now indexed by
`providerProbe.requests.length` with the denominator unchanged (2/2) and the
per-request position proof intact. The extended gate (same command, extended
— no second verifier) passed **45/45 checks** on its single Slice 266e run,
report hash `ec6e261bfd70545436cf69886bcbbfc25e953137f237166414686645c174ecba`,
with all 28 previously passing checks preserved and the two remaining
catalogue gaps (six-state portrait animation binding, package-to-backend
promotion) connected for real.
