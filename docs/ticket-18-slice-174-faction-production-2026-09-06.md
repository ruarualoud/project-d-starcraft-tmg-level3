# Ticket18 / Slice174 — two source-bound faction strategy Skills

Status: active; complete input/role/continuation gates passed and actual
DSH-backed faction production started. No faction candidate accepted yet.
Project16/22; Ticket18 2/8 complete,6 remaining. Overall offline dependency1/5;
formal/runtime first-five acceptance0/5. No source refresh or Codex subagents.

## Current checkpoint: distinguish direct citations from claimed indirect relationships

`faction-v1-c89720ec563c3f2ecc1f` is terminal, handle56915 exit1. It reused
the saved target reviews, then generated supportive items6/7 and adversarial
items0/1. The latter correctly identified both targets but its coverage row
listed `[0,1]`: item0 directly cites the faction card; its reason explicitly
described item1 as an indirect dependency without a direct citation. Strict
direct-only index validation rejected the entire review; schema feedback again
returned an identical result. Run3 calls /808,102 tokens /estimated ¥0.578353;
all-history46,856,542 known tokens /estimated-or-reserved ¥51.940615, no402.
Report `bc46cfb09676e561b54060597bc6e387396cf6b57d399b2f1ef93b04bb638a35`.

The real response reproduced a red test. Coverage now preserves every original
index/reason/verdict while a host receipt separates `directCitationIndices`
from `indirectClaimedIndices`. A covered row still requires at least one actual
direct citation; indirect-only positives and nonexistent indices fail. A
negative indirect relationship is retained as a recommendation issue, not
dropped. Negative coverage of a source already represented in the draft edits
the affected existing advice; only a genuinely missing source requires an
addition. This avoids demanding a ninth item merely because an existing cited
item needs correction. No model's relationship assertion becomes rule truth.

The mandatory six known source failures remain independent of these model
reviews. Related gates passed: workflow41, actual-correction22, mixed-evidence10,
unchanged continuation20 and two actual DSH full-context capacity sessions,
all with zero Provider calls. No next paid process has started. Current
source-reviewed sections0/15 and faction candidates0/2, Ticket18 2/8,
project16/22, formal/runtime first-five0/5.

## Earlier checkpoint: preserve mixed source/target evidence without misattribution

Code `2518343` was pushed. Actual run `faction-v1-bcba77c39b85d99b5dbd`
reused all eight recommendations and applied the one calibrated cost correction.
The first two target-bound review batches completed. The third returned correct
target IDs/titles, several exact target quotes, and exact English source quotes
under candidate field paths; one verdict also provided four focus rows rather
than the requested maximum three. The validator rejected it and the schema
repair returned byte-identical output, stopping with
`FACTION_SCHEMA_REPAIR_NO_PROGRESS`. No completed dual review or local model
repair round was accepted. Some positive judgments still missed the independently
recorded Core/reaction errors; those findings remain mandatory blockers.

A real red/green ten-check regression now preserves this response without
rewriting its judgments. Up to sixteen focus rows are bounded and retained.
Every verdict still needs an exact host target ID/title and at least one exact
quote from that target's specified field. A non-target quote is accepted ONLY
when it exactly occurs in a declared, target-cited frozen original source
passage; it is labelled `source_quote_not_target_quote`, not falsely labelled
as candidate text. Wrong-neighbour, undeclared-source, invented, source-only
and excessive-count controls fail. This is evidence typing, not semantic proof.

Run4 calls /1,067,038 tokens /estimated ¥0.606799. Authoritative all-history
total46,048,440 known tokens /estimated-or-reserved ¥51.362262, no402. Report
`61c5c604528864fa6fc74989cc99d8e33af7b7692bbd9ad54e29789e6c17a667`.
Handle72583 is terminal exit1. Do not restart it unchanged. Updated related
gates passed: mixed-evidence10, actual-correction22, workflow34, continuation20,
and two actual DSH full-context injected-response sessions. The next continuation
will reuse paid raw review output and retype its evidence under the new validator;
it will not inherit a completed source-review or quality verdict.
Source-reviewed sections0/15, faction candidates0/2; Ticket18 2/8, project16/22,
formal/runtime five-piece acceptance0/5.

