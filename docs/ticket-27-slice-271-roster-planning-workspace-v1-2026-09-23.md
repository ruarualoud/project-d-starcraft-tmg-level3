# Ticket 27 / Slice 271 — Roster-planning workspace v1

> 2026-09-24 correction: the acceptance claim below is historical and does
> **not** close S271. The retained paid draft has a 5-unit structured plan
> and a Rules-legal 4-unit working roster while `planEvidenceStale=false`;
> its revised prose mentions the trim without rebinding the roster. This is
> a High plan/list mismatch, not a valid post-edit plan. The Codex integration
> branch now detects it, forbids prose-only rebind, and offers a fresh
> locked-roster Teach route. A focused zero-Provider regression passed, but
> fresh live Teach generation, product Web UI verification and the normal
> server's secure live deliberation hookup remain open. See
> `docs/ticket-27-slice-271-teach-workspace-integration-v1-2026-09-24.md`.

Date: 2026-09-23. Status: **acceptance complete.** The army-tab
roster-planning workspace is delivered with real Flash (BYOK) evidence: one
actual generated Rules-legal Standard-2000 roster plus a public, versioned
`RosterPlan` (v2 after an explicit paid revision), driven entirely through
the real Web UI and the macOS Keychain → isolated egress Worker secure lane.
The final browser-acceptance defect class — the disconnected state never
rendering, surfaced as a `locator.waitFor` timeout on
`roster-workspace-disconnected` — is root-caused and repaired (`271.5`), and
the repaired behavior is proven by a zero-call closure gate over the
retained paid session: **22/22 checks passed, 0 new Provider calls, ¥0**,
16 new screenshots. No Critical/High finding remains open.
Slice manifest: `.agent-runtime/slice.json`
(`ticket-27-slice-271-roster-planning-workspace`, base `1ee509f`).
Roadmap: `docs/ticket-27-slices-267-272-roster-strategist-roadmap-v1-2026-09-21.md`.

## What the workspace delivers

- Army-tab entry points (`智能规划`) alongside the untouched manual builder;
  the manual builder journey is re-proven in every acceptance run.
- Planning sessions against the isolated workspace service: setup (own/
  opponent faction constrained by available Skill routes, frozen mission/map
  provenance, opponent-information boundary) → asynchronous multi-round
  generation (strategy foundation → candidate proposals → comparison/
  selection) with a visible round timeline → plan overview (mission-grounded
  VP schedule, budget/loss intent, deployment concept) → candidate compare
  with real Rules verdicts → tool evidence/provenance/redacted cost →
  manual override with authoritative Builder re-verdict and stale-evidence
  banner → explicit paid revision → persisted reload resume → secret-free
  export/import round-trip.
- The generated plan is explicitly distinguished from the fixed preset
  roster: `presetRoster: false`, `planFabricated: false`,
  `hiddenChainOfThoughtIncluded: false`; the preset comparison carries
  `planStatus = no_pregame_plan`.
- Honest terminal states: typed `unavailable` (no secure lane) and
  `disconnected` (origin does not speak the workspace JSON protocol), each
  with an explicit user-facing card and recovery action.

## Live evidence ledger (retained, never overwritten)

Run 3 (`build/ticket-27-slice-271-roster-workspace-v1/`) is the retained
paid generation: **4 physical calls / 59,810 reported units**, zero
automatic retries, DeepSeek flash only, strict output contract set v1.4.0,
raw payloads never persisted. It produced:

- one Rules-**legal** selected candidate
  (`terran_hold_position_balanced_marker_control`) and three further
  candidates with real verdicts (one illegal with the actual Rules error
  code `ARMY_SLOT_CAPACITY_EXCEEDED`);
- plan v1 → explicit manual override (unit removed; Builder re-verdict;
  stale banner) → paid revision → plan v2 with the revision event in
  history and stale cleared; Rules kernel confirmed 1,100/2,000 minerals
  for the trimmed working list;
- a public auditable `RosterPlan`: mission-grounded score route (Hold
  Position, sealed marker-affinity VP schedule, 10-VP terminal lead),
  declared loss/resource budget with unspent-resource disposition,
  per-component purposes (unit and card selection rationale), deployment
  concept, opponent archetype hypotheses with confidence, counter
  responses, invalidation triggers, candidate comparison bases and typed
  tool receipt references (unknown never zero);
- 19/20 journey checks passed, including zero-call retained-reply replay
  resume (byte-identical plan hash), export/import round-trip with
  fail-closed secret probe, mobile 390px with no horizontal overflow, and
  the explicit unavailable state.

## The disconnected defect: environment root cause and repair (271.5)

Three acceptance rounds failed before closure; each failure class was
repaired generally, not patched at the call site.

1. **Run 1 — `S271_PLANNING_FAILED`.** The generation round failed; the
   harness reported only the terminal status. Repair (committed `70a4168`):
   failure evidence carries the exact stage, nested workspace reason and
   transport cause, and `resourceUtilization` binds to the comparison round.
