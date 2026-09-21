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

_(pending)_

## 6. Verification receipts

_(pending)_

## 7. Unresolved Critical/High concerns

_(pending)_