### Independent consumer evaluation prepared, not yet run with a real model

`faction-roster-use-evaluation-v1.mjs` compares two fresh contexts per faction:
complete overall Skill/guide alone versus the same overall plus every section
of the faction Skill. It exposes no production dialogue, model review verdicts,
original source context, kernel outputs or expected answers. The four declared
card-package questions for each faction are graded by the calibrated Rules
drills (one known cost diagnostic and seven independent inputs across both).
All legal alternatives and tied cheapest packages must be returned. Exact
requests, Provider receipt hashes, old negative results and checkpoint reuse
are retained. Source-failed/drifted/known-bad candidates cannot enter this test.

Twelve engineering checks passed with eight injected model responses and zero
Provider calls, including negative scores, duplicate answers, forbidden tools,
source/candidate drift and known-error rejection. No actual faction Skill has
yet been evaluated by this module. It has no paid launcher yet and cannot
publish or promote anything. A positive paired result will only establish this
bounded roster-decision behavior, not statistical strategy gains or Room play.

## Earlier checkpoint: explicit targets, empty-patch recovery, calibrated fact correction

The three observed defects now have production-path changes, not just a report:

- Review tasks end with host-created target IDs, full titles, exact advice
  hashes/text/field paths and the same frozen original cited passages. The
  Provider must quote a field of each intended target; the host resolves its
  index. Actual shifted outputs and wrong-neighbour quotes are rejected. All
  global sources, the overall Skill and whole section remain in every call.
  Correct identity/quotes still do not prove semantic judgment correctness.
- A genuinely empty patch is classified before denominator validation and
  enters the same bounded source-first no-progress recovery as an unchanged
  replacement. Other complete recommendations remain visible; rejected target
  prose is omitted only for that reconstruction. No partial aggregate applies.
- The known Factory-is-cheapest sentence is corrected in one exact field using
  recomputed source-bound Rules cost/slot evidence, with the missing Armory
  citation added. This is explicitly host-rendered factual correction, NOT a
  model-authored strategy or a proof that cheaper wins games. Unflagged fields
  and original Provider artifacts remain unchanged. Reintroducing that exact
  known failure blocks production acceptance; unknown paraphrases still require
  independent evaluation. Fresh dual source review is required.
- Independent full-draft reading found six further exact source counterexamples
  across four advice items: Marauder Core-gap arithmetic, nested Academy/Life
  Support reactions, two incorrect Active REPEATABLE restrictions, Indomitable
  friendly targeting, and Target Lock's omitted Movement/12-inch condition.
  They enter the actual typed issue journal with exact flagged fields and
  frozen original source evidence even when both model readers say supported.
  The model must repair those recommendations; the host does not write their
  replacement strategy. Original issue history is retained and unchanged known
  failures veto acceptance. This is a known-error regression set, not held-out
  strategy evaluation or a complete detector for arbitrary paraphrases.

The paid runner recomputes the kernel finding before Keychain/egress and binds
the resulting policy hashes into its recipe. An explicit tested continuation
migration admits only these corrective modules and validated actual-sample
evidence. Sources, full inputs, model, budgets, ancestor accounting and original
start time do not change. Numeric-only old source reviews are not inherited as
accepted new target-bound reviews. Exact-input raw generation roles remain reusable.

Actual-failure regression22/22, continuation20/20 and complete-workflow34/34
pass with zero Provider calls. Two actual DSH sessions with injected HTTPS
responses transported the full sources/overall Skill/eight-item draft/largest
review pair plus all known source-repair evidence: wire bodies1,029,954 and
1,049,171 bytes, within both enforced model-input and transport limits.
This is transport/mechanism evidence, not model strategy quality. Live
continuation has NOT started yet. Authoritative paid terminal
remains `faction-v1-c6b855593093fd3f6ecb`, cumulative44,981,402 known tokens /
estimated-or-reserved ¥50.755463, no402. Source-reviewed sections0/15, qualified
faction candidates0/2; Ticket18 2/8, project16/22, formal/runtime first-five0/5.

