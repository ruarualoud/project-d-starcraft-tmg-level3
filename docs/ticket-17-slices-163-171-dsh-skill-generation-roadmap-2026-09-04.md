# Ticket 17 — DSH offline Skill-generation Adapter roadmap

Date: 2026-09-04
Status: Slices 163–166 complete; Ticket 17 is 4/9
Project status: 15/22 Tickets complete; Ticket 14 physical-device acceptance remains deferred and unwaived
Source refresh: not performed

## Outcome required

Ticket 17 must run the official, integrity-pinned DeepSeek Harness only as an
offline candidate-Skill execution arm and compare it with a DSH-off direct
Provider control under the same source, model, prompt, tool and budget
contract. It must produce a real DSH Session-derived safe receipt and one
bounded paired candidate-generation result. It does not publish a Skill, write
Memory, operate a room, change Rules or create training truth.

The four Skill families are `how_to_play`, `mission`, `faction` and `matchup`.
Their job counts are derived from the current official registries and can grow
with versioned data; they are not capped by a handwritten small number. This
Ticket proves one bounded `how_to_play` pair. Producing the full four-family
catalogue remains behind the user's separate large-scale-production approval.

## Source and version freeze

Development consumes the already-frozen current source chain and does not
refresh it:

- Command Center versions: `71/69/48`;
- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`;
- source snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`;
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`;
- current FAQ V1.0 lock: `2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226`;
- current Rules catalogue/runtime/graph:
  `c2ed9b51...aab208f` / `82d436a6...dbb6fd` /
  `ac3b6d55...1659a`.

Historical rules remain readable and replayable but cannot seed a current
candidate. A later source refresh requires an explicit user command and a new
Skill impact/rebase round.

The audited runtime remains exactly
`@deepseek-ai/dsh@0.1.1-rc.2`, Git commit
`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`, npm integrity
`sha512-UP1UIh6q3Gme/yXRn/QL2P8IsVlv8Shpg22TRJIZPsCRWLm4CBiA1MUvXmJAfsOEETBMLAl+xWPtFw6ICsN3wg==`.
At the 2026-09-04 audit this is still npm's `latest`; `0.1.2-rc.1` is only
`next`. Execution never resolves a floating dist-tag.

## Existing-code and MTL audit

The existing `packages/skill-generation` files correctly establish sealed
Job, Candidate and RunReceipt shapes, paired DSH/control identities, one
`emit_candidate_skill` submission and default-false authority. Their verifier
uses injected fake executors and an unreviewed legacy data pack. DSH is not
installed, no Session log exists, no real Provider pair has run, and the
in-memory scheduler/promotion module is only a Ticket 18 scaffold. Slice 163
freezes those exact files and does not relabel them.

The requested MTL branch was inspected at
`codex/mtl-character-agent-repair@50ef5c29c655c015335d76e78fb4a0ecb442252f`.
StarCraft adopts its Teach/Ctx2Skill role separation, exact source bindings,
Challenger→Reasoner→Judge→Proposer→Generator→Cross-Time structure, revision
targets and content-addressed candidate artifacts. It does not copy the MTL
transport that inherits the entire environment, passes a raw key through the
DSH environment, disables Session persistence, treats stdout as the sole
submission, reports usage as unavailable zeroes and lacks OS network/process
containment.

## Fixed slices

| Slice | Scope | Closure evidence |
| --- | --- | --- |
| 163 | **Complete.** Freeze the audited source/runtime/MTL boundary and the nine-Slice denominator. | Hash-sealed boundary; exact current source and six scaffold file hashes; exact MTL commit/file hashes; DSH registry/integrity snapshot; 15 focused checks; no install, model call or candidate. |
| 164 | **Complete.** Build the minimal current-official staged-evidence pack and registry-driven four-family curriculum/question-tree denominator. | 83 source records + 1,163 current RuleAtoms; 1,215 tasks / 1,101 eligible / 114 visible-blocked; 1,220 tree nodes; complete 6×6 directed archetype matchups; content/locator/current-Rules hashes; 15/15 focused and full predecessor aggregate pass. |
| 165 | **Complete.** Implement the Teach + Ctx2Skill role graph and the unique typed candidate-emission contract. | Nine hash-sealed role receipts; seven bounded model-role ports plus independent Fact Judge/Cross-Time gates; explicit failure→revision→superseding-claim lineage; consumer reconstruction; exactly-one post-gate candidate tool; 20/20 focused and full predecessor aggregate pass. |
| 166 | **Complete.** Implement disposable OS isolation and the capability firewall. | A content-bound macOS M1 backend behaviorally denies host/repository/Room/Rules/Skill reads, outside writes, unapproved process creation and direct loopback network; staged result/cleanup/tamper gates pass 17/17, with no unsandboxed fallback. |
| 167 | Install the exact DSH package in the isolated runtime and freeze profile, plugin lock, effective config and Session parser. | Tarball integrity and commit/tag match; lifecycle smoke; config dump and append-only Session events are parsed; no Provider call. |
| 168 | Implement the common credential/Provider broker and the real DSH-off control executor. | Same model/prompt/tools/budgets as DSH; one physical attempt per role; Ticket16-grade secret handling, input/output/cache/total-token and cost receipts; cumulative CNY forecast notifications before every crossed ¥100 tier; deterministic no-retry Provider tests. |
| 169 | Implement the real DSH executor, candidate tool bridge, Session redaction and RunReceipt. | DSH process uses only staged reads plus exactly one candidate emission; safe event/usage/tool/config evidence; crash/timeout/cardinality/secret/authority adversarial gates. |
| 170 | Run one bounded real DSH-on/direct-control pair and blind quality evaluation. | One frozen `how_to_play` task, same Provider/model/input/tool/budget, one candidate per arm, actual Session/usage/cost receipts and predeclared blind metrics; both remain unreviewed. |
| 171 | Run the predecessor→current adversarial aggregate and close Ticket 17. | Re-run Ticket16 closure and all Ticket17 gates; secret and authority audit; frozen handoff to Ticket18; no publication, Memory, self-play, MuZero or training truth. |

Slice 165 performs no model call. Its one candidate is a deterministic verifier
artifact accepted by an in-memory test port, remains unreviewed and
non-authoritative, and is not persisted in a production Skill registry. Slice
166 proves the disposable M1 isolation boundary without installing or running
DSH. Slice 167 is next: stage the exact pinned package, profile, plugin lock and
Session parser inside that boundary without a Provider call.

## Isolation and Provider boundary

The local host currently has the Docker CLI but no active Docker daemon; it
also has macOS `sandbox-exec`. This observation does not authorize a run.
Slice 166 proves an OS-enforced disposable macOS M1 runner behaviorally. If the
content-bound backend or its hostile read/write/process/network probes fail,
DSH execution fails closed—there is no ordinary child-process fallback.
Because Apple deprecates `sandbox-exec`, Ticket 21 must replace this development
backend with a disposable container/microVM for production while preserving the
same behavioral gates.

The DSH process will not receive online Agent, Room, Rules mutation, Skill
registry, Memory, MuZero or training capabilities. It also cannot reuse the
detached Ticket16 credential. Slice 170 accepts a fresh credential only through
a local secure ingress and emits no raw Prompt, response, reasoning or secret
into committed evidence.

Every real paid arm reports input, output, cache-hit/cache-miss and total token
counts, plus estimated and Provider-reported cost where available. Slice 168
must pin the pricing and USD/CNY conversion evidence used for forecasts and
emit a user notification before cumulative estimated spend crosses each
`¥100` tier (`¥100`, `¥200`, and so on). This is an observability threshold,
not hidden permission for large-scale generation; full production still needs
the separate approval above.

## Ticket 18 boundary

Ticket 18, not Ticket 17, owns the durable SQLite/PostgreSQL Skill scheduler,
leases/fencing/WAL recovery, multi-round correction and stopping policy,
independent Fact/Semantic/Held-out/Cross-Time/A-B gates, administrator
promotion, registry pointer CAS and rollback. The existing in-memory scheduler
and promotion files remain scaffold evidence until that work is completed.
