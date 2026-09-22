# T27 / S271 — K3 roster-planning workspace

## Deliverable and inputs

Ship the S271 workspace in the existing army tab, preserving all manual Builder
features. Read the S267–272 roadmap and S269–270 closure report, especially the
latest recovery: the real selected list is legal **1430/2000** with 570 Minerals
unspent. Three other candidates are illegal. Present that honestly; legality
does not certify list quality. S272 full paired games remain separate.

Use the integrated `packages/roster-strategist/` contracts, Rules-owned Builder
port, planner and isolated scene laboratory. General/faction/matchup Skills and
mission/map/source/model provenance are real frozen inputs, not replacement
strategy prose in the UI. Plan text is public rationale, not private reasoning.
`CURRENT_WORK.md` identifies the independent live T23 match: leave it running.

## Work sequence and completion criteria

1. Identify the existing army tab, client-domain and secure Provider seams.
   Implement a new isolated workspace service with injected existing ports and
   a thin product composition entry. Changes to the existing human-agent server
   are limited to additive mounting/wiring. Existing API responses remain
   unchanged. Completion: an actual browser request reaches the integrated
   Strategist/Builder/laboratory, with source Room mutation impossible.
2. Implement Chinese-first, bilingual Web/App interaction, visually consistent
   with the current blue/cyan StarCraft product. Include mission/faction and
   opponent-information setup, explicit generate/revise actions, asynchronous
   progress and error state, plan timeline, candidate cost/component diff,
   Rules errors, win/score route, component purposes, predicted counters,
   query/simulation evidence, provenance and cost. Empty, disconnected and
   unavailable states are explicit. Completion: meaningful controls work, not
   just populated labels; original manual construction still works.
3. Add manual override and resumable drafts. Manual edits invoke the authoritative
   Builder port, mark previous plan evidence stale until explicitly revised,
   and retain comparison/history. Export/import round-trips the actual list and
   attached plan without secrets. Cancellation or uncertain paid dispatch must
   not send duplicates; retained completed replies allow local resume.
4. Exercise one real initial Flash plan and one requested revision through the
   Web UI, using the existing secure Worker and Keychain ingress functions.
   The exact authorized wrapper is the manifest's browser verifier. It may
   attach the key in memory via existing ingress but never show it to you or
   write/log it. No raw `security` command, env dump or credential file reading.
   Capture redacted requests/receipts, calls, input/output units, estimated cost,
   detach and zero credential persistence. Hard maximum 12 physical calls is an
   acceptance safety bound, not a per-decision strategy/token limit. No Pro
   fallback or automatic paid retry. Stop on auth, exhausted credits, ambiguous
   dispatch or absent attachment. A legal weaker list is evidence, not grounds
   for regeneration. Do not change strategy Skills or frozen data to improve it.
5. Capture real desktop and 390px journeys with screenshots for every claim:
   entry/manual builder, running, actual plan, legal/illegal candidate compare,
   manual edit and invalidation, revision, persisted reload, export and honest
   disconnected/error state. Check safe areas, clipping, touch and scroll,
   including coexistence with the current companion surface. Stubs can test
   error states but must be labelled; they cannot prove a real model reply.

Completion requires a scoped commit, Markdown report with embedded relative
screenshots, machine-readable acceptance receipt and explicit remaining gaps.
Report full-scale budget versus actual spend; underfilled is not 2000 points.
Every implemented UI claim needs direct evidence. Keep `trainingTruth:false`.

## Isolation and verification

Use only manifest paths. Keep adapters in the new package; do not edit
`packages/roster-strategist/`, Rules, online decision port, secure Provider
infrastructure, frozen Skill/data content, T23 runner/server, map or companion
modules. A missing capability at those seams is reported with exact evidence,
not silently replaced by a second authority. No dependencies need installing;
reuse existing local dependencies. Read-only frozen artifacts may be loaded
from the integration checkout via an explicit fixture root; all new outputs
belong in this worktree. Never read `runner-private.json`, live databases,
credential files or other native tasks' session secrets.

Run doctor once. The manifest browser journey is explicitly authorized product
acceptance, not permission for a broad test suite. Build only the changed Web
bundle once after its final relevant edits. New unit tests require a concrete
bug and a red reproduction first. A passed command is reused, not rerun; stop
the same failing repair/review loop after three rounds. Do not re-run old
S267–270 gates or launch S272 games. Local commits only; no remote state.