## Earlier checkpoint: actual review round and repair stop

Run `faction-v1-c6b855593093fd3f6ecb` is terminal; handle80045 exited1, no paid
process remains. Report
`b9750dc12f50a78f810fbd360e6f538d04682b3fbd5500a883134c2553fcad5f`.
The first8/8 recommendations and first review batch were reused. Seven new
review batches completed the two routes and produced three typed issues. The
first Editor returned a nonempty replacement; the second returned
`replacements:[], additions:[]`, triggering `FACTION_PATCH_DENOMINATOR` before
the no-progress branch. The collected multi-issue patch was never applied,
so the draft was not partially mutated.

Independent inspection additionally found wrong-target review reasons:
supportive.0.4's index4 described index3's Medic/Freedom Fighters advice, and
index5 described index4's Academy advice. supportive.0.6 similarly described
adjacent earlier topics. Returning the right numeric indices did not prove the
right text was reviewed. Model verdicts also continued to miss the known
Factory35-vs-Armory30 minimum-cost defect documented below. No faction
qualification may treat these reviews as sufficient evidence.

Next implementation must precede another paid continuation:

1. Explicit host-indexed review target content/hash bindings, preserving full
   source/overall/whole-section context, with regressions on the actual shifted
   review outputs. Mere index echo is not semantic proof.
2. Empty patches classified as no-progress or evidence-backed no-change, with
   bounded source-backed correction; do not route them through blind schema
   resampling or erase original findings.
3. Machine-enforced qualification veto and local repair for known independent
   Rules/source counterexamples, including the actual minimum-cost defect.

This run9 calls /2,318,781 tokens /estimated ¥0.643959. Actual cumulative
44,981,402 known tokens /estimated-or-reserved ¥50.755463, no402. One first-section
review round was executed, but reviewed-and-qualified sections remain0/15;
faction candidates0/2, Ticket18 2/8, project16/22, formal/runtime first-five0/5.
Do not restart the unchanged failed recipe or mark the long goal complete.

## Earlier checkpoint: strict redundant source alias preservation

Run `faction-v1-f8c57661dd395f069591` is terminal, report
`1925cc0aaf7d6963adf373367a1016dcf946418515280746417891cb8063a33e`.
The first two-verdict source-review batch returned exactly the requested
indices and a negative judgment. Its coverage row additionally included
`sourceRefs:[sourceRef]`; the schema retry was identical. Old exact-field
validation rejected that redundant alias. The new validator retains it only
when it equals the single canonical sourceRef exactly; conflicting aliases,
unknown extra fields and changed judgments cannot be normalized away. Raw
Provider outputs remain unchanged and negative findings still block review.
Thirty-three workflow checks passed, including the actual original/retry pair,
conflicting alias/unknown-field controls and negative-verdict preservation.

Actual run2 calls /515,235 tokens /estimated ¥0.493565; cumulative42,662,621
known tokens /estimated-or-reserved ¥50.111504, no402. All first-section8/8
recommendations remain saved. Complete dual-source-reviewed sections0/15;
faction candidates0/2. Engineering preflight precedes the next paid continuation.

## Earlier checkpoint: source-review output partition

Run `faction-v1-ed39f02a84aaff066af0` is terminal, report
`40cee7539bcbbd56098ed96e1915127609f71c3a6ccbbe0b067613b2e4666116`.
Its adversarial review reached4096 output tokens and was rejected as truncated.
The complete first-section draft remains8/8 recommendations; no partial review
was accepted. This run1 call /260,891 tokens /estimated ¥0.265508, cumulative
42,147,386 known tokens /estimated-or-reserved ¥49.617939, no402.

