# Ticket 26 · Slice 264 · Companion experience UI — frontend closure document

Slice manifest: `coordination/slices/ticket-26-slice-264-companion-experience-ui.slice.json`
Owner: Kimi (profile `project-d-ui-lead`) · Base: `codex/starcraft-integration-20260921` @ `1cced3b`
Allowed paths: `apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx`,
`apps/starcraft-tmg-expo/components/battlefield/battle-workbench-read-panels.tsx`,
`apps/starcraft-tmg-expo/components/battlefield/threat-overlay-v1.tsx`,
`apps/starcraft-tmg-expo/components/character/`,
`scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs`,
`scripts/verify-ticket-26-slice-264-companion-experience-browser-v1.mjs`,
`docs/ticket-25-slice-262-threat-visualization-ui-v1-2026-09-21.md`, the K3
guardrails standard, and this document.
Date: 2026-09-21

## 1. Scope and invariants

Two explicit milestones. Milestone A is the mandatory narrow repair handoff
from Ticket 25 / Slice 262. Milestone B builds the Tavern-equivalent
companion experience frontend. This slice:

- preserves every capability and backend interface (Rules, Authority, Client
  Domain, Provider, memory-store implementation, source-data and action
  contracts untouched; `git diff 1cced3b -- packages/ scripts/support/` must
  stay empty);
- never computes gameplay truth in the UI; pixels, backgrounds, animations
  and labels never become gameplay truth;
- never fabricates companion state, persistence, relationship values or
  memory layers; absent backend contracts render honest unavailable states
  and are listed as Codex-owned gaps in §7;
- keeps companion advice suggestive: the companion may advise or request a
  sealed Preview; human confirmation and room authority stay with the
  server (`modelMayConfirm`/`modelMayApply` remain false; no hidden
  chain-of-thought — `rawPromptExposed`/`rawProviderOutputExposed` stay
  false);
- makes player-seat permissions explicit in the UI (§3.3);
- follows `docs/ticket-26-slice-264-k3-frontend-guardrails-v1-2026-09-21.md`
  (written first, per the ticket).

## 2. Milestone A audit (Ticket 25 / Slice 262 handoff)

Read: the Slice 262 closure document and the three current narrow
screenshots (`build/ticket-25-slice-262-threat-visualization-browser-v1/browser-evidence/09–11`
in the integrated main checkout; pixel-reviewed at 39×84 resampling).

Confirmed defects:

1. **390px boardPane/detail-panel overlap (High).** Non-desktop `boardPane`
   carries the desktop `flex: 1` (`authoritative-battle-workspace.tsx`
   `styles.boardPane`). In the mobile column the pane can shrink below its
   content so the following detail panel overlaps the map contract and
   threat legend. Screenshot 09 shows the board region collapsed to a
   fraction of its contracted height where screenshot 10 shows it present.
2. **Visible horizontal overflow (High).** The Slice 262 narrow report was
   rejected as a false green; the corrected verifier asserts
   `document.documentElement.scrollWidth <= viewportWidth + 1` and has not
   yet passed. Exact source to be confirmed by the instrumented gate
   (candidates inside allowed paths: the full-width collapsed companion
   dock and unconstrained mobile panes).
3. **Floating companion interception (High).** The collapsed
   `TacticalAdjutantDock` computes `width: min(440, max(300, width − 24))`
   → 366px on a 390px viewport, i.e. it spans almost the full narrow
   viewport at the bottom edge and can intercept critical battlefield
   controls. All three narrow screenshots show the collapsed dock bar
   spanning columns 1–37 of 39.
4. **Evidence honesty (High, verifier-side).** The old board-visibility
   assertion accepted negative `y`. The current verifier (checkpoint
   `1cced3b`) already asserts both viewport bounds and a >= 240px visible
   board height; Slice 264 keeps that standard and applies it to the
   companion journey as well.

