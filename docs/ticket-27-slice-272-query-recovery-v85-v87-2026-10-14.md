# T27 / S272 — current-plan query recovery v85–v87

Status: T27 5/6, T23 33/36; main remaining248/272/249/250=4; complete games0/12.
The full map, stable2000-point roster, original-room comparisons and review objective remains open.

## Actual defects and scope

1. B14 submitted complete actor/control-window `mission_marker_schedule` requests, but the laboratory required the unused legacy `inputs` object before dispatching that math kind. These are engineering failures, not wrong scoring calculations by the model. v85 dispatches that typed schedule independently; legacy scalar calculators still require their inputs.
2. The new bounded formation-miss code was missing from Teach repair routing. v85 returns the exact original detail and same-map unit/base/terrain context. A bounded miss is not proof of impossibility. The model must choose its own different anchor or complete positions; no silent relocation/terrain clearing.
3. Repeated failed-query receipts discarded repair detail/context. v85 retains them and binds failure caching to the current evidence-port/laboratory descriptor. Only investigator-requested reissues run again under a changed contract. Old failures remain in history; successful evidence is not rewritten. This is not a new full verification pass.
4. B14 synthesis omitted `q-robustness-predeclared-replacement` three times: all three saved outputs had the same seven answers and no dropped/sanitized keys. v86 binds answer count and IDs to the actual eight-question agenda and reports exact missing/duplicate/unknown IDs. Previously the repair only said `ANSWERS_INCOMPLETE`. Context identity includes this changed synthesis contract; earlier successful stages are retained. An exhausted phase gets at most one additional attempt on explicit continuation, not a hidden fresh three-round loop.
5. A6's next investigation reused all16 previous query labels. The query-ID validator stopped the batch three times even though IDs are bookkeeping, not tactics. v87 accepts unique labels within a batch, assigns deterministic Host handles for cross-round collisions, retains original label bindings/output hash, and adjusts only exact references to earlier scenario labels in the same batch. Forward/self references are not guessed. Paid replies are preserved.

No change chooses a unit, action, stance, risk weight or scoring strategy. No source refresh, Room action, Plan application or Skill promotion occurred.

## Focused validation, not repeated gates

- `verify-slice272-query-recovery-v85.mjs <base>`: actual B14 requests/captured error boundary RED3 failures -> soleGREEN3 checks. Real frozen-lab math answers equal the same requests with explicit legacy placeholder. Captured bounded geometry error reaches repair; duplicate feedback survives; obsolete failure no longer masks repaired math. Source unchanged,0Provider/0Room. The error-routing seam does not claim a new geometry solution.
- `verify-slice272-synthesis-coverage-v86.mjs <base>`: actual saved seven-answer reply RED -> soleGREEN. Actual agenda bound8 IDs/count; precise missing-ID feedback; one scripted correction preserves the seven existing answers.0Provider/0Room; no strategy-success claim. Subsequent exhausted-phase attempt cap is additionally observable at the real recovery boundary, not represented as another completed loop test.
- `verify-slice272-query-identity-v87.mjs <base>`: actual A6 query batch RED with `QUERY_ID_INVALID` -> soleGREEN reaches new-round checkpoint using one retained reply. All16 request arguments unchanged and old IDs mapped.0Provider/0Room. Checkpoint-only fixture does not claim execution of16 new scenarios or all possible branch-reference forms.

Prior v77–v84 green gates, full suites and builds were not rerun. Local v85/v86 receipts: `common-v85-v86-local-evidence.json`; v87 receipt is recorded separately with this recovery. Three new scripts only reproduce the concrete observed failures above.

## Live recovery boundary

- Original rooms unchanged: A133/C156/B9/D9. C Web155 needs observation backfill only; NEVER replay156.
- B old Teach is terminal failed after7completed calls/1636579units. Old idle65184 was exited only after terminal status and no in-flight dispatch were verified. v86 runner88775/host88827 at53728 uses SAME workspace/map and one authorized investigation supplement, followed by the bounded synthesis recovery. No live-room launcher is attached.
- A old Teach is terminal failed after5completed calls/944505units on repeated query labels, not a network timeout. The v86 runner's A row stopped safely because that investigation was unfinished; it is superseded, not a reason to restart the B job. v87 A runner91092/host91133 resumes the same unfinished investigation with the label-binding fix. Read `common-v87-A-query-recovery-progress.private.json` and actual PIDs before inferring progress.
- B loaded v86 before the v87 ID fix; do not kill a paid job to replace it. Load the common latest version after it finishes and before any final review/Room resume.
- As19:33:52Z, current-plan Teach completed usage A944505/B1636579units; frozen Sep14 off-peak cache-aware USD estimates0.076919166/0.134605572 (total0.211524738), not invoices. New recovery/in-flight usage is additional. Earlier review/Room charges and unknown costs are retained, separately by arm; no new¥100 increment crossed.

## Strategy and remaining work

Actual19:35–19:36Z B supplement completed6operations after1new call270994units. Both previously blocked mission-marker schedules now return advisory conditional arithmetic: success branch own-minus-opponent cumulative0/1/5/9/13 and failure branch0/1/2/0/−2 across R1–5. These are declared-control assumptions, not actual control, kills or a game result. Three geometry queries still remain unknown (two bounded packing misses and an explicit Raptor/wall overlap); all three now carry repair context. Timing scenario returns advisory, not proof of every timing claim. B moved to synthesis; no Plan application. A v87 host91133 at53775 is alive, rehydrating the original read-only investigation with0newcalls so far; that is not yet a recovered live query batch. Both actual host PIDs were checked, not inferred from progress files.

A4→A6 corrected the conditional own3/opponent4 scoring misconception to own3/opponent2 when P1 holds1/3/5 and P2 holds2/4. This changes the supposed need to chase kills, without proving those control assumptions. B12→B14 largely corrects attribution and wording; declaring enemy-affinity points higher value does not establish that contesting them is necessary or worth losses/action cost. Both rosters and arrival schedules remain unchanged.

Still required: actual valid scenario/attack/marker-control/alternative-budget evidence; investigate remaining engineering query failures separately from legitimate opponent uncertainty; incorporate accepted Teach conclusions into Plan with affected-claim review; explicitly apply versions; resume all four originals on one code version. Then finish complete comparisons and strategy review. Map scope is not reduced by this query repair.

Harness: `harnessLoopUsed=true`, `targetGames=[starcraft-tmg]`, routes=`fact_probe/harness_optimizer`; tools=read-only pregame math/scenario/Teach. Evidence is captured request/reply/checkpoint, no UI screenshot or online action this repair. Public Teach history is retained for later WikiSkill/EvoTest, `trainingTruth=false`. Demote/reject any result that silently relocates a scenario, treats unknown as impossible, loses source identity or changes model strategy without its decision. No subagents/K3, install, cleanup, new official data or commit.