Independent review now outputs at most two global recommendation verdicts per
call, while every call retains the complete frozen sources, overall Skill and
entire section draft. First batch per route also covers the assigned sources;
later batches explicitly request no additional coverage output. Any actual
additional cited-source review remains preserved under the existing validator.
The host records the partition and requires exact per-route global-index/source
coverage. All negative judgments enter the common typed issue journal.
Earlier complete whole reviews and the truncated failure remain historical;
the new partitioned review is a new task and is not claimed to reuse their
acceptance. All completed production roles retain exact-input reuse.

Twenty-nine workflow checks passed (including the actual truncated outcome,
global-index controls and all route/index/source partitions),323 injected role
calls,0 paid calls. Workflow readiness
`41a944f84cb24f2205341c52cd60b09f567c1c91b211256a3d7c8bce2a46df83`.
Two actual DSH full-context injected-response sessions also passed. This is
engineering readiness, not actual source or strategy acceptance. First section
still awaits completed dual review; Terran0/7 and Zerg0/8.

Capacity planning note: every actual full-context call has roughly260–270K
input tokens. With output partitioning and correction, the existing inherited
60M-token cap may stop both-faction production before completion. Any future
capacity amendment must be explicit/audited, retain all ancestor usage/start,
and preserve monetary/call/time controls; no cap has been reset or raised here.

## Earlier checkpoint: all eight first-section items, review coverage repair

Run `faction-v1-f93c0c1ba85b7c32f4b3` is terminal. Two actual target-specific
reconstructions produced items4–7, completing8/8 first-section recommendations.
The supportive source reader returned26 coverage entries for actually cited
sources; its schema retry returned the identical review. The validator required
exactly one assigned source entry, causing a structural rejection. New review
validation keeps all original entries and verdicts unchanged: assigned sources
must all appear exactly once; extra entries must be unique, actually cited by
the draft and validly linked. Extra negative coverage becomes a typed issue on
every affected recommendation, not ignored. Raw review still has an uncertain
verdict on item3 and is not evidence of source or strategy acceptance.

Current cumulative use:41,886,495 tokens /estimated-or-reserved ¥49.352431.
This run5 calls /1,337,726 tokens /estimated ¥0.869473; no402. Terran0/7 and
Zerg0/8 sections have completed whole-section dual review. Source-reviewed
faction candidates0/2, formal first-five0/5.

### Independent roster-choice checks

`packages/skill-evaluation/faction-roster-choice-drills-v1.mjs` adds eight
source-bound decision inputs with30 offered card packages. Actual faction/slot/
Unique/resource kernel results must agree with separately specified expected
eligible options, minimum cost and all ties. Evaluation questions contain no
expected answers or kernel verdicts, and are not supplied to production. There
is one known-error diagnostic (the generated Factory-minimum-cost assertion)
and seven independent inputs in the same bounded army-building domain.

Concrete known draft defect: first section item2 says Factory35 is the cheapest
way to fill the single missing Elite slot for small Marauders plus a Goliath.
Armory30 also fills it and is cheaper. The eight-case verifier actually rejects
the Factory-is-cheapest answer against the kernel-backed cost/slot controls.
This factual/optimization-scope defect must be resolved before faction
qualification even if a source reviewer calls the paragraph supported.

The objective explicitly ignores card special-ability value and compares only
the offered choices. These checks do NOT claim cheapest is best battlefield
strategy, validate deployment/complete composition, prove model performance,
or perform Room actions. Eight engineering checks passed,0 Provider calls;
readiness `26a12fc56e6537d36de0b3f3b49055b0b8e7fd51a1a8d02c2589af251c0ff0b7`.

## Earlier checkpoint: actual grammar success, wrong-target recovery

Run `faction-v1-66102d1817842a896f0b` is terminal. Actual Provider responses used
the new delimiter normalizer with validated normalization evidence; items2–3
were saved, reaching4/8 items in the first Terran section. The next response
relabelled items0–1 as4–5, and generic schema feedback returned exactly the same
output. It was rejected, not accepted as two new recommendations. Actual targets
were Academy/Support ability-cost reduction and Terran Tenacity/first-player
timing; copied content instead concerned Hero-slot unlocking and Stimpack/Medic.

