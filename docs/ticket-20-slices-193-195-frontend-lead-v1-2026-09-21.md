# Ticket 20 · Slices 193–195 · Frontend Lead closure document

Slice manifest: `coordination/slices/ticket-20-slices-193-195-frontend-lead.slice.json`
Owner: Kimi (profile `project-d-ui-lead`) · Base: `codex/starcraft-integration-20260921` @ `5776b30`
Allowed paths: `apps/starcraft-tmg-expo/`, this document.
Date: 2026-09-21

## 1. Scope and invariants

Frontend-only refinement program over the Expo Web/App product. This program:

- preserves every current capability and every backend interface (Client Domain,
  Rules, Authority, room, Provider, memory, source data and API contracts are
  untouched);
- never lets pixels, backgrounds, animations or labels become gameplay truth;
- keeps operations with incomplete backends visible with honest
  disabled/loading/error states;
- keeps the reduced-motion and accessibility behavior intact
  (`use-reduced-motion`, `accessibilityRole`/`accessibilityLiveRegion`,
  44dp touch targets);
- reuses existing StarCraft art, portraits, map assets and the existing color
  tokens (`#020617/#0f172a` panels, `#38bdf8` cyan, faction colors) before any
  presentation-only addition.

## 2. Audit of the actual journeys (pre-change)

Routes: `app/_layout.tsx` (Stack + `TacticalAdjutantDock` overlay),
`app/(tabs)/_layout.tsx` (5 tabs: Database `index`, Army `army`, Tools `tools`,
Battle Room `match`, Settings), `app/room/[roomId].tsx` (ingress redirect),
`app/dev/theme-lab.tsx`.

Findings:

1. **Navigation** — On Web the tab bar is top-mounted with fixed `maxWidth: 210`
   items and beside-icon labels; below ~640px the five labels collide and the
   header title truncates. Tool icon is a casino die; roster-analysis tab label
   is hardcoded Chinese in `tools.tsx` despite an existing `rosterAnalysis`
   i18n key. No responsive degradation for narrow Web.
2. **Battle table focus** — `match.tsx` wraps all four surfaces in one page
   `ScrollView`. On the battle surface the battlefield board, media card,
   accessible model list and the side panels all compete in one long column on
   touch screens: reaching the Actions panel means scrolling the board off
   screen. `authoritative-battle-workspace.tsx` mixes 11 viewport buttons and
   the map/terrain/threat display toggles in one row, and buries the
   threat-visibility toggle inside the audio media card.
3. **Unit identity/state** — Workbench read panels render stats as mono 10px
   facts; unit legibility (faction, location, reserve/deploy, score projection)
   exists but is dense. Board overview labels only appear at zoom ≤ 1.5.
4. **Database** — Detail views replace the list with only a small ✕ for exit
   (no back breadcrumb), list rows are small, and desktop Web shows a
   full-width single column with no max-width constraint.
5. **Army builder** — The Command tab is one long scroll of four full lists
   (faction cards, tactical cards, missions, deployments) with no progressive
   disclosure; the resource bar wraps awkwardly; legality banner is good.
6. **Tools / Review / Settings** — Tools tab strip is fixed five-across and
   clips on narrow screens; Settings is one long scroll with no anchor
   navigation; Learning console and map configurator are reachable only through
   the Match surface tabs (good pattern to reuse).
7. **Floating adjutant dock** — correct overlay; left untouched (companion
   slice owns it; focused test mounts the panel directly).

## 3. Frozen numbered sub-slice plan

Each sub-slice is one scoped local commit, in order. No backend contract,
testID, or capability is removed anywhere.

- **SS-1 · Shared command primitives + responsive hook.**
  Add `hooks/use-responsive-layout.ts` (phone / tablet / desktopWeb
  breakpoints from `useWindowDimensions`) and
  `components/ui/command-primitives.tsx` (CommandHeader, PillTabBar,
  PanelCard, StatusPill, SectionDisclosure) reusing existing tokens. Pure
  addition; no screen rewired yet.
- **SS-2 · Top-level navigation coherence** (`app/(tabs)/_layout.tsx`).
  Responsive Web tab bar: icon+label on wide Web, compact icon-only rail below
  720px, existing bottom bar with safe-area on native; theme-consistent icons
  (calculator for Tools); accessibility labels preserved; header kept.
