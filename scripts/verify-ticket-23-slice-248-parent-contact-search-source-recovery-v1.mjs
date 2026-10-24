// Concrete C81 recovery regression, using original paid returns and authority.
// The exact query receipt below is a LOCAL typed fixture from the already
// retained Rules proof, not a new live query or authority reacceptance.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import * as live from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [choicePath, authorityPath, rulesProofPath, reportPath] = process.argv.slice(2);
assert.ok(choicePath && authorityPath && rulesProofPath && reportPath);
const choice = JSON.parse(await readFile(choicePath, "utf8"));
const room = JSON.parse(await readFile(authorityPath, "utf8"));
const proof = JSON.parse(await readFile(rulesProofPath, "utf8"));
const candidateId = "sc-domain-bc78f8c50e3a42cac474e08648f1652d8e958694590c15f27b8c044da176de48";
assert.equal(choice.authority.stateRevision, 81);
assert.equal(choice.status, "provider_output_invalid");
assert.ok(choice.unavailableCandidateIds.includes(candidateId));
assert.equal(proof.stateHash, room.aggregate.envelope.stateHash);
assert.equal(proof.productRuntimeProof.runtimeHash,
  room.aggregate.envelope.matchBinding.rulesRuntimeBinding.runtimeHash);
const expected = choice.attemptKeys.filter(key =>
  choice.attempts[key].safeOutput?.recommendedCandidateId === candidateId).at(-1);