New target-scope checking detects duplicate recommendation bodies independently
of citation metadata. A persisted typed issue binds the rejected artifact,
complete outline targets, missing citations and which accepted indices were
copied. One distinct reconstruction retains the full official context, overall
Skill, whole section outline and all accepted prior recommendations; it omits
only rejected wrong-target prose. Host target instructions are restated at the
end of the workspace. Repeating old prose with changed indices/citations fails.
Correct citation membership alone still does not prove the new prose covers
the target or is factually true: whole-section source review remains mandatory.

Twenty workflow checks passed, including real original/schema no-progress
outputs, citation-only evasion rejection, injected full recovery and durable
resume. The273 injected role calls prove mechanics, not model quality. Current
paid run had3 calls /808,435 tokens /estimated ¥0.324040; all-history cumulative
40,548,769 known tokens /estimated-or-reserved ¥48.482958. No402 observed.
Still Terran0/7 and Zerg0/8 source-reviewed sections;0/2 faction candidates.

## Earlier checkpoint: completed-response JSON delimiter recovery

`faction-v1-3825f0d84367c95c6d13` is terminal, not still generating. It reused six
prior roles, generated an eight-item outline and two complete recommendations,
then two responses for items2–3 failed JSON parsing. Both had finishReason=stop
and output1625/1345 tokens, not4096-cap truncation. Their actual redacted shapes
contain two redundant object closers after array items and one missing final
outer closer. Original prose was not retained, so these records cannot recover
the old recommendation text.

The new `redundant_array_object_closers_v1` normalizer removes at most eight
unmatched `}` only immediately after a completed array object, before comma or
end-array. It may compose the existing single missing OUTER object close; all
remaining structure must balance and strict JSON.parse must succeed. Strings,
keys, numbers, ordering and citations remain byte-for-byte unchanged. A normal
stop is required; length, missing inner fields/arrays, commas, strings and other
errors remain rejected. Usage receipts bind original/normalized text hashes,
exact UTF-16 removal offsets and whether an outer delimiter was appended. This
is grammar recovery, not source, strategy, Rules or publication acceptance.

Verification: two actual failure-shape replays (not reconstructed prose), two
scalar-preservation cases,11 rejection controls;19 production integration checks
including actual transport/accounting with injected HTTPS and length rejection;
13 continuation controls; two actual disposable DSH full-context sessions with
injected Provider responses. No paid calls for these gates. Main readiness is
`6eca55ecea34666bbe97ed0761ac68c88860f7bf94e953cf9ed846e820af97c9`;
JSON recovery readiness is
`cdaf3bfa5786505131ee8945b00ab9011b82772cff01da65cdc4372ceeec27f6`.

Continuation checks before/after main readiness and allows only the three
Provider normalization modules plus their regression script to change. Model,
DSH, official sources, full source/overall/faction input and original budgets
are unchanged. Preflight found eight reusable completed roles and inherited
12 calls /3,157,018 tokens /estimated ¥2.460464. Actual cumulative ledger remains
39,740,334 known tokens /estimated-or-reserved ¥48.158918. No402 observed.
Terran0/7 and Zerg0/8 sections have yet completed whole-section source review.

## Qualified prerequisite

Actual overall dependency `d086ae7f69e48716b9bae7a8adb4db2d1f013b98e02b17c314b10cbe95e14292`
retains522 claims in37 sections plus four operational lessons. Source22/22,
development105/105, repeated independent30/30; exact actual request and answer
replay passed. This qualifies it only for dependent offline generation. The
paid scheduling host must re-run the actual qualifier rather than accept an
uploaded `passed` field or a model's claimed registry status.

## Work split within this slice

1. Complete source/dependency input binding — done. Keep all220 Core,68 FAQ and83
   current official product rows, the complete overall Skill/guide and exact
   faction evidence. No development/independent test questions or answers enter
   the faction input. Ten checks pass; complete serialized inputs are782,565
   bytes for Terran Armed Forces and796,847 for Zerg Swarm, without truncation.