- **SS-3 · Database journey polish** (`app/(tabs)/index.tsx`).
  Back breadcrumb on all three detail views, desktop max-width readable
  column, unit rows gain stat chips (HP/armor/speed) without changing data
  sources, sticky-free structure kept, catalogue gate screens unchanged.
- **SS-4 · Army builder progressive disclosure** (`app/(tabs)/army.tsx`).
  Command-tab lists become collapsible sections with counts and
  selected-state summaries; roster cards get clearer size/cost identity;
  resource bar and legality banner unchanged in behavior; save/import/share
  flows preserved.
- **SS-5 · Battle-table focus and panel reachability**
  (`app/(tabs)/match.tsx`, `components/battlefield/authoritative-battle-workspace.tsx`).
  Battle surface leaves the page ScrollView and becomes a flex layout whose
  panels scroll internally, keeping the table on screen; warning banners stay
  as accessible alerts but render compactly above the workspace; workspace
  viewport controls split into “view” and “display” groups; threat toggle moves
  from the audio card to the display group; desktop board height increased;
  all existing testIDs (`standard-match-contract`,
  `battlefield-map-contract-v1`, glyph ids) preserved.
- **SS-6 · Tools / review / settings journey polish**
  (`app/(tabs)/tools.tsx`, `app/(tabs)/settings.tsx`).
  Tools tab strip becomes horizontally scrollable on narrow widths and uses
  the existing `rosterAnalysis` i18n key; Settings gains a chip quick-nav to
  its sections; non-authoritative calculator notice retained verbatim in
  meaning.
- **SS-7 · Self-verification receipts and closure.** Run the two named gates
  exactly once each after the last relevant code change; record receipts here.

## 4. Verification policy

Named gates (manifest `selfVerificationByImplementer: true`), each run at most
once after the last relevant code change; a failed command gets at most one
rerun after repair of the implicated frontend path; stop after three
non-converging rounds.

| Gate | Command |
| --- | --- |
| Expo frontend TypeScript contract | `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec tsc --noEmit` |
| Focused navigation and character presentation components | `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/battlefield-presentation-v1.test.ts lib/level3/__tests__/character-presentation-mount-v2.test.tsx` |

## 5. Implementation log (filled as sub-slices complete)

| SS | Commit | Files | Summary |
| --- | --- | --- | --- |
| SS-1 | `3673ebe` | `hooks/use-responsive-layout.ts`, `components/ui/command-primitives.tsx`, this doc | Plan frozen; responsive breakpoint hook and shared command primitives (header, pill tabs, panel card, status pill, section disclosure) added; no screen rewired. |
| SS-2 | `ae47394` | `app/(tabs)/_layout.tsx` | Narrow Web (<720dp) collapses to a compact icon-only top rail and drops the truncating header; wide Web keeps beside-icon labels; native bottom bar unchanged; calculator icon for Tools; per-tab accessibility labels. |
| SS-3 | `ea322fd` | `app/(tabs)/index.tsx` | Back breadcrumb (44dp) on unit/card/mission detail views, HP/ARM/SPD identity chips on unit rows from existing catalogue data, 920dp readable column on desktop Web. |
| SS-4 | `bf592e5` | `app/(tabs)/army.tsx` | Command-tab faction/tactical/mission/deployment lists are collapsible sections with live counts and selection summaries, defaulting open along build order; all selection/import/share/legality/save flows unchanged. |
| SS-5 | `6e9072b` | `app/(tabs)/match.tsx`, `components/battlefield/authoritative-battle-workspace.tsx` | Battle Room surfaces use the shared scrollable pill tab bar. Workspace: viewport controls split from display-layer toggles; threat toggle moved out of the audio card into the display group; desktop board 500→560dp; on phone/tablet column layouts the Unit/Actions/Threat/Status/Markers/Referee panel renders directly below the board with the media card and accessible model list after it. All testIDs, glyph ids and dispatch flows unchanged. Plan-note adjustment: instead of removing the page ScrollView (which would have made overflow content unreachable on short desktop viewports), table focus is achieved by pane reorder and control grouping; recorded here for traceability. |
| SS-6 | `30e5955` | `app/(tabs)/tools.tsx`, `app/(tabs)/settings.tsx` | Tools tab strip scrolls horizontally below 560dp; roster tab uses the existing `rosterAnalysis` i18n key; Settings gains a chip quick-nav scrolling to Adjutant/language/source/migration/notice anchors. |
| repair | `88af6b1` | `lib/level3/__tests__/battlefield-presentation-v1.test.ts` | Repinned the stale Slice-132 board expectation to the current Ticket-23 map-manifest projection contract (verbatim projection dump). Battlefield suite 7/7. See receipts. |