2. **Run 2 — `S271_HTTP_TRANSPORT_FAILURE:initial_generate`
   (`ECONNRESET`).** Root cause: synchronous Rules evaluation between paid
   rounds blocks the workspace server's event loop far beyond its 5-second
   keep-alive idle timeout; the harness's pooled socket was reused after the
   server had begun closing it — a measured client-side race, not a Provider
   or service crash. Repair (committed `3252d5d`): every poll/request uses a
   fresh socket (`connection: close`), and the harness settles the
   acceptance session before detaching the credential Worker. Transport
   failures now stop deterministically with stage/method/route/cause —
   never blindly retried, never hung.
3. **Run 3 — disconnected-state wait timeout.** Root cause chain across the
   browser state machine and the harness lifecycle:
   - The disconnected journey serves the exported static app from a
     static-only origin (no workspace API mounted). That origin answers
     HTTP 200 with `index.html` for the API route, so `response.json()`
     throws. The client classified a non-JSON answer as the typed
     `ROSTER_WORKSPACE_RESPONSE_INVALID` error state instead of
     `disconnected`, so the `roster-workspace-disconnected` card never
     rendered and the 60-second `waitFor` timed out — indistinguishable
     from a hang. Repair: an origin that answers without speaking the
     workspace JSON protocol **is** the honest disconnected state
     (`RosterPlanningClientError('disconnected', …)`), so the card renders
     with its reconnect action and the state is machine-decidable.
   - The same-session retry guarantee is service-side and was audited, not
     assumed: a `failed` session keeps its retained replies and can be
     resumed explicitly (`generate {resume:true}`, live or zero-call
     replay); a session with zero retained replies fails closed with
     `ROSTER_WORKSPACE_RESUME_OUTPUT_MISSING`. No manual restart is ever
     required; a process restart marks an in-flight run `failed` honestly
     and its retained replies still allow replay resume.
   - The first closure attempt failed with
     `S271_TICKET20_ENTRY_MISSING`: the ticket-20 host server's demo
     fixture and learning console resolve hash-locked frozen reference
     artifacts (source-intake cache et al.) relative to the server root,
     which lives in the integration checkout and is gitignored — absent
     from a fresh worktree, so server startup died before any check.
     Repair: `TICKET27_S271_FIXTURE_ROOT` points the read-only frozen
     inputs at the integration checkout while all mutable state stays in
     the worktree.

### Closure verification (the one gate for this change)

`node scripts/verify-ticket-27-slice-271-roster-workspace-browser-v1.mjs --replay-retained-authorized`
runs the workspace server with **no** deliberation factory and copies the
retained run-3 drafts (originals preserved read-only). It proves, at 0 new
Provider calls and ¥0: retained session list with the honest
实时规划不可用 banner; retained plan/candidates/evidence/cost rendering;
zero-call replay resume with every round marked ⟲ replayed and a matching
plan hash; manual override → Builder verdict → stale; explicit zero-call
restoration to the exact plan candidate through the shared
`deriveRosterWorkspaceCandidateInputV1` mapping (stale cleared); retained
v2 revision history; reload resume; export/import round-trip plus the
fail-closed secret probe; mobile 390px; the explicit unavailable state; and
the repaired **disconnected** state. Result: **22/22 checks passed**, 16
screenshots, `rawCredentialPersisted: false`, `trainingTruth: false`,
credential detach `not_applicable_no_credential_attached`. Output:
`build/ticket-27-slice-271-roster-workspace-closure-v1/` (gitignored).

## Frozen sub-slices

| Sub-slice | Deliverable | Commit |
| --- | --- | --- |
| 271.1 | Isolated roster-planning workspace service (sessions, generation orchestration, retained-reply replay resume, manual override with Builder re-verdict, revision, export/import with fail-closed secret hygiene, persisted drafts); replay resume compares against the generation-time plan hash | `eed758f`, `53c2bfa` |
| 271.2 | Product composition and additive same-origin server mounting (no Room mutation route exists) | `7c3206f` |
| 271.3 | Army-tab roster-planning workspace UI (sessions, setup, progress, plan, candidates, evidence, working list, revisions, export; unavailable/disconnected states; 390px) | `c26cfdb` |
| 271.4 | Manifest secure browser/live Flash acceptance runner; comparison-round `resourceUtilization` binding and precise failure evidence; keep-alive poll race eliminated, settle-before-detach | `1a5b3da`, `70a4168`, `3252d5d` |
| 271.5 | Disconnected-state repair (non-JSON origin = disconnected), read-only fixture root for fresh-worktree server startup, shared candidate-input derivation, zero-call replay-retained closure gate, this report | this change set |

## Remaining honest gaps (nonblocking)

- Strategic quality of the generated list is review evidence, not a
  gate claim: the revised working list spent 1,100/2,000 minerals with an
  explicit unspent-resource disposition. Legality is Rules-kernel proven;
  match-play quality belongs to Slice 272 paired comparison.
- The disconnected state is decidable and recoverable through the UI
  reconnect action; automatic in-session reconnection of a live generation
  mid-round remains an explicit resume, by design (no automatic paid
  retry).
- `trainingTruth: false` everywhere; no trace or export is promoted without
  the independent player-view/leakage/lineage/replay/promotion gates.