2. Bounded persistent Teach/Ctx2Skill production — implemented/tested. Use the existing
   offline DSH adapter and accounted role runner, with challenger/reasoner/judge/
   proposer/generator, actual source findings and local revisions. Emit one
   faction strategy Skill per faction, not per unit or atomic rule.
3. Actual production for both factions — active. Bind identical qualified
   overall/source versions. Terran's15 tag-eligible entries and Zerg's19 are
   evidence pools, not automatically legal army rosters or recommendations.
4. Independent source/strategy/application assessment — pending. Recommendations
   need conditions, legal alternatives, source references, risk and revise-if;
   separate deterministic rules checks from strategic hypotheses. Actual Room
   and cross-matchup evidence still belongs to175–178.

New compiler `packages/skill-production-v3/faction-production-input-v1.mjs`
joins existing faction evidence with the qualified overall input. It rejects
unqualified/stale dependencies, source drift, wrong selected factions and
runtime/Rules/training authority claims. It cannot authorize paid work, publish
Skills, infer complete roster legality or add game data.

Artifacts are under `build/ticket-18-faction-production-v1/`: both complete input
JSON files and `input-readiness.json`, hash
`1ac5066af31145c0937ebf2ee860a05b92e0d56de3802d0337afee11438d30e2`.
Source compiler evidence remains in `build/ticket-18-faction-evidence-v1/`.
This preparation made0 Provider calls and generated0 faction Skills.

## Persistent role workflow

`faction-strategy-workflow-v1.mjs` uses the existing v3 role runner and pinned
offline DSH adapter. Every role has the full official source prefix plus the
complete overall Skill/guide and faction data. Sources are not duplicated or
silently summarized to meet a prompt limit.

Teach→six-axis Ctx2Skill tree→Challenger runs per faction. Then each writing
section runs Reasoner→Judge→Proposer→Generator→two fresh source reviewers.
Axes are army/resources, unit roles, phase tempo, objectives, threat tradeoffs
and card packages. Unit/card rows are grouped only for bounded output, in
chunks of at most five: Terran has7 sections and Zerg8, both still produce one
faction Skill each. Every eligible unit/card must receive actual source-bound
discussion, not just an unused citation. All question-tree leaves remain in
the candidate; no matchup-specific tactical answer is pre-injected.

Recommendations carry applicability, procedure, alternatives, risk, revise-if,
sourceRefs and explicitly unproven effects. The host does not label prose as
winning strategy. Source reviewers independently inspect every field and each
assigned source, distinguishing conditional strategy from official facts.

Negative findings become immutable per-section issue journals. Only flagged
recommendations may change; additions must address an assigned-source omission.
No-op edits stop or enter one distinct source-first reconstruction without the
bad draft. Cycles and up to three exhausted semantic revisions quarantine the
section. Fresh source checks still follow any repair. Model agreement is not
a deterministic Rules verdict or complete-game evidence.

`faction-continuation-v1.mjs` preserves the original wall-clock start, call,
token and cost budgets across explicit code-correction continuations. It can
reuse only complete raw roles with exact unchanged input identities; it never
copies billed attempts or inherits final source/quality acceptance. Source,
model, DSH binding and input contracts cannot drift. Ambiguous sends, live
parent work and402 are rejected before continuation.

## Verification and actual start

-14 workflow checks exercised both complete inputs, full-context delivery,
  one local repair, retained negative reviews, bounded quarantine, source-first
  recovery, unknown citation rejection, unaffected-text preservation, restart
  reuse and402 propagation.167 model calls here were injected fixtures only.
  Report `40eb8a4ce3ae283c82c1117d7f184aa259dc845409530cdf0fcd527590d279fa`.
-9 continuation checks verified actual SQLite checkpoint/accounting behavior,
  no paid-attempt copying, no final-acceptance reuse, drift/live/ambiguous/402
  rejection. Isolated fixture DB, zero Provider calls.
