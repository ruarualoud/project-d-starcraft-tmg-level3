# Ticket 24 / Slice 256 — mission-geometry gate worklog v1

Date: 2026-09-16
Status: implemented and focused gate passed; Slice 256 art production remains in progress
Provider usage: none. DeepSeek increment `0`; existing optimized-match ledger remains
`144` calls / `6,191,121` reported units / `¥11.833541`.

## Why this gate exists

A classic-map background and a balanced terrain count do not prove that a real
mission can be played. A room also has to preserve each selected Deployment
Card's Entry Edge segments and six-inch Zone of Influence, let both players
reach every Mission Marker, and retain access to all four battlefield Quarters
used by Divide and Conquer. Those checks must use the compiled Rules layer, not
the background pixels.

The gate covers both galleries. Completing the Brood War art in Slice 255 did
not exempt those ten maps from the new geometry denominator.

## Denominator

The current official card bundle contains:

- five Standard missions and five Standard deployments;
- five Skirmish missions and five Skirmish deployments;
- nine Standard maps and six Skirmish maps with exact current-card geometry;
- five Grand Offensive maps with a correct 72×36 table size but no current
  official Grand mission/deployment-card geometry.

This yields `15 × 5 × 5 = 375` formally auditable map/mission/deployment
combinations and `75` distinct map/deployment geometry audits. All twenty maps
also receive a source-topology preview audit from both deployment anchors to
every control/contest zone.

## Rules-owned reachability

`official-competitive-map-spatial-reachability-v1` evaluates the authoritative
compiled terrain rectangles at a deterministic half-inch lattice. It does not
sample image pixels. For every current 32/40/50/80mm round base and the
40×100mm rectangular base it records:

- a legal witness on every assigned Entry Edge segment;
- complete-base collision clearance against Size 2+ movement blockers while
  treating grass as officially movement-passable;
- connectivity to the opposing Entry Edge;
- per-side/per-target reachability and route-length witnesses;
- which base profiles can reach a target and which cannot.

Mission targets use the official three-inch control distance and 32mm marker
footprint. A marker on standable high ground is not rejected merely because it
overlaps that terrain. The verifier requires a declared ground approach/access
point and enough platform area for the particular base. This distinction was
found by the first diagnostic run: Marker 5 legitimately occupied the central
Size 3 high ground on most deployments, while the initial conservative gate
incorrectly treated every overlap as an obstruction. The corrected rule lets
32/40/50mm bases use the access point and continues to record that larger bases
do not fit; at least one current legal base must reach every mandatory control
target from each side. In contrast, every current base must retain legal Entry
Edge access and opposing-side connectivity.

## Integration behavior

`official-competitive-map-mission-compatibility-v1` builds the complete
release matrix. `certifyAndFreezeOfficialCompetitiveMapForRoomV1` independently
reruns the selected room's audit before terrain certification and now freezes
the reachability artifact and hash into room version `1.1.0`. A failed Entry
Edge, disconnected battlefield, unreachable marker, or unreachable Quarter
blocks room creation with the first typed map/base/side/target failure. Display
art cannot override the result.

Grand Offensive entries remain selectable as topology/art previews but cannot
create formal task rooms until an official Grand geometry source is available.
No Standard or Skirmish geometry is silently stretched to fill that gap.

## Focused validation

The post-fix matrix command ran once and passed:

- `20/20` map topology audits;
- `75/75` exact map/deployment geometry audits;
- `375/375` current official map/mission/deployment combinations;
- `0` remaining topology or task-geometry failures;
- `5` Grand maps explicitly retained as preview-only for formal tasks.

No topology was changed just to satisfy a defective gate. The first-run
failure was corrected at the high-ground access semantic seam; the second run
proved that the current SC1 and SC2 compiled recipes are reachable under the
bounded contract. No match, Skill, Provider, browser, unrelated test suite or
source refresh ran.

## Slice handoff

This closes the mission-aware geometry sub-gate inside Slice 256. The Slice
remains open while the ten StarCraft II display assets and gallery contract are
completed. Cloud Kingdom's first visual candidate remains unpromoted because
its four-corner composition did not match the reviewed two-player diagonal
source topology.
