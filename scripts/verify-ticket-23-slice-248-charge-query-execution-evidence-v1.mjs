// Concrete C107: the accepted declaration query said exact without the route
// evidence that the SAME Rules factory later uses for C108 failure settlement.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgPrivatePayloadCodec } from
  '../packages/room-store/room-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from
  '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from
  '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { inspectStarcraftTmgSelectedChargeReachabilityV1,
  planStarcraftTmgChargePathEvidenceReviewV1,
  applyStarcraftTmgChargePathEvidenceReviewV1,
  compactQueryReceiptForPrompt } from
  '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [root, prePath, postPath, choicePath, originalDirectory, reportPath] = process.argv.slice(2);
const report = { schemaVersion: 'ticket23_charge_query_execution_evidence_v1',
  providerCalls: 0, originalRoomWrites: 0, hiddenChainOfThoughtStored: false,
  onlineAgentSelectionVerified: false, performancePromotionAdmitted: false,
  trainingTruth: false };
const started = performance.now();
const decodeCapture = async name => JSON.parse(gunzipSync(await readFile(name)));
try {
  const pre = await decodeCapture(prePath);
  const post = await decodeCapture(postPath);
  const saved = await decodeCapture(choicePath);
  assert.equal(hash(pre.state), saved.choice.authority.stateHash);
  assert.equal(hash(post.state), post.stateHash);
  assert.equal(pre.stateRevision, 107);
  const proposal = saved.choice.completedDecision.proposal;
  const fork = JSON.parse(await readFile(path.join(originalDirectory, 'fork-private.json'), 'utf8'));
  assert(fork.sourceDirectory.startsWith(root + '/build/'));
  const privateState = JSON.parse(await readFile(path.join(fork.sourceDirectory,
    'runner-private.json'), 'utf8'));
  const initialDb = new DatabaseSync(path.join(fork.sourceDirectory, 'room.sqlite'), { readOnly: true });
  let initialRow;
  try { initialRow = initialDb.prepare('SELECT initial_envelope_cipher FROM sc_rooms WHERE room_id=?')
    .get(fork.sourceRoomId); } finally { initialDb.close(); }
  const initialCodec = createStarcraftTmgPrivatePayloadCodec({ key: privateState.storeEncryptionKeyBase64,
    keyId: JSON.parse(initialRow.initial_envelope_cipher).keyId });
  const initial = initialCodec.decode(initialRow.initial_envelope_cipher,
    'room:' + fork.sourceRoomId + ':initial-envelope');
  const ownPrivate = JSON.parse(await readFile(path.join(originalDirectory, 'runner-private.json'), 'utf8'));
  const ownDb = new DatabaseSync(path.join(originalDirectory, 'room.sqlite'), { readOnly: true });
  let ownRow;
  try { ownRow = ownDb.prepare('SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?')
    .get(ownPrivate.roomId); } finally { ownDb.close(); }
  const ownCodec = createStarcraftTmgPrivatePayloadCodec({ key: ownPrivate.storeEncryptionKeyBase64,
    keyId: JSON.parse(ownRow.aggregate_cipher).keyId });
  const original = ownCodec.decode(ownRow.aggregate_cipher,
    'room:' + ownPrivate.roomId + ':aggregate');
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root:
    await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: frozen.dataset, state: initial.state }) });
  assert.equal(runtime.descriptor.runtimeHash, original.envelope.matchBinding.rulesRuntimeBinding.runtimeHash);
  assert.equal(original.envelope.matchBindingHash, saved.choice.authority.matchBindingHash);
  const aggregate = { ...original, stateRevision: 107, envelope: { ...original.envelope,
    state: pre.state, stateRevision: 107, stateHash: pre.stateHash } };
  const domain = runtime.enumerate(pre.state, { sideKey: 'player1' }).parameterDomains
    .find(entry => entry.domainId === proposal.domainId);
  assert(domain, 'ORIGINAL_C107_CHARGE_DOMAIN_MISSING');
  const instantiated = runtime.instantiate(pre.state, domain, proposal.parameters);
  const old = saved.choice.queryReceipts.find(receipt =>
    receipt.queryKind === 'instantiate_parameterized_action');
  assert.equal(hash(instantiated.action), old.result.actionHash);
  report.originalDeclarationActionUnchanged = true;
  const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
    roomStore: { async loadRoom() { return aggregate; } }, rulesRuntime: runtime, seatKey: 'player1' });
  const receipt = await adapter.query({ queryKind: 'instantiate_parameterized_action',
    authority: saved.choice.authority,
    arguments: { domainId: domain.domainId, currentLegalSpaceDomain: domain,
      parameters: proposal.parameters } });
  report.queryReceipt = receipt;
  assert.equal(receipt.ok, true, receipt.reason);
  assert.equal(receipt.precision, 'exact', receipt.reason);
  assert.equal(receipt.result.proposalAccepted, true, 'LEGAL_DECLARATION_WAS_REMOVED');
  report.queryResult = receipt.result;
  const evidence = receipt.result.chargePathEvidence;
  assert(evidence, 'C107_QUERY_OMITS_EXECUTION_PATH_FAILURE_EVIDENCE');
  assert.equal(evidence.pathStatus, 'certain_failure');
  assert.equal(evidence.leadingModelId, proposal.parameters.leadingModelId);
  assert.equal(evidence.maximumDistanceMilliInches, 13000);
  assert(evidence.pathLowerBoundMilliInches > evidence.maximumDistanceMilliInches);
  assert.equal(evidence.successCertified, false);
  const settlement = runtime.enumerate(post.state, { sideKey: 'player1' }).parameterDomains
    .find(entry => entry.actionType === 'resolve_charge');
  assert.equal(evidence.failureCertificateHash, settlement.constraints.certificateHash);
  report.sameExecutionCertificate = true;
  const input = { spatialActionSpace: { authority: saved.choice.authority,
    parameterDomains: saved.choice.actionIndex.filter(entry => entry.kind === 'parameterized')
      .map(entry => entry.action) }, candidateId: proposal.domainId,
    targetUnitId: 'player2-kerrigan', leadingModelId: proposal.parameters.leadingModelId,
    queryReceipts: [...saved.choice.queryReceipts, { ...receipt, status: 'exact' }] };
  const exposed = inspectStarcraftTmgSelectedChargeReachabilityV1(input);
  assert.equal(exposed.distanceDoesNotProvePath, true);
  assert.equal(exposed.pathStatus, 'certain_failure');
  assert.equal(exposed.leadingModelId, proposal.parameters.leadingModelId);
  const different = inspectStarcraftTmgSelectedChargeReachabilityV1({ ...input,
    leadingModelId: 'player1-marine-3-model-4' });
  assert.equal(different.pathStatus, 'unknown', 'ONE_LEADER_PROOF_REUSED_FOR_ANOTHER');
  const stale = inspectStarcraftTmgSelectedChargeReachabilityV1({ ...input,
    queryReceipts: [{ ...receipt, status: 'exact', authority: {
      ...saved.choice.authority, stateRevision: 106 } }] });
  assert.equal(stale.pathStatus, 'unknown', 'STALE_ROUTE_PROOF_REUSED');
  assert.deepEqual(compactQueryReceiptForPrompt(receipt).result.chargePathEvidence, evidence);
  const review = planStarcraftTmgChargePathEvidenceReviewV1({ ...input, proposal,
    previousQueryReceipts: saved.choice.queryReceipts });
  assert.equal(review.action, 'replan', 'HOST_ONLY_NEW_FACT_NOT_RETURNED_TO_MODEL');
  assert.equal(review.entireChargeDomainExcluded, false);
  assert.equal(planStarcraftTmgChargePathEvidenceReviewV1({ ...input, proposal,
    previousQueryReceipts: input.queryReceipts }), null, 'KNOWN_FACT_REVIEWED_AGAIN');
  const working = structuredClone(saved.choice);
  applyStarcraftTmgChargePathEvidenceReviewV1(working, review,
    { attemptKey: working.attemptKeys.at(-1), recordedAt: '2026-10-12T00:00:00.000Z' });
  assert.equal(working.stage, 'planning');
  assert.deepEqual(working.completedDecision, saved.choice.completedDecision);
  assert.deepEqual(working.attempts, saved.choice.attempts);
  assert.deepEqual(working.currentPlan, saved.choice.currentPlan);
  assert.deepEqual(working.queryReceipts, saved.choice.queryReceipts);
  assert.deepEqual(working.unavailableCandidateIds, saved.choice.unavailableCandidateIds);
  assert.equal(working.failedPlannerResults.at(-1).plannerResult.recommendedCandidateId,
    saved.choice.plannerResult.recommendedCandidateId);
  report.modelReassessmentRequiredForNewHostOnlyFact = true;
  report.originalPaidOutputsAndStrategicPlanRetained = true;
  report.selectedAgentEvidence = exposed;
  assert.equal(hash(pre.state), pre.stateHash);
  assert.equal(hash(post.state), post.stateHash);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  report.elapsedMs = performance.now() - started;
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ ...report, queryResult: undefined }));
}