assert.equal(choice.attempts[expected].round, 6);
const input = {
  retryApproved: true,
  roomProjection: { room: { roomId: choice.authority.roomId,
    stateRevision: 81, stateHash: choice.authority.stateHash },
  matchBinding: { bindingHash: choice.authority.matchBindingHash },
  viewer: { seatKey: "player2", visibilityScope: "player" },
  state: room.aggregate.envelope.state },
  legalSpace: { ...choice.authority,
    finiteActions: choice.actionIndex.filter(x => x.kind === "finite")
      .map(x => ({ actionKey: x.id, action: x.action })),
    parameterDomains: choice.actionIndex.filter(x => x.kind === "parameterized")
      .map(x => x.action) },
  spatialActionSpace: { authority: choice.authority,
    actionSpaceHash: choice.authority.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.filter(x => x.kind === "finite")
      .map(x => ({ candidateId: x.id, action: x.action })),
    parameterDomains: choice.actionIndex.filter(x => x.kind === "parameterized")
      .map(x => x.action) },
  spatialObservation: { ...choice.authority,
    observationHash: choice.authority.spatialObservationHash,
    phase: room.aggregate.envelope.state.phase,
    units: room.aggregate.envelope.state.pieces.map(piece => ({
      unitId: piece.id, unitName: piece.unitName || piece.name,
      sideRelation: piece.sideKey === "player2" ? "own" : "enemy",
      currentModels: piece.currentModels, currentSupply: piece.currentSupply,
      models: piece.models, isOnField: piece.isOnField,
    })) },
  planState: { plan: choice.currentPlan },
};
let recovery = null;
try { recovery = await import("../packages/online-agent-session/parent-contact-search-source-recovery-v1.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
if (!recovery) {
  const selected = live.selectStarcraftTmgPlannerLocalReplayAttemptV1(choice, input);
  console.log(JSON.stringify({ stateRevision: 81, parentCandidateStillExcluded: true,
    oldPaidQueenRound: 6, currentReplayRound: selected ? choice.attempts[selected].round : null,
    providerCalls: 0, originalRoomWrites: 0 }));
  assert.equal(selected, expected,
    "the paid Queen draft is stranded by a now-repairable failed-search exclusion");
  assert.fail("existing local replay has no versioned fresh-search recovery");
}
const original = JSON.stringify(choice);
const wholeRoomHash = hash(room);
const plan = recovery.planStarcraftTmgParentContactSearchRecoveryV1(choice,
  { retryApproved: true, authority: choice.authority });
assert.ok(plan, "recognize the actual failed search, not every Planner High");
assert.equal(plan.candidateId, candidateId);
assert.ok(plan.candidateAttemptKeys.includes(expected));
assert.deepEqual(plan.request.arguments.preferredAnchor,
  { xMilliInches: 44385, yMilliInches: 14980 });
assert.equal(plan.request.arguments.maximumOptions, 8);
assert.equal(recovery.planStarcraftTmgParentContactSearchRecoveryV1(choice,
  { retryApproved: false, authority: choice.authority }), null);
assert.equal(recovery.planStarcraftTmgParentContactSearchRecoveryV1(choice,
  { retryApproved: true, authority: { ...choice.authority, stateRevision: 82 } }), null);
const receiptBody = { ok: true, status: "exact",
  queryKind: "legal_asset_placement_options", authority: choice.authority,
  result: { ...proof.result, domainId: candidateId }, rulesAuthority: true,
  mayApply: false, trainingTruth: false };
const receipt = { ...receiptBody, queryReceiptHash: hash(receiptBody) };
const eligible = structuredClone(choice);
eligible.unavailableCandidateIds = eligible.unavailableCandidateIds.filter(id => id !== candidateId);
eligible.queryReceipts.push(receipt);
const replayKey = live.selectStarcraftTmgPlannerLocalReplayAttemptV1(eligible, input,
  { eligibleAlreadyRevalidatedAttemptKeys: plan.candidateAttemptKeys, onlyValid: true });
assert.equal(replayKey, expected, "only a currently valid prior paid draft may recover");
const repaired = structuredClone(choice);
const oldAttempts = JSON.stringify(repaired.attempts);
const oldReceipts = JSON.stringify(repaired.queryReceipts);
const oldWarnings = [...repaired.warnings];
const result = recovery.applyStarcraftTmgParentContactSearchRecoveryV1(repaired, plan,
  { receipt, replayAttemptKey: replayKey, recordedAt: "2026-10-09T06:20:00.000Z" });
assert.equal(result.recovered, true);
assert.equal(repaired.pendingSearchRecoveryPlannerAttemptKey, expected);
assert.equal(repaired.unavailableCandidateIds.includes(candidateId), false);
assert.equal(JSON.stringify(repaired.attempts), oldAttempts, "all nine paid outputs unchanged");
assert.equal(JSON.stringify(repaired.queryReceipts.slice(0, choice.queryReceipts.length)), oldReceipts);
assert.deepEqual(repaired.warnings.slice(0, oldWarnings.length), oldWarnings);
assert.equal(repaired.semanticCorrectionRounds, choice.semanticCorrectionRounds);
assert.equal(repaired.stageCorrectionRounds, choice.stageCorrectionRounds);
assert.equal(recovery.planStarcraftTmgParentContactSearchRecoveryV1(repaired,
  { retryApproved: true, authority: choice.authority }), null, "one requery per source revision");
for (const invalid of [
  { ...receipt, authority: { ...receipt.authority, stateRevision: 82 } },
  { ...receipt, result: { ...receipt.result, domainId: "wrong-domain" } },
  { ...receipt, status: "unknown", result: null },
  { ...receipt, result: { ...receipt.result, placementOptions: [] } },
]) {
  const rejected = structuredClone(choice);
  const outcome = recovery.applyStarcraftTmgParentContactSearchRecoveryV1(rejected, plan,
    { receipt: invalid, replayAttemptKey: expected, recordedAt: "2026-10-09T06:20:00.000Z" });
  assert.equal(outcome.recovered, false);
  assert.equal(rejected.unavailableCandidateIds.includes(candidateId), true);
  assert.equal(JSON.stringify(rejected.attempts), oldAttempts);
}
assert.equal(JSON.stringify(choice), original);
assert.equal(hash(room), wholeRoomHash);
const report = { passed: true, stateRevision: 81, recoveredPaidRound: 6,
  allNinePaidOutputsAndOldFailureEvidenceUnchanged: true,
  noBlindCorrectionCounterReset: true, oneQueryPerSourceRevision: true,
  staleAndWrongDomainAndUnknownAndEmptyReceiptsCannotRecover: true,
  freshReceiptIsTypedLocalFixture: true, actualFreshLiveQueryProved: false,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
