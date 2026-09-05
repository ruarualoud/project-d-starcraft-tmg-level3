# Ticket 17 — DSH offline Skill-generation Adapter roadmap

Date: 2026-09-04
Status: Slices 163–170 complete; Ticket 17 is 8/9; Slice171 remains
Project status: 15/22 Tickets complete; Ticket 14 physical-device acceptance remains deferred and unwaived
Source refresh: not performed

## 2026-09-05 execution amendment — takes precedence

Implementation closure: 170-B/C/D/E are implemented and the 20/20 chapter
pilot is complete. Engineering gates:18; supplementary-question assertions:87;
known-miss quarantine:9; Provider safety:40; legacy hold audit:9.
Raw DSH/direct drills:28/36 versus23/36; supplementary clarified questions:
35/36 each. A confirmed numeric-boundary reviewer miss is explicitly recorded;
both candidates remain quarantined. No causal DSH-benefit claim is made.
See [the results and costs](ticket-17-slice-170-production-results-2026-09-05.md).
See [the implementation record](ticket-17-slice-170-four-step-implementation-2026-09-05.md).
Legacy paid entrypoints below remain held. No full-game or publication claim
is inferred from mechanism drills or model semantic agreement.

Historical audit decision (superseded only by the reviewed new pilot above):
paid legacy Slice170 generation was paused after the end-to-end design audit.
Follow [the production/play/evolution redesign](skill-production-play-evolution-redesign-2026-09-05.md)
instead of retrying Attempt11. Slice170 now contains five work points:
170-A audit/hold (complete), 170-B real evidence and semantic/mechanics checks,
170-C durable checkpoints/accounting/bounded repair, 170-D actual DSH tool loop,
170-E bounded production-target pilot. These are not five new global Slices.
At that audit point Ticket17 was 7/9; scope increased by moving minimum production-critical
recovery/correction/evaluation from Ticket18 into Slice170.
The old Fact Judge proves reference binding only, Cross-Time does not execute
fixtures, and the blind score measures keywords rather than strategy quality.
Their prior checks remain historical engineering evidence, not quality proof.
User authorization for future production is retained, but cannot substitute
for readiness. No game-source refresh or new paid call occurred in this audit.

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
catalogue remains behind readiness, cost and priority gates; the user's later
standing authorization for Skill generation is retained, without repeated key entry.

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
| 167 | **Complete.** Install the exact DSH package in the isolated runtime and freeze profile, plugin lock, effective config and Session parser. | Exact `0.1.1-rc.2` npm/tag/commit; 35,962-entry runtime tree; 81 config rows; 78-package plugin lock; real five-event DSH Session; 23/23 focused; no Provider call. |
| 168 | **Complete.** Implement the common credential/Provider broker and the real DSH-off control executor. | Same arm-neutral prompt compiler/model/tools/budgets as DSH; one physical attempt per role; Ticket16 isolated Worker reuse; independently reconstructable input/output/cache/total-token and cost receipts; pre-egress notification for every crossed ¥100 tier; 33/33 deterministic checks. |
| 169 | **Complete.** Implement the real DSH executor, candidate tool bridge, Session redaction and RunReceipt. | Seven real DSH role Sessions plus one candidate-tool Session; seven bounded host Broker relays; hash-only safe transcript; complete usage/cost/lineage receipt; 19/19 crash/timeout/cardinality/secret/authority checks. |
| 170 | **Complete.** Bounded real DSH/direct pair with source/mechanics evaluation and durable correction. | 20/20 chapters, original metrics28/36 versus23/36, supplementary35/36 each; exact source-bound reviewer miss preserved; both candidates quarantined, not published. Detailed results and immutable recipes are linked above. |
| 171 | Run the predecessor→current adversarial aggregate and close Ticket 17. | Re-run Ticket16 closure and all Ticket17 gates; secret and authority audit; frozen handoff to Ticket18; no publication, Memory, self-play, MuZero or training truth. |

Slice 165 performs no model call. Its one candidate is a deterministic verifier
artifact accepted by an in-memory test port, remains unreviewed and
non-authoritative, and is not persisted in a production Skill registry. Slice
166 proves the disposable M1 isolation boundary. Slice 167 installs and runs
the exact pinned package inside it, composes a fail-closed 15-active /
66-disabled profile, freezes its 78-package plugin lock, and parses a real DSH
Session without a Provider call. Slice 168 adds one common credential-free
Provider broker, conservative ¥100-tier cost guard and the actual seven-role
DSH-off control arm. Slice 169 adds the real DSH executor: seven isolated Agent
and Session role runs, seven host-mediated Broker relays, one exactly-once
candidate tool run, redacted Session evidence and a complete hash-sealed
RunReceipt. Its deterministic verifier passes 19/19 with no external Provider
call. The measured local verification baseline is 337 seconds after caching
the already-verified immutable runtime manifest; repeated disposable directory
staging remains an explicit Slice 171 operational-efficiency gate. Slice 170 is
next: one bounded, paid DSH-on/direct-control pair under the same frozen job.

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
not a waiver of readiness. The user's standing generation authorization
does not bypass budget, source, quality or publication gates.

## Ticket 18 boundary

The 2026-09-05 amendment moved the minimum local SQLite checkpoints, usage
ledger, bounded correction and real semantic/mechanics evaluation into
Slice170. Ticket18 extends this working foundation into the multi-worker
SQLite/PostgreSQL Skill scheduler, independent held-out/arena evaluation,
administrator promotion, registry pointer CAS and rollback. It also delivers
the first five usable Skills. Earlier in-memory scheduler and promotion files
remain scaffold evidence; the new local pilot does not waive those gates.
