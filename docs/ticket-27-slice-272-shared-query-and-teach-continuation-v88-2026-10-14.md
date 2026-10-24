# T27 / S272 — shared-query contract and actual Teach continuation v88

Status: T27 5/6, T23 33/36, main remaining 248/272/249/250 = 4; complete games 0/12. No map/roster/Room acceptance is implied by this repair.

## Concrete delivery

`pregame-scene-laboratory-v1.mjs` v1.4.2 now supplies the full native spatial-query tool descriptor through `describeQueryContext`, using the same factory as live play. Previously Teach saw query meanings and action space, but not the complete argument contract. Actual B14 passed unit arrays to a single-pair distance measurement and omitted action-domain parameters on exact movement queries. The shared descriptor distinguishes physical source/target measurements, unit relationship queries, marker filters and current-action domains. No tactical weights, unit preference, geometry algorithm or Rules truth changed.

The sole focused check `verify-slice272-shared-query-description-v88.mjs` used actual B14 misuse: RED96855 (descriptor absent), sole GREEN97215 (same full descriptor). No Provider calls or Room actions. It uses stubbed action enumeration, so it proves contract delivery, not model correction or valid scenario movement. Saved receipt: `common-v88-local-evidence.json`. Do not repeat passed v77–v88 checks.

## Completed actual Teach, not completed strategy validation

- B14: eight answers completed after the v86 supplement; supplement cost 2 calls / 560943 reported units. Four remaining unresolved questions: opponent scenario, reach to 2/4, post-loss control, exact formation/path. Two conditional scoring queries now succeed. The earlier `inputs` rejection was an engineering defect, not an incorrect model-supplied schedule.
- A6: v87 recovery completed at 2026-10-13 19:49:46Z. Three investigation rounds / 48 operations, eight answers, 2 new calls / 682887 units. Old paid investigation output was reused after Host query-ID binding. Four unresolved questions: opponent Omega/Creep scene, alternative opportunity cost, post-loss control, exact formation/path.
- A4→A6 and B12→B14 preserve each arm's roster and arrival schedule. A changes the alleged losing marker baseline to a conditional +1 VP/round baseline. B14 still has an insufficient argument for a mandatory 2/4 contest. Teach's proposed conditional contest has NOT yet become an accepted Plan.
- Teach can itself be wrong: B's baseline 3:2 becomes 5:1 after the declared marker-2 transfer, so the per-round differential improves by 3, not its claimed roughly 2. It also conflated entry-edge route length with centre-to-target firing distance and reversed an arrival-swap description. Clear-terrain fire estimates are not proof of this map's LOS or control.

## Actual continuation and runner correction

B v88r1 failed before Provider dispatch: its `revisedSectionKeys` included unsupported `lossResourceBudget`. Additionally, simply dropping that field would use the ordinary revision path, which does not consume the completed Teach archive. The corrected caller selects the existing evidence-aware targeted-claim path with 26 affected existing prose fields. It does NOT weaken the service validator, modify numeric loss budgets, invent a different army, or re-review unrelated unchanged claims.

- Corrected runner: `common-v88r1-B-teach-plan-revision.private.mjs`; its authoritative new output is `common-v88r2-B-teach-plan-revision-progress.private.json` (old r1 failure and request retained).
- Runner 6831 reuses B host99278 at53965. Actual session status became running, revision15 dispatch sending at19:52Z. HTTP observation timeout did not cause a duplicate POST. After revision it requests changed-claim review against B14, with no extra unrelated claim paths. It stops at pending qualification and has no Room launcher.
- A's v87 Teach is terminal, so the old idle host91133 can safely be replaced. `common-v88-A-shared-query-supplement.private.mjs`, runner8162 / host8216, loads the same v88 code and uses A's one previously unused investigation supplement. It retains the agenda, completed answers and paid history; it does not reinitialize a Room. Read its progress AND actual PID before inferring completion.

Numeric loss-budget revision is still not supported by this prose-only route; if the model proposes a changed loss tolerance, record it as a proposed structured change, not as applied. Geometry failures must be corrected with model-chosen valid scenes, not just converted into disclaimers.

## Remaining sequence

1. Inspect actual A supplement/B revision outputs; do not restart on observation timeout or count advisory answers as strategy proof.
2. Close scenario/query prerequisites with the real shared tools. Distinguish legitimate unknown opponent choices from malformed queries or layouts. A bounded solver miss is not impossibility; an overlap rejection can be correct.
3. Apply valid Teach conclusions through model-owned revisions and affected-claim review; preserve budget/arrival/roster boundaries explicitly.
4. Explicitly apply accepted Plan versions and resume all four original Rooms on one code version, then complete comparisons and review. Originals remain A133/C156/B9/D9; C Web155 is observation lag, NEVER replay156.

Full goal retained: frozen official map/task acceptance, same-Room planned/unplanned comparisons, stable legal2000-point list and map-aware Plan, screenshots/costs and strategy review. Scope has not been reduced to passing Teach schemas.

Harness: shared native query descriptor; routes fact-probe/harness-optimizer; evidence actual retained model queries, local RED/GREEN and live workspace state. No new UI screenshot, Room action or Skill promotion. Teach/plan histories remain advisory experience for later WikiSkill/EvoTest, `trainingTruth=false`. No subagents/K3, installs, deletion, source refresh or commit.
