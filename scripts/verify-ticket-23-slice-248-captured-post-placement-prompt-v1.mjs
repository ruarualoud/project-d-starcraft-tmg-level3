// Concrete C106 bug: old-position evidence keeps being cited for the selected
// post-Run target while correction names only a generic fire-band failure.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { buildStarcraftTmgLivePromptArtifactV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [fixturePath, reportPath] = process.argv.slice(2);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const original = JSON.stringify(fixture);
const { match, input, choice } = fixture;
assert.equal(choice.authority.stateRevision, 106);
const receipt = choice.queryReceipts.find(q => q.queryKind === "space.solve_formation");
const last = Object.values(choice.attempts).filter(a => a.stage === "action").at(-1);
const raw = last.safeOutput.channels?.decision || last.safeOutput.decision || last.safeOutput;
const selectedOptionId = raw.selection.optionId;
const selected = receipt.result.formationOptions.find(o =>
  o.formationOptionId === selectedOptionId);
const post = selected.relationshipComparison.relationships.find(r =>
  r.fromUnitId === "player2-raptor" && r.targetId === "player1-marine-1");
assert.deepEqual(post.enemyCurrentRoundStationaryThreatProfileKeys, []);
assert.deepEqual(post.enemyCurrentRoundMoveThenAttackProfileKeys, []);
assert(raw.intent.predictedOpponentResponses[0].basis.some(text =>
  text.includes("14821")), "reproduce the actual pre-move citation");

const { artifact } = buildStarcraftTmgLivePromptArtifactV1(match, input,
  choice, 7, choice.queryReceipts, "action");
const node = artifact.nodes.find(n => n.nodeId === "post-placement-prediction-facts");
assert(node,
  "the real Action prompt must explicitly separate post-placement prediction facts from pre-move receipts");
assert.equal(node.content.candidateId, raw.candidateId);
assert.equal(node.content.formationReceiptHash, receipt.queryReceiptHash);
assert.equal(node.content.formationOptions.length, receipt.result.formationOptions.length);
for (const option of receipt.result.formationOptions) {
  const exposed = node.content.formationOptions.find(o =>
    o.formationOptionId === option.formationOptionId);
  const opposed = option.relationshipComparison.relationships.filter(r =>
    r.relation === "opposed" && r.fromUnitId === option.pieceId);
  assert.equal(exposed.opponentTargets.length, opposed.length);
  for (const row of opposed) {
    const target = exposed.opponentTargets.find(r => r.actorUnitId === row.targetId);
    assert.equal(target.targetUnitId, row.fromUnitId);
    assert.deepEqual(target.currentRoundStationaryProfileKeys,
      row.enemyCurrentRoundStationaryThreatProfileKeys ?? null);
    assert.deepEqual(target.currentRoundMoveThenAttackProfileKeys,
      row.enemyCurrentRoundMoveThenAttackProfileKeys ?? null);
    assert.deepEqual(target.currentRoundStationaryUnknownProfileKeys,
      row.enemyCurrentRoundStationaryThreatUnknownProfileKeys ?? null);
    assert.equal(target.minimumBaseEdgeDistanceMilliInches,
      row.minimumBaseEdgeDistanceMilliInches ?? null);
  }
}
const selectedFacts = node.content.formationOptions.find(o =>
  o.formationOptionId === selectedOptionId).opponentTargets.find(r =>
  r.actorUnitId === "player1-marine-1");
assert.equal(selectedFacts.minimumBaseEdgeDistanceMilliInches, 15431);
assert.deepEqual(selectedFacts.currentRoundStationaryProfileKeys, []);
assert.deepEqual(selectedFacts.currentRoundMoveThenAttackProfileKeys, []);
assert.equal(node.content.evidenceScope, "hypothetical_after_selected_own_formation");
assert.equal(node.content.prePlacementFactsMayProvePostPlacementThreat, false);
assert.equal(node.content.strategyPreferenceApplied, false);

const uncertain = structuredClone(fixture);
const first = uncertain.choice.queryReceipts.find(q => q.queryKind === "space.solve_formation")
  .result.formationOptions.find(o => o.formationOptionId === selectedOptionId)
  .relationshipComparison.relationships.find(r => r.targetId === "player1-marine-1");
delete first.enemyCurrentRoundStationaryThreatProfileKeys;
const missing = buildStarcraftTmgLivePromptArtifactV1(uncertain.match, uncertain.input,
  uncertain.choice, 7, uncertain.choice.queryReceipts, "action").artifact.nodes
  .find(n => n.nodeId === "post-placement-prediction-facts").content.formationOptions
  .find(o => o.formationOptionId === selectedOptionId).opponentTargets
  .find(r => r.actorUnitId === "player1-marine-1");
assert.equal(missing.currentRoundStationaryProfileKeys, null,
  "missing geometry/lifecycle evidence is not a zero-fire band");
const stale = structuredClone(fixture);
stale.choice.queryReceipts.find(q => q.queryKind === "space.solve_formation")
  .authority.stateRevision = 105;
const staleNode = buildStarcraftTmgLivePromptArtifactV1(stale.match, stale.input,
  stale.choice, 7, stale.choice.queryReceipts, "action").artifact.nodes
  .find(n => n.nodeId === "post-placement-prediction-facts");
assert.equal(staleNode.content.status, "unknown");
assert.deepEqual(staleNode.content.formationOptions, []);
assert.equal(JSON.stringify(fixture), original);
const report = { passed: true, stateRevision: 106,
  selectedOptionId, originalPaidOutputHash: last.outputHash,
  actualPromptBuilderUsed: true, originalRawReceiptsUnchanged: true,
  everyOptionOpposedRowForwardedExactly: true, actorTargetDirectionPreserved: true,
  missingFieldsStayUnknown: true, staleEvidenceNotPromoted: true,
  strategyPreferenceApplied: false, providerCalls: 0, roomWrites: 0,
  scope: "captured_prompt_evidence_seam_not_full_historical_prompt_or_model_quality",
  trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
