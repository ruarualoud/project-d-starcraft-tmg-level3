# S272 v306 — Citation repair must not erase strategic reasoning

## Actual failure

F's saved question `q3-budget-completion-alternative` had35 answer writes in
snapshot `c357b67a13daba29b0008570edbad134962f9cab5c55b79024a6c03f394e6337`.
The first answer explained the full-budget build versus a Hydralisk alternative,
marker-radius coverage, durability and the alternative's200 unspent minerals.
The final answer instead said "Citation repair only" and explained JSON paths.
Its substantive reasoning was replaced, not merely hidden by the UI.

The old reader provided only `read`, `answer` and `finish`. `answer` replaces
the entire answer and the global proposal lists. Thus a request to fix only
receipt addresses still required a full strategic rewrite. This is an overly
broad write interface; another prose instruction alone does not isolate it.

## Change

- The shared reader accepts a typed `repair_citations` operation with exact
  saved question IDs and complete intended evidence-reference arrays.
- It updates only evidenceRefs/quantitativeEvidence/qualitativeEvidence.
  Disposition, strategic reason, tradeoff, trigger and global proposals remain.
- Repair explanation is operation metadata, not the answer's publicReason.
  A substantive conclusion change still uses the existing full `answer` path.
- A separate `teach_framework_citation_patch` output contract is selected only
  when current citation errors require it. It supports reading originals first
  and explicit substantive answering. Old paid output contracts remain intact.
- The common framework refreshes citation checks after a patch and counts its
  model calls in the existing review allowance. No answer, counter, failed
  receipt, army, fee or previous conclusion is edited by this maintenance.

## Focused verification

`scripts/verify-slice272-citation-patch-v306.mjs <F directory>` reproduced the
real lost-strategy scenario: RED, then one GREEN after the source repair.
It patches the real final citation arrays onto the original strategic answer
in memory, checking the unchanged strategy/proposals, unknown preservation,
atomic rejection of a foreign question ID, actual contract decoding and shared
operation selection.0 Provider/Native calls; no existing green gate rerun.
This is a concrete write-isolation regression, not proof of future model quality.

## Live continuation and acceptance

Six v305 sessions were running. B reached revision11/new Teach; A repaired a
missing map.route_access sideId via its own delta-recovery call and obtained an
advisory receipt. That is actual automatic parameter repair, not a hand patch
or proof of complete legal arrival. v306 now requests a safe common pause.
The current paid operation settled before all six loaded the new code.
All old processes exited, then original sessions resumed as A24586/B24587/
C24588/D24589/E24590/F24591. B remained2000/r11. E's latest reader completed
in3steps with0citation errors; its material questions remain for subsequent
revision/investigation, so this is not final approval.

A one-second B native CPU sample during the pause tail showed JSON serialization
and garbage collection, with2.5GiB physical footprint (3.6GiB peak). This is a
local performance observation, not a model outage or proof of full-chain timing.
The F sample found its process already exited and yielded no performance data.
No process was killed, no paid request replayed and no profiling gate repeated.

F's already-saved poor answer is not silently repaired by restoring old prose.
The new Plan17 Teach must produce its own complete explanation and pass the
existing final source/strategy audit. C's14in versus13.75in wording issue also
remains a semantic review concern. Key factual unknowns cannot be passed via
disclaimers; future opponent behavior may remain explicit conditional strategy.

T27 5/6, T23 33/36; remaining S272/S248/S249/S250=4. Final planning admission
0/6, completed battles0/12. No games started, no data refresh, no commit/push.

harnessLoopUsed:true; targetGames:StarCraftTMG; routes:readonly synthesis and
citation repair; tools:existing saved-evidence reader; UI:none changed;
decisionEvidence:F original/final answers; memory:paid originals preserved;
trainingCandidates:none admitted; rollback:wrong-question mutation or lost
strategy/unknown blocks use; userVisibleCheck:reference repair retains reasons.
