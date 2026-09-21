# K3 frontend guardrails v1 — postmortem-derived development standard

Ticket 26 · Slice 264 · 2026-09-21 · Owner: Kimi (profile `project-d-ui-lead`)

This standard codifies the concrete lessons from the Ticket 25 / Slice 262
threat-UI false-green review and the earlier K3 companion UI work. It is
binding for every K3 frontend sub-slice in this repository from this date.
Each rule names the defect pattern it prevents. "Must" is a hard gate;
violations are Critical/High review findings, not style notes.

## 1. Verify against current main, never a stale export

Defect prevented: a browser gate passes against an old `dist/` while the
source tree has moved on, so "green" evidence describes code nobody ships.

- A real-browser verifier must export the **current worktree's** web bundle
  whenever any frontend source is newer than the existing export, and must
  record whether it exported or reused, with mtimes.
- The formal server already rejects a missing or source-stale export before
  any Room or Provider work; local verifiers must apply the same freshness
  rule so local and formal evidence describe the same code.
- A screenshot or report whose bundle hash/mtime cannot be tied to the
  current source tree is not evidence.

## 2. Isolated-worktree versus integrated-main parity

Defect prevented: backend modules silently resolve to a different checkout
(legacy adapter inputs only resolve from the main checkout depth), so the
"unmodified backend" claim is unverifiable.

- When a fixture must instantiate backend modules from the integrated main
  checkout, the verifier must first hash-assert byte parity of every loaded
  backend module against the worktree and assert zero drift under
  `packages/` and `scripts/support/` versus the slice base commit.
- The main-checkout path, its HEAD, and every module hash go into the
  machine-readable report.
- Frontend code under test is always served from the **current worktree's**
  export; backend code is never edited to make a frontend gate pass.

## 3. Viewer-relative side labels

Defect prevented: "friendly"/"enemy" hard-coded to P1/P2 misleads any seat
that is not player1.

- Every side-dependent label must be computed relative to the viewer's
  projected seat (`viewerSideKey`), e.g. "P1 (friendly)" for the player1
  seat and "P1 (enemy)" for the player2 seat.
- Neutral copy ("Blue: P1") is acceptable only when it carries no
  friend/enemy claim.

## 4. Unknown is never zero

Defect prevented: a missing projection renders as "0 regions", "0% chance"
or an empty board, teaching the player a false fact.

- Absent, not-loaded, or incompatible projections render an explicit
  unknown/not-loaded state with guidance ("select a unit", "not exposed by
  the current client projection"), never a numeric zero.
- No probability, distance, region count, HP, budget or relationship value
  may be defaulted to 0 when its source is missing.

## 5. Real model coordinates and base geometry

Defect prevented: UI deriving positions, distances or hit areas from pixels,
screen size, or invented geometry.

- All board geometry (model bases, coordinates, threat regions, envelopes)
  comes verbatim from the viewer/workbench projections in milli-inches.
  Pixels are only ever a rendering target, never a source of truth.
- Fixtures may assign deterministic per-model coordinates to legacy
  unit-level sample data for rendering, and must say so in the report;
  fixtures never edit Rules.

## 6. Visible, hit-testable controls — not first duplicate locators

Defect prevented: a test clicks the first of several duplicate accessible
names (e.g. a panel chip and a board pill), passing while the user-facing
control is broken.

- Verifiers must locate the exact visible control the user is meant to use
  (role + exact name + scoping ancestor), assert it is visible, and assert
  with `elementFromPoint` that the intended element — not an overlay or a
  duplicate — receives the tap.
- Never `force: true` a click through a product defect. If a control is
  covered, the product is wrong; fix the product.

## 7. Real media paths

Defect prevented: portraits/art "verified" while their URLs 404 or fall back.

- Character and unit imagery must load through the real content-hash asset
  route; the journey asserts the image element actually loads (or asserts
  the honest fallback state when the channel is asset-free).
- A screenshot claiming a portrait must contain the decoded portrait, and
  the report maps each media claim to its served URL class.

## 8. Direct board interaction

Defect prevented: all selection flows going through side lists, leaving the
primary touch/mouse path on the board itself broken.

- At least one journey step must select a model by tapping/clicking the
  board glyph directly and confirm overlay glyphs are pointer-transparent
  (`pointer-events: none` on every overlay element).
- Board tap assertions use projected geometry plus hit-testing, never
  coordinate guesses.

## 9. Mobile safe areas and no overlay interception

Defect prevented: floating chrome (companion dock) spans the narrow viewport
and sits on top of battlefield controls; tests "scroll around it" and call
it green.

- Floating UI must shrink-wrap its collapsed state to a compact chip and
  bound its expanded state to the viewport (width/height/max offsets); it
  must never cover essential board controls in either state.
- On touch layouts the verifier asserts document-level horizontal overflow
  is zero (`scrollWidth <= viewportWidth + 1`) and that critical controls
  are reachable by a plain tap at their center — no force clicks, no
  test-only scrolling contortions.
- Mobile panes need intrinsic, non-overlapping structure: a desktop
  `flex: 1` must not leak into the column layout where it can shrink a pane
  below its content and overlap siblings.

## 10. Screenshot claim-to-pixel review

Defect prevented: the Slice 262 false green — a "battlefield visible"
assertion that accepted a negative `y` and a collapsed board pane.

- Every visibility claim must check **both** viewport bounds (`y >= 0` and
  `y + height <= viewportHeight` where full visibility is claimed) **and**
  a materially visible size (e.g. visible height >= 240px of the board), not
  just `y < threshold`.
- Each screenshot ships with a written explanation of what it proves; the
  reviewer must be able to find the claimed element in the pixels.
- A human screenshot review that rejects the report voids the green
  regardless of assertion counts.

## 11. No backend contract invention

Defect prevented: the UI fabricating persistence, relationship, memory or
multi-session capabilities the backend does not expose.

- If a required contract is absent from the client view, the UI renders an
  honest unavailable state naming the exact missing contract; the closure
  document lists it as a Codex-owned gap.
- No fake persistence in local UI state, no invented relationship values,
  no simulated memory layers, no mocked companion speech presented as real.
- Companion/agent surfaces never expose hidden chain-of-thought: only the
  safe projection fields (rawPromptExposed/rawProviderOutputExposed stay
  false).

## 12. Focused one-run gates

Defect prevented: full-suite reruns masking which change broke what, and
repeated runs gambling on flakiness.

- One changed area receives one relevant verification command, run at most
  once after the last relevant code change. A passed command is never
  rerun without a relevant code change.
- Already-passed evidence (e.g. a desktop journey) is reused byte-for-byte
  and hash-recorded instead of rerun.

## 13. Maximum three repair cycles

Defect prevented: unbounded fix–rerun loops that eventually "pass" by luck.

- A failed gate gets a repair of only the implicated path and at most one
  rerun; a non-converging loop stops after three rounds and reports the
  blocker instead of forcing a green.
- The closure document records every run: command, exit status, covered
  sub-slices, and why any rerun was justified.
