# Ticket 24 / Slice 258 and Ticket 23 / Slice 247 — Standard-2000 H-A closure

Date: 2026-09-17

Status: accepted. Ticket 24 is `8/8`; Ticket 23 advances to `33/36`.

## Authoritative outcome

The same Room was recovered rather than restarted. The stable private control
receipt was accepted at fence 14, the previously committed revision 129 was
appended exactly once, and the Web journey continued to a Rules-terminal game.

- Room: `ticket24-slice258-ha-map-20260916085936321`
- scale: Standard, 54×36 inches
- armies: `2000/2000` Minerals, `115/140` Vespene
- board: Lost Temple, 15 Units, 9 authoritative terrain pieces
- executable product denominator: `252 exact / 0 pending`
- terminal: round 5, Hold Position `mission_hold_position_special_lead_10_plus`
- result: player2 / Zerg wins `12–0`
- accepted actions: 137 (`68` human/Host and `69` Agent)
- screenshots: 181; every observed Apply has its action screenshot
- every Agent Apply replayed equal to the current authority state
- browser console/page errors: `0/0`
- Critical/High findings: `0`
- source refresh: false
- training truth: false

The typed-control recovery failure was a harness false negative, not a Room
mutation failure. React Native Web exposed the valid visible machine receipt as
`control-claim-receipt status=claimed fence=13 session=438e5756622b`, while the
old parser required the string to begin directly with `status=`. The corrected
parser uses the stable test ID, accepts the explicit versioned prefix, and still
requires a positive fence plus a 12-hex session-binding hash. The accepted run
then obtained the next private fence and continued without replaying a game
transition twice.

## Agent decision evidence and cost

The completed run used `deepseek-flash` through the live opponent route:

- Provider calls: `419`
- input units: `22,612,764`
- output units: `969,333`
- total units: `23,582,097`
- estimated cost: `CNY 36.496241`
- H-A budget: `CNY 80`
- recorded completed baseline: `CNY 63.543093`
- delta from that baseline: `-CNY 27.046852`

Late-round actions 131 and 134 demonstrate the planner-led path rather than a
single prompt guess. The Agent inspected the tactical relationship graph,
compared current finite and parameterized candidates, retained the overall
plan and opponent responses, cited the three frozen Skills, disclosed unknown
threat/fire-zone queries, selected Pass, and recorded a public purpose, risk
and replan conditions. Hidden chain-of-thought was neither requested nor
stored.

No late-round action naturally selected a formation-bearing candidate, so this
terminal match does not close Ticket 25 / Slice 262's post-change natural
formation canary. That canary remains open for the independent A-A match.

## Dice and screenshot evidence

The public action projection omitted a dedicated Chance field, but the
encrypted private accepted-transition journal retained the authoritative
reveal bundles. The reusable evidence exporter binds all 137 private receipts
one-to-one with the public action report before exporting only non-secret
evidence:

- action 32 initiative: player1 `2D6 = 4 + 4`; player2 `2D6 = 1 + 4`;
- action 57 Raptor Charge: `1D6 = 1`;
- both retain ticket-bundle hash, commitment, state/proposal binding, RNG scheme,
  HMAC outcome proof and the long-term Ed25519 Apply-receipt relationship.

Machine-readable evidence:

- `build/ticket-24-slice-258-standard-2000-ha-map-v1/20260916085936321/report.json`
- `build/ticket-24-slice-258-standard-2000-ha-map-v1/20260916085936321/actions.ndjson`
- `build/ticket-24-slice-258-standard-2000-ha-map-v1/20260916085936321/evidence-pdf/chance-evidence.ndjson`
- `build/ticket-24-slice-258-standard-2000-ha-map-v1/20260916085936321/evidence-pdf/evidence-manifest.json`

Human-readable evidence:

- master index: `ticket23-slice247-human-agent-master.pdf`, SHA-256
  `19f18c443ab3ac58e61076ce4c678a554d79e0436bda57257573a96fa8205e42`;
- round 1 actions 1–31: `082d7f63485ab2089e1fade21f95f93fe26b3e452712e3d1ea8955843c675b93`;
- round 2 actions 32–80: `d454e2e883ab884770f9ac8963007ae15fc862cc2f5262c64acef66b18cf13a3`;
- round 3 actions 81–103: `8cceb56a3d79dfe0155dccf76ef74428d0603c1cd134ce94a486311a9d4ae8de`;
- round 4 actions 104–121: `c7f676a5e595105525519662eb879ebe18b477e608c1101c1040205fb7bc5163`;
- round 5 actions 122–137: `557759b1df78e667fe283cd0bec8f3408195233f206ea78e04f4fdf75bf1951b`.

Long public strategy summaries may continue onto another PDF page; the evidence
manifest, not PDF page count, proves the exact 137-action denominator. Visual
inspection confirmed the master index and round-2 action-32 dice page render
correctly.

## Non-blocking findings

Only Medium findings remain:

1. historical format/contract/recovery warnings remain preserved in the full
   report rather than being erased after recovery;
2. `action_specific_threat` and `fire_zone_exchange` were unknown in some late
   decisions, so the Agent correctly labelled those claims advisory;
3. action 131's public plan simultaneously treated the Raptor as having on-board
   relationship evidence and as an off-table reserve. It did not change the
   independently supported Pass result, but the lifecycle projection must be
   normalized before it can guide future Charge/formation strategy.

Only Critical/High blocks integration. These Medium items carry into Ticket 25
and the independent A-A/review work; they do not invalidate this completed H-A
match.

## Harness trace summary

- `harnessLoopUsed`: true
- `targetGames`: StarCraft TMG
- `promptPackRoutes`: live opponent planner/action
- `harnessToolsCalled`: room projection, LegalSpace, tactical relationships,
  formation solver where applicable, Preview, Apply, Replay, memory journal
- `uiTraceEvidence`: 181 screenshots and six PDF artifacts
- `agentDecisionEvidence`: 69 public decision records with Skill/evidence refs
- `memoryTraceEvidence`: persistent SQLite match memory and plan revisions
- `trainingTraceCandidates`: none; this evidence remains ineligible
- `rollbackOrDemotionRules`: Critical/High blocks; Replay mismatch or receipt
  mismatch demotes; Medium findings remain tracked
- `userVisibleChecks`: terminal board, every Apply screenshot, final score,
  typed control receipt, dice pages, public strategy and cost