-2 actual disposable DSH sessions carried full faction contexts plus a42KB
  history-capacity allowance through the real request serializer and an
  injected HTTPS transport. Wire sizes951,501/970,763 bytes, all522 claims,
  guide and faction hashes intact, cleanup verified. This proves transport,
  not model quality. The initial test misread DSH text-block arrays as strings;
  fixing the test's extraction resolved it without changing production wire
  data or truncating context. Report
  `bec7925b07a9d23d69cca8b719fae9a872a0d5a321929749a2fcb4e099bd44ee`.

Actual run **`faction-v1-c05262b66b5603afecbb`** started with both complete inputs
and the reverified overall dependency; Terran Teach is active at this
checkpoint. Continue the same process, do not restart because of an observation
timeout. Both factions share the original60M-token/¥20/400-call/8-hour maximums;
these are limits, not expected costs or a permission to overwrite old results.

Last pre-production ledger:36,583,316 known Provider tokens, estimated¥45.698454
including historical reserve; no402. New usage belongs to the same persistent
Provider ledger and must be reported from the actual run. Independent
source/strategy/application evaluation is still pending; no faction or runtime
Skill has been promoted. Actual Room, directed-matchup and reflection/upgrade
evidence remains175–178 work.

## Actual output-capacity failure and complete-context continuation

The initial run is now terminal, not disconnected. It completed six actual
roles:32 Teach notes, a24-leaf question tree, Challenger, and the first section's
Reasoner/Judge/Proposer. The question tree required one known-usage JSON-format
repair; its original failed response remains charged. The first full-section
Generator then reached exactly4096 output tokens, with Provider
`finishReason=length`,15,301 content bytes and an incomplete JSON tail.
This is insufficient single-response output capacity, not lost input context,
network interruption, or an accepted partial Skill.

Original terminal report
`39bca00e9384e5c60cef592ef9d89336c8d9dceaafbd1b3917ed62e5fc626c07`:
8 calls/2,089,469 tokens/estimated¥1.879873,0 faction candidates. Cumulative
38,672,785 known Provider tokens/estimated¥47.578327 including historical
reserve; no402. No part of the truncated eighth recommendation was promoted.

The corrected output contract preserves the entire input but generates a short
complete outline first, then at most two complete recommendations per request.
Each batch sees all official sources, full overall Skill, whole section
outline, questions/proposals and previously completed recommendations. Host
indices bind exactly the requested entries; none may be skipped or reordered
silently. The final section still contains all planned recommendations and
must undergo two complete source reviews. This is output partitioning, not
context truncation or creation of extra independent Skills.

Local revisions likewise generate one issue's patch at a time while retaining
the complete source/draft/issue background. The aggregate is validated and
applied atomically, preserving unflagged text. A no-op can trigger one bounded
source-first reconstruction for that issue; original outputs remain immutable.
The final candidate uses the canonical first-five faction skillId directly;
there is no pre-existing runtime publication to rename.

Updated16 workflow checks use the actual truncated outcome as a negative
capacity control, exercise batched output and previous-item delivery, retain
source-scope/no-op/quarantine/resume controls and verify canonical IDs. The209
injected calls are engineering fixtures, not real strategy results. Readiness
`feedce47c995a978b6c1d5fa960f269041d0defe23ec4191d9b14f4af23215d2`.
Two more actual disposable DSH context sessions passed with injected transport
responses and unchanged wire sizes; gate
`f655786b0f1878bf85de72030262f2e5efb35085829f8e7b0d616e899d176098`.

Actual continuation **`faction-v1-3825f0d84367c95c6d13`** is active at this
checkpoint. It demonstrably reused all six prior complete roles through
exact-input SQLite receipts, generated the new first-section outline, and
started `generator-items.0`. It inherits the previous8 calls/2,089,469 tokens/
¥1.879873 and the original8-hour start; it does not reset the¥20/60M/400-call
envelope. Do not restart this process (live tool handle55175).

No section has yet completed both source reviews and no faction Skill has
passed independent strategy/application evaluation. Remaining scopes remain
Terran7/Zerg8 internal sections, two actual faction candidates, independent
evaluation, and175–179. Whole Ticket18 stays2/8; overall offline dependency1/5;
formal/runtime five-Skill acceptance0/5. Long goal remains active.