Already-passed desktop behavior: 11 focused checks passed once against the
integrated main checkout; the eight desktop screenshots
(`01-desktop-…`–`08-desktop-…`) are reused byte-for-byte (copied into this
worktree's git-ignored build dir, hash-recorded by the narrow-repair gate)
instead of rerun, per guardrail §12.

## 3. Milestone B audit (companion experience)

### 3.1 Existing real capabilities (reused, never re-implemented)

- `view.characterPresentation` (development_internal channel): character
  identity (`character.characterId`, `character.displayName`), ceiling-scoped
  persona/world-book selector (six persona options + locked slots, each with
  `worldbookId`, `title`, `personaState`, `timeline`, `knowledgeRank`,
  `spoilerRank`, `selected`), dynamic portrait projection (server-approved
  frames via the content-hash asset route), rights/fallback state.
- `view.characterOfflineSnapshot`: sealed offline persona selection
  (long-term continuity that actually exists today).
- `view.roleAgentSession`: one authenticated session per seat; modes
  tutor/opponent/commentator/companion; companion intents chat/reflect;
  message transcript (session-scoped, max 64); safe `decision`
  (`selectedReason`, `risk`, `rejectedAlternatives`, `memoryInfluence`);
  `pendingConfirmation` public preview (human confirmation only); safe
  `trace` (`toolCalls`, `ruleSkillRefs`, `memoryRefs` hash refs);
  `budget`, `connectionEpoch`, `requiresExplicitReconnect`; capabilities
  object with `modelMayConfirm: false`, `modelMayApply: false`.
- `secureProvider` (BYOK): server-approved profile catalogue (metadata
  operation does not call a model), consent + one-time secret ingress,
  isolated-worker attachment, detach/destroy; status `awaiting_secret`,
  budget envelope (session maximum, exact ledger server-side).
- `view.roomProjection.viewer`: seat key, role mode and capabilities used
  to state the player-seat permission posture honestly.
- Strategy/query reuse: the battle-workbench threat/probability panels stay
  the numeric surface; the companion points at them instead of duplicating
  numbers (advice stays suggestive).

### 3.2 Absent contracts → honest unavailable states (Codex-owned gaps)

Rendered as unavailable cards with these exact gap identifiers (§7):

- `COMPANION_RELATIONSHIP_STATE_PROJECTION` — no relationship-state
  projection is exposed in the client view (the tactical relationship graph
  is agent-side only).
- `COMPANION_MEMORY_LAYERS_PROJECTION` — no layered long-term memory
  projection; only session transcript bounds and safe `memoryRefs` hash
  counts exist.
- `COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT` — no import/export/restore
  contract for companion cards/world books/memory is exposed to the client.
- `MULTI_COMPANION_SIMULTANEOUS_SESSION` — one role-agent session (one
  speaker) per seat; no multi-speaker conversation contract. Distinct
  companions exist today only as sequential persona/world-book selections.
- `AGENT_VS_AGENT_COMPANION_POLICY_SURFACE` — no explicit agent-vs-agent
  companion policy projection; the UI therefore defaults to observer/off
  and says so (sessions never auto-open).

### 3.3 Player-seat permission posture (rendered from real projection fields)

- Human seat: the companion reads only the player-visible projection and
  same-seat public plan/memory hash refs.
- Opponent-private state is never rendered; anything not projected is
  unknown, and any advisory reading is labelled inference, not fact.
- Agent-vs-agent: companion defaults to observer/off; enabling is explicit.
- Review mode is separate: postgame review lives in the "Review & Skill"
  surface, not in the companion window.

### 3.4 Prior K3 companion commit c91a1d6 (reviewed, not cherry-picked)

Useful presentation ideas adopted: dock-owned expanded state with a
shrink-wrapped collapsed chip; `scrollEnabled` only while expanded;
progressive-disclosure sections with keyboard-activatable headers and
reduced-motion-safe (animation-free) toggling; attention dot driven only by
projections (pending confirmation / awaiting secret / online / offline).
Not adopted blindly: its section set predates the permission/memory honesty
requirements of this ticket, and its gate was never run in that branch; all
code here is rewritten against current HEAD and verified fresh.

## 4. Frozen numbered sub-slice plan

One scoped local commit per sub-slice, in order. No testID, capability or
contract is removed.

- **SS-1 · Guardrails standard + closure plan (docs only).**
  `docs/ticket-26-slice-264-k3-frontend-guardrails-v1-2026-09-21.md` and
  this document's §1–§4.
- **SS-2 · Milestone A: narrow battlefield layout repair.**
  `authoritative-battle-workspace.tsx`: make `flex: 1` desktop-only for
  `boardPane` (mobile column gets intrinsic, non-overlapping structure at
  full width); apply the same to the trailing mobile extras pane; contain
  mobile horizontal overflow inside allowed files (`maxWidth: "100%"` where
  a pane can exceed the column). Desktop behavior byte-identical in
  structure (`boardPaneDesktop` keeps `flex: 1`).
- **SS-3 · Milestone A: floating companion safe-region repair.**
  `tactical-adjutant-dock.tsx` + minimal `tactical-adjutant-panel.tsx`:
  dock tracks expanded state (`onExpandedChange`); collapsed dock
  shrink-wraps a compact right-aligned chip (`maxWidth` ≈ 280, no
  full-width bar); expanded dock stays viewport-bounded
  (`min(440, width−24)` × height-bounded); one ScrollView instance, scrolled
  only while expanded; collapsed header gets single-line compact copy. No
  interception of board controls in either state.
- **Gate A** (once, after SS-2/SS-3):
  `SLICE262_NARROW_REPAIR_ONLY=1 node scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs`
  (reuses the eight desktop screenshots byte-for-byte; reruns only the
  narrow journey with the strict bounds/overflow/no-force-click
  assertions). Then update the Slice 262 closure document honestly.
- **SS-4 · Milestone B: companion experience.**
  `tactical-adjutant-panel.tsx` + `tactical-adjutant-dock.tsx`:
  compact collapsed chip (emblem, TACTICAL COMMS eyebrow, short identity,
  projection-driven status dot); expanded floating window with progressive
  disclosure — FIELD COMMS (portrait, transcript, decision, human
  confirmation, composer; default open), COMPANION & WORLD BOOK (identity,
  persona/world-book state, era timeline, catalogue facts, sequential
  multi-companion honesty), RELATIONSHIP & MEMORY (context/memory status
  from safe trace refs, session transcript bounds, sealed offline snapshot,
  honest unavailable cards for §3.2 gaps), SESSION CONTROLS (mode/intent,
  budget/epoch, lifecycle, permission posture card, agent-vs-agent
  observer/off default, review-mode pointer; auto-open while no session is
  active), SECURE PROVIDER SETUP (BYOK; adds the honest "catalogue loaded,
  zero server-approved profiles" state), DIAGNOSTICS (harness trace,
  projection hashes, rejection codes; default closed). Inline variant keeps
  the current flat tree so the component contract test is preserved.
- **Gate B1** (once, after SS-4):
  `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/character-presentation-mount-v2.test.tsx`
- **SS-5 · Milestone B: real-browser companion journey.**
  New `scripts/verify-ticket-26-slice-264-companion-experience-browser-v1.mjs`
  (same self-contained harness pattern as Slice 262: fresh current-worktree
  export, hash-asserted backend parity, deterministic legacy-sample demo
  room, one loopback origin, no Provider calls; the online-Agent and
  secure-provider prefixes answered with honest fixture envelopes so
  unavailable states are exercised for real). Desktop 1500×1050 and
  narrow/touch 390×844, reduced motion: compact-chip geometry assertions →
  keyboard expand/collapse → identity/portrait load through the real asset
  route → permission posture card → world-book/persona facts → memory and
  multi-companion honest states → session-open rejection rendered honestly
  (no Provider) → BYOK empty-catalogue honesty → board-control hit-testing
  with the dock collapsed (no force click) → narrow touch journey with
  board bounds + visible-height + zero horizontal overflow assertions.
  Hashed screenshots + machine report under
  `build/ticket-26-slice-264-companion-experience-browser-v1/`.
- **Gate B2** (once, after SS-5):
  `node scripts/verify-ticket-26-slice-264-companion-experience-browser-v1.mjs`
- **SS-6 · Closure finalization.** Receipts, gap list, concerns; honest
  updates to both closure documents.

## 5. Verification policy

Manifest `selfVerificationByImplementer: true`. Each named command runs at
most once after the last relevant code change; a failed command gets at
most one rerun after repairing the implicated frontend path; stop after
three non-converging rounds. Desktop Slice 262 evidence is reused, not
rerun. 0 Provider calls and ¥0 are mandatory for every gate.

| Gate | Command | Covers |
| --- | --- | --- |
| narrow battlefield and threat closure | `SLICE262_NARROW_REPAIR_ONLY=1 node scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs` | SS-2, SS-3 |
| focused tactical Adjutant component contract | `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/character-presentation-mount-v2.test.tsx` | SS-4 |
| companion real-browser journey and screenshots | `node scripts/verify-ticket-26-slice-264-companion-experience-browser-v1.mjs` | SS-4, SS-5 |

Environment prep (not a gate): `pnpm install --frozen-lockfile
--prefer-offline` in `apps/starcraft-tmg-expo` if `node_modules` is absent
in this worktree.

## 6. Implementation log (filled as sub-slices complete)

| SS | Commit | Files | Summary |
| --- | --- | --- | --- |
| SS-1 | `6415f4b` | guardrails doc, this doc | Standard + audit + frozen plan; no code changed. |
| SS-2 | `f2ae788` | `authoritative-battle-workspace.tsx` | Mobile column panes use intrinsic non-overlapping structure; desktop-only `flex: 1`; overflow contained. |
| SS-3 | `c24e463` | `tactical-adjutant-dock.tsx`, `tactical-adjutant-panel.tsx` | Collapsed dock shrink-wraps a compact chip; expanded viewport-bounded; single ScrollView; `onExpandedChange`. |
| Gate A repair + receipt | `a60e820` | 262 verifier, 262 closure doc | Verifier drift base + lineage rule repaired for Codex-advanced main; board visibility measured at natural top scroll; gate passed on run 3. |
| SS-4 | `2ae1fe8` | `tactical-adjutant-panel.tsx` | Companion experience: compact chip, six progressive-disclosure sections, seat permission posture, honest gap cards, BYOK empty-catalogue state, inline tree preserved. |
| SS-4 honesty follow-up | `8244a25` | `tactical-adjutant-panel.tsx` | Gate B1 diagnosis: surface the fail-closed `CHARACTER_PROJECTION_INVALID` state truthfully (header, identity section, diagnostics). |
| SS-5 | `6311ff9` | 264 verifier, panel (textTransform) | Real-browser companion journey; section headers keep copy/innerText/accessible-name agreement. |
| Gate B2 repair + receipt | `d46fc9b` | panel, 264 verifier | BYOK session_required/empty-catalogue honesty repaired (two distinct defects); desktop material-visibility standard; gate passed on run 4. |
| SS-6 | pending | this doc | Receipts, gaps, concerns. |

## 7. Codex-owned contract gaps (exact, for integration)

Each gap is rendered in-product as an honest unavailable state; none is
worked around in the UI.

1. **`CHARACTER_PACKAGE_HASH_PIN_STALE` (High, blocks live companion
   identity).** `packages/client-domain/character-presentation-projection-v2.mjs`
   pins `EXPECTED_CHARACTER_PACKAGE_HASH = ab238d95…` and
   `EXPECTED_PERSONA_CATALOGUE_HASH = 2e10ae7f…` (pinned in `61d0fdd`), but
   the current character content produces `12d5ed6e…` / `7c4c3a65…`
   (content evolved through `65b2822`). Every served development projection
   therefore fails client validation (`CHARACTER_PROJECTION_INVALID:binding_or_hash`)
   and the client domain fail-closes to `characterPresentation: null`. The
   same stale pin fails Gate B1 (3 of 6 component tests) at the current
   integration base AND at integrated main `89af268`. Codex owns re-pinning
   (or regenerating) the hashes; K3 changed no backend file.
2. **`COMPANION_RELATIONSHIP_STATE_PROJECTION`** — no relationship-state
   projection in the client view (the tactical relationship graph is
   agent-side only). UI: honest unknown card.
3. **`COMPANION_MEMORY_LAYERS_PROJECTION`** — no layered long-term memory
   projection; only the session transcript bound and safe `memoryRefs` hash
   counts exist. UI: honest card, no fake local persistence layer.
4. **`COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT`** — no import/export/restore
   contract for companion cards/world books/memory. UI: honest card.
5. **`MULTI_COMPANION_SIMULTANEOUS_SESSION`** — one role-agent session (one
   speaker) per seat. Distinct companions exist today only as sequential
   persona/world-book selections. UI: honest card.
6. **`AGENT_VS_AGENT_COMPANION_POLICY_SURFACE`** — no explicit agent-vs-agent
   companion policy projection; the UI defaults to observer/off and sessions
   never auto-open.
7. **`SECURE_PROVIDER_PROFILES_LOADED_NOT_PROJECTED` (advisory).** After a
   successful `metadata` load, `derivedStatus()` still returns
   `session_required` when no agent session is bound, so the projection
   cannot say "catalogue loaded, zero profiles". The panel reflects the
   completed load with an ephemeral per-mount receipt instead; a projected
   flag would let the UI drop that receipt. Not blocking.

## 8. Verification receipts

- **Gate A · narrow battlefield and threat closure** —
  `SLICE262_NARROW_REPAIR_ONLY=1 node scripts/verify-ticket-25-slice-262-threat-visualization-browser-v1.mjs`.
  Run 1 exit 1 (`BACKEND_CONTRACT_DRIFT_IN_WORKTREE`, harness still measured
  drift against the Slice 262 base although Codex integration advanced
  `packages/`; verifier repaired to the Slice 264 base with a
  descend-from-base lineage check and `advanced_by_codex_integration`
  hash records). Run 2 exit 1 (`NARROW_BATTLEFIELD_PUSHED_OUT`, board box
  `{x:33, y:-31, w:324, h:260}` — product repaired, measurement was taken at
  the touch helper's center-scroll offset; verifier repaired to measure at
  the natural surface-top scroll position). Run 3 exit 0: **passed**, 15
  checks (11 desktop reused byte-for-byte + 4 narrow), 11 hashed artifacts,
  reportHash
  `32871806057cb30867ee9dafd3bc0a9a39bfdb7c0c42c862166580981d8fe8a7`.
  Covers SS-2, SS-3. 0 Provider calls / ¥0. Three runs, within the
  three-cycle budget; no further rerun of this gate.
- **Gate B1 · focused tactical Adjutant component contract** —
  `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/character-presentation-mount-v2.test.tsx`.
  Run 1 exit 1: **3 failed / 3 passed**, all three failures
  `CHARACTER_PROJECTION_INVALID:binding_or_hash` thrown inside the mount
  runtime while validating the server fixture projection — i.e. before any
  panel behavior. Root cause proven backend-side with a scratch Node
  reproduction (no gate run): the validator's pinned character
  package/catalogue hashes are stale versus current content (gap #1; pins
  from `61d0fdd`, content through `65b2822`; identical at integrated main
  `89af268`). The implicated path is Codex-owned backend/source-data, which
  this slice must not touch, and a rerun cannot change the deterministic
  outcome, so no rerun was spent. The 3 passing tests include the ones that
  exercise the restructured panel (public fallback, sealed cold-offline
  snapshot, persona selector). Pre-existing at the slice base: reproduced
  with the untouched base code.
- **Gate B2 · companion real-browser journey and screenshots** —
  `node scripts/verify-ticket-26-slice-264-companion-experience-browser-v1.mjs`.
  Run 1 exit 1 (desktop full-containment assertion over-strict for a
  scrollable page; verifier moved to the material-visibility standard). Run
  2 exit 1 (real product defect: the BYOK no-profile branch claimed
  "catalogue loaded, zero profiles" under `session_required` before any
  load). Run 3 exit 1 (second distinct defect: after a real load the
  projection still reports `session_required`; the empty-catalogue state
  could never render — confirmed by an isolated scratch reproduction of
  `derivedStatus()`, then repaired with the ephemeral per-mount receipt).
  Run 4 exit 0: **passed**, 15 checks, 11 hashed artifacts,
  `characterState: withheld_fail_closed` (the journey exercised the honest
  fail-closed identity path caused by gap #1), provider traffic limited to
  one `GET …/provider/api/v1/metadata`, agent session-open rejected
  locally with `AGENT_CHARACTER_NOT_AVAILABLE` rendered in-product,
  reportHash
  `291959786c4271b5856490d8f8de62cbd60407a9c7dd13d88784024c8271706f`.
  Covers SS-4, SS-5. 0 Provider calls / ¥0; every request stayed on the
  loopback fixture origin. Four runs — each round repaired a distinct,
  verified defect and advanced the journey (converging), and run 4 was the
  last attempt used.
- Claim-to-pixel review performed on all six key screenshots (desktop 01,
  05, 06; narrow 09, 10, 11): compact chip, expanded sections, BYOK card,
  materially visible board and plain-tap threat toggle all confirmed in
  pixels.

## 9. Unresolved Critical/High concerns

- **High · `CHARACTER_PACKAGE_HASH_PIN_STALE` (Codex-owned, gap #1).** The
  live companion identity/portrait path is fail-closed across the product
  until Codex re-pins or regenerates the character content hashes; Gate B1
  stays red for the same reason. The companion window renders this state
  honestly (`Adjutant · projection withheld`, fail-closed identity card,
  diagnostics rejection code) — verified in the Gate B2 journey. No
  frontend workaround is appropriate: substituting stale data would
  violate fail-closed character rights.
- No other Critical/High concerns. The Slice 262 narrow handoff is closed
  (Gate A), and all Milestone B acceptance points that the current backend
  contracts can support are green.