Changed files (all under allowed paths): the seven rows above; no other files touched. No Client Domain, Rules, Authority, room, Provider, memory, source-data or API contract was modified; `git diff 5776b30 --stat` covers only the files listed.

## 6. Verification receipts

Profile policy: `selfVerificationByImplementer: true`; each named gate run at most once after the last relevant code change, with at most one rerun after repair.

1. **Expo frontend TypeScript contract**
   - Command: `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec tsc --noEmit`
   - Run after the last SS-1..SS-6 code change (dependencies installed once via `pnpm install --frozen-lockfile --prefer-offline`; offline store reuse only, no lockfile change).
   - Environment note: the first invocation was refused by corepack before executing tsc because the repository root `package.json` pins `packageManager: npm@11.9.0`; the gate was executed with `COREPACK_ENABLE_PROJECT_SPEC=0` so the named pnpm 9.12.0 toolchain ran unchanged.
   - Result: **exit 0, zero diagnostics**. Covers SS-1 through SS-6 (all TypeScript/TSX changed paths).

2. **Focused navigation and character presentation components**
   - Command: `corepack pnpm@9.12.0 --dir apps/starcraft-tmg-expo exec vitest run lib/level3/__tests__/battlefield-presentation-v1.test.ts lib/level3/__tests__/character-presentation-mount-v2.test.tsx`
   - First run (after SS-6, before any repair): **exit 1** — two pre-existing base failures, neither caused by this slice (diff vs base touches neither `lib/level3` nor `packages/`):
     a. `battlefield-presentation-v1.test.ts` board assertion stale since `045933b` (Ticket 23 map-manifest extension added `visualPresetId`/`visualPresetName`, full map identity and freeze-hash fields; `displayMapAssetKey` moved `alien_temple_local_v1` → `sc1_lost_temple_v1`).
     b. `character-presentation-mount-v2.test.tsx` fails collection: `packages/authoritative-engine/transition-v1.mjs` imports `../../../scripts/starcraft-tmg-rules-v0.mjs`, a legacy rules adapter input that is absent from this repository snapshot (not present at base commit `5776b30`, no git history, not git-ignored, no vendored copy). That path is outside this slice's allowed paths and is marked a read-only adapter input owned by the parent environment.
   - Repair round 1 (in-scope half only): repinned the board expectation verbatim from a direct projection dump (`88af6b1`).
   - Rerun (the one permitted rerun): **exit 1** — `battlefield-presentation-v1.test.ts` **7/7 passed**; `character-presentation-mount-v2.test.tsx` still fails collection with the identical out-of-scope missing-file error. Per policy, repair stopped: the remaining cause is not a frontend path this slice may edit (second non-converging round would be a no-op).

## 7. Unresolved Critical/High concerns

- **High (environment/integration, out of slice scope):** the character-presentation half of the named vitest gate cannot collect in this repository snapshot because `scripts/starcraft-tmg-rules-v0.mjs` (legacy rules adapter providing `applyStarcraftTmgAction`, `enumerateStarcraftTmgLegalActions`, `normalizeStarcraftTmgState` to `packages/authoritative-engine/transition-v1.mjs`) is missing at base commit `5776b30` and lies outside the allowed paths. Codex/integration must restore that adapter input (or adjust the mount) before the combined gate can go green. My character components and the floating dock were not modified, and the battlefield half of the gate is green 7/7.
- No Critical/High concerns within the changed frontend files themselves: no capability removed, no testID/contract changed, reduced-motion and accessibility wiring untouched, all presentation remains non-authoritative.

Closure: 7 scoped local commits on `agent/kimi/ticket-20-slices-193-195-frontend-lead` (`3673ebe`, `ae47394`, `ea322fd`, `bf592e5`, `6e9072b`, `30e5955`, `88af6b1`, plus this document's closure commit). Not pushed, per instructions.
