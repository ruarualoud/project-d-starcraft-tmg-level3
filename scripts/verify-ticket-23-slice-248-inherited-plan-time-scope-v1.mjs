// Actual C82 regression: old R1 plan text is not a new R2 safety assertion.
// The complete saved journal and paid submissions are read-only fixtures.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgMatchDecisionContinuityV1 } from
  "../packages/online-agent-session/match-decision-continuity-v1.mjs";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [choicePath, authorityPath, journalPath, reportPath] = process.argv.slice(2);
assert(choicePath && authorityPath && journalPath && reportPath);
const choice = JSON.parse(await readFile(choicePath, "utf8"));
const room = JSON.parse(await readFile(authorityPath, "utf8"));
const records = JSON.parse(await readFile(journalPath, "utf8"));
const original = JSON.stringify({ choice, room, records });
assert.equal(choice.authority.stateRevision, 82);
assert.equal(room.aggregate.envelope.stateHash, choice.authority.stateHash);
assert.equal(room.aggregate.envelope.state.round, 2);
const scope = { gameId: "starcraft-tmg", roomId: choice.authority.roomId,
  matchBindingHash: choice.authority.matchBindingHash,
  seatKey: choice.authority.seatKey };
const roomProjection = {
  room: { roomId: scope.roomId, stateRevision: 82,
    stateHash: choice.authority.stateHash },
  matchBinding: { bindingHash: scope.matchBindingHash },
  viewer: { seatKey: scope.seatKey }, state: room.aggregate.envelope.state,
};
const spatialObservation = { units: roomProjection.state.pieces.map(piece => ({
  unitId: piece.id, unitName: piece.unitName || piece.name,
  sideRelation: piece.sideKey === scope.seatKey ? "own" : "enemy",
})) };
async function memoryFrom(savedRecords) {
  const continuity = createStarcraftTmgMatchDecisionContinuityV1({
    journal: { read: async () => ({ ok: true, records: savedRecords }),
      append: async () => ({ ok: true }), durability: "readonly_captured_fixture" },
  });
  return (await continuity.observe({ scope, roomProjection })).matchMemory;
}
const memory = await memoryFrom(records);
const submissions = Object.values(choice.attempts).filter(attempt =>
  attempt.localPlannerSemanticReplayVersion && attempt.safeOutput?.plan);
assert.equal(submissions.length, 3);
const results = [];
for (const attempt of submissions) {
  const raw = attempt.safeOutput;
  const action = choice.actionIndex.find(entry =>
    entry.id === raw.recommendedCandidateId)?.action;
  assert.equal(action.pieceId, "player2-kerrigan");
  const input = { raw, queryReceipts: choice.queryReceipts, spatialObservation,
    plannerSelectedAction: action, roomProjection, matchMemory: memory,
    currentPlan: choice.currentPlan };
  const checked = inspectStarcraftTmgFormationThreatClaimsV1(input);
  console.log(JSON.stringify({ round: attempt.round,
    blockingCount: checked.contradictions.length,
    advisoryCount: checked.advisoryFindings.length,
    memoryHasTimeLineage: Boolean(memory.workingMemory.planStatementLineage) }));
  assert.equal(checked.contradicted, false,
    "unchanged R1 plan history must not be treated as a new R2 safety claim");
  const inherited = checked.advisoryFindings.filter(finding =>
    finding.reasonCode === "inherited_prior_round_plan_statement");
  assert(inherited.length > 0);
  assert(inherited.every(finding => finding.severity === "Medium"
    && finding.blocksApply === false && finding.originAuthority.round === 1));
  const statement = inherited[0].scopeText;
  const origin = memory.workingMemory.planStatementLineage.statements.find(
    entry => entry.text === statement);
  assert.equal(origin.originAuthority.stateRevision, 36);
  assert.equal(origin.originAuthority.phase, "assault");
  const remainsHigh = (changed, name) => assert.equal(
    inspectStarcraftTmgFormationThreatClaimsV1(changed).contradicted, true, name);
  // Copying the same words into a CURRENT assessment still asserts current fact.
  remainsHigh({ ...input, raw: { ...raw, assessment: { ...raw.assessment,
    evidenceFor: [...(raw.assessment?.evidenceFor || []), statement] } } },
  "current assessment claims do not inherit the plan's historical scope");
  // A changed statement is new, even if it resembles the old one.
  remainsHigh({ ...input, raw: { ...raw, plan: { ...raw.plan,
    strategicApproach: raw.plan.strategicApproach.map(text => text === statement
      ? "Kerrigan is currently outside every enemy stationary fire band." : text),
  } } }, "new current safety claim remains High");
  for (const [name, changed] of [
    ["missing lineage", { ...input, matchMemory: null }],
    ["different seat", { ...input, matchMemory: { ...memory,
      scope: { ...memory.scope, seatKey: "player1" } } }],
    ["different binding", { ...input, matchMemory: { ...memory,
      scope: { ...memory.scope, matchBindingHash: "0".repeat(64) } } }],
    ["stale current snapshot", { ...input, matchMemory: { ...memory,
      authority: { ...memory.authority, stateRevision: 81 } } }],
    ["different active plan", { ...input, currentPlan: {
      ...choice.currentPlan, planId: "different-plan" } }],
  ]) remainsHigh(changed, name);
  results.push({ round: attempt.round, historicalFindingCount: inherited.length,
    originalOriginRevision: origin.originAuthority.stateRevision });
}
// Removing a statement and later reintroducing it starts a NEW lineage; the
// earliest global occurrence alone is not an excuse to bypass current checks.
const revived = structuredClone(records);
const lastPlan = revived.filter(entry => entry.kind === "turn_plan"
  || entry.kind === "plan_revision").at(-1);
const previousPlan = revived.filter(entry => entry.kind === "turn_plan"
  || entry.kind === "plan_revision").at(-2);
previousPlan.payload.strategicApproach = [];
const revivedMemory = await memoryFrom(revived);
const latest = submissions.at(-1);
assert.equal(inspectStarcraftTmgFormationThreatClaimsV1({
  raw: latest.safeOutput, queryReceipts: choice.queryReceipts,
  spatialObservation, plannerSelectedAction: choice.actionIndex.find(entry =>
    entry.id === latest.safeOutput.recommendedCandidateId)?.action,
  roomProjection, matchMemory: revivedMemory, currentPlan: choice.currentPlan,
}).contradicted, true, "reintroduced R2 claims remain current and blocking");
assert.equal(lastPlan.authority.round, 2);
assert.equal(JSON.stringify({ choice, room, records }), original);
const report = { passed: true, actualStateRevision: 82, cases: results,
  paidOutputsAndWholeAuthorityAndJournalUnchanged: true,
  currentClaimsAndWrongScopeAndRevivedClaimsRemainBlocking: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
