// Concrete live B133: Marine's original roll6/cap10 yielded no generated layout.
// Only this stopped case: no Provider, original-room write, reroll or room creation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { evaluateOfficialChargeMultiCutDistanceProofV1 } from
  '../packages/rule-atoms/official-charge-multi-cut-distance-proof-v1.mjs';
import { createStarcraftTmgPrivatePayloadCodec } from
  '../packages/room-store/room-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from
  '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from
  '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { searchStarcraftTmgLegalFormationOptionsAsyncV1,
  projectStarcraftTmgFormationRelationshipComparisonV1 } from
  '../packages/online-agent-session/legal-formation-search-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [root, originalDirectory, reportPath] = process.argv.slice(2);
assert(root && originalDirectory && reportPath,
  'Usage: frozen-worktree-root original-B-directory report-path');
assert(!path.resolve(reportPath).startsWith(path.resolve(originalDirectory) + path.sep),
  'Report must not be written into the original room');
const report = { schemaVersion: 'ticket23_B133_actual_charge_continuation_v1',
  providerCalls: 0, originalRoomWrites: 0, originalAcceptedActionsApplied: 0,
  onlineApplyReplayVerified: false, performancePromotionAdmitted: false,
  trainingTruth: false, progress: [] };
const started = performance.now();
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const phase = name => console.log(JSON.stringify({ diagnostic: 'B133-concrete-repro',
  stage: name, elapsedMs: performance.now() - started }));

function readNativeRoom(directory, roomId, field) {
  assert(['aggregate_cipher', 'initial_envelope_cipher'].includes(field));
  const db = new DatabaseSync(path.join(directory, 'room.sqlite'), { readOnly: true });
  try { return db.prepare(`SELECT ${field} FROM sc_rooms WHERE room_id=?`)
    .get(roomId)?.[field]; } finally { db.close(); }
}

// The current store caches independent standard gzip members. Read the last
// choice only, CRC-validated by gunzip, rather than inflating unrelated history.
function readLastChoice(directory) {
  const db = new DatabaseSync(path.join(directory, 'seats/player1/provider/live-decisions.sqlite'),
    { readOnly: true });
  let wrapper;
  try { wrapper = JSON.parse(db.prepare('SELECT record_json FROM sc_live_decision_records')
    .get().record_json); } finally { db.close(); }
  assert.equal(wrapper.encoding, 'gzip-base64');
  const bytes = Buffer.from(wrapper.payload, 'base64');
  const header = bytes.subarray(0, 10);
  const offsets = [];
  for (let offset = bytes.indexOf(header); offset >= 0;
    offset = bytes.indexOf(header, offset + 1)) offsets.push(offset);
  assert(offsets.length > 2, 'B133 cached member format must be present');
  const fragment = gunzipSync(bytes.subarray(offsets.at(-2), offsets.at(-1)),
    { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8');
  const choices = Object.values(JSON.parse('{' + fragment + '}'));
  assert.equal(choices.length, 1);
  return choices[0];
}

try {
  const privateState = await json(path.join(originalDirectory, 'runner-private.json'));
  const cipher = readNativeRoom(originalDirectory, privateState.roomId, 'aggregate_cipher');
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64, keyId: JSON.parse(cipher).keyId });
  const original = codec.decode(cipher, 'room:' + privateState.roomId + ':aggregate');
  const state = original.envelope.state;
  const choice = readLastChoice(originalDirectory);
  assert.equal(original.stateRevision, 133);
  assert.equal(choice.authority.stateRevision, 133);
  assert.equal(hash(state), original.envelope.stateHash);
  assert.equal(choice.authority.stateHash, original.envelope.stateHash);
  assert.equal(state.pendingAction.pieceId, 'player1-exact-repair-3');
  assert.equal(state.pendingAction.chargeRoll, 6);
  assert.equal(state.pendingAction.maxDistanceMilliInches, 10000);
  const planner = Object.values(choice.attempts)
    .map(attempt => attempt.safeOutput?.planning || attempt.safeOutput)
    .filter(output => output?.formationSearchRequested === true).at(-1);
  assert(planner, 'B133_PAID_FORMATION_INTENT_MISSING');
  Object.assign(report, { roomId: original.roomId, stateRevision: 133,
    stateHash: original.envelope.stateHash, originalRoll: 6,
    originalCapMilliInches: 10000, ownModelCount: state.pieces
      .find(piece => piece.id === 'player1-exact-repair-3').currentModels });
  await writeFile(reportPath + '.source-state.private.json.gz',
    gzipSync(Buffer.from(JSON.stringify({ state, stateRevision: 133,
      stateHash: original.envelope.stateHash, matchBinding: original.envelope.matchBinding,
      paidPlanner: planner })), { level: 1 }), { mode: 0o600, flag: 'wx' });
  phase('original-state-and-paid-intent-retained');

  let initialDirectory = originalDirectory;
  let initialRoomId = original.roomId;
  const projectRoot = path.resolve(root, '../..');
  for (let depth = 0; depth < 8; depth++) {
    assert([root, projectRoot].some(base =>
      initialDirectory.startsWith(path.join(base, 'build') + path.sep)),
    'B133 initial ancestry must remain inside this project');
    const fork = await json(path.join(initialDirectory, 'fork-private.json'))
      .catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!fork) break;
    assert.equal(fork.targetRoomId, initialRoomId);
    initialDirectory = fork.sourceDirectory;
    initialRoomId = fork.sourceRoomId;
    assert(depth < 7, 'B133 initial ancestry exceeds the native factory');
  }
  const initialPrivate = await json(path.join(initialDirectory, 'runner-private.json'));
  const initialCipher = readNativeRoom(initialDirectory, initialRoomId, 'initial_envelope_cipher');
  const initialCodec = createStarcraftTmgPrivatePayloadCodec({
    key: initialPrivate.storeEncryptionKeyBase64, keyId: JSON.parse(initialCipher).keyId });
  const initial = initialCodec.decode(initialCipher, 'room:' + initialRoomId + ':initial-envelope');
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root:
    await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: frozen.dataset, state: initial.state }) });
  assert.equal(runtime.descriptor.runtimeHash,
    original.envelope.matchBinding.rulesRuntimeBinding.runtimeHash);
  const domain = runtime.enumerate(state, { sideKey: 'player1' }).parameterDomains
    .find(entry => entry.actionType === 'resolve_charge');
  assert(domain, 'B133_FROZEN_RULES_CONTINUATION_MISSING');
  const request = { maximumOptions: planner.formationMaximumOptions,
    preferredAnchor: { xMilliInches: planner.formationPreferredX,
      yMilliInches: planner.formationPreferredY },
    tacticalPurpose: planner.formationTacticalPurpose,
    formationObjectives: planner.formationObjectives };
  const leaderModel = state.pieces.find(piece => piece.id === state.pendingAction.pieceId)
    .models.find(model => model.id === state.pendingAction.chargePlan.leadingModelId);
  const targetModel = state.pieces.find(piece => piece.id === 'player2-kerrigan-raptor')
    .models.find(model => model.id === 'player2-kerrigan-raptor-model-4');
  const roundProbe = model => ({ x: Math.round(model.xInches * 1000),
    y: Math.round(model.yInches * 1000), radiusFloor: Math.floor(model.baseWidthInches * 500),
    radiusCeil: Math.ceil(model.baseWidthInches * 500) });
  assert.equal(evaluateOfficialChargeMultiCutDistanceProofV1({
    leader: roundProbe(leaderModel), target: roundProbe(targetModel), blockers: [],
    maximum: state.pendingAction.maxDistanceMilliInches }), null,
  'B133_WITHOUT_BARRIERS_MUST_NOT_BE_CERTIFIED_IMPOSSIBLE');
  Object.assign(report, { runtimeHash: runtime.descriptor.runtimeHash,
    domainId: domain.domainId, request });
  phase('frozen-full-runtime-enumerated');
  const result = await searchStarcraftTmgLegalFormationOptionsAsyncV1({ state, domain, request,
    instantiate: (snapshot, currentDomain, parameters) =>
      runtime.instantiate(snapshot, currentDomain, parameters),
    observeProgress: event => {
      if (['charge_candidate_generation_diagnostic', 'candidate_generation_complete',
        'search_completed'].includes(event.stage)) {
        report.progress.push(event);
        console.log(JSON.stringify({ diagnostic: 'B133-concrete-repro', ...event }));
      }
    },
  }, { compareBatch: async jobs => jobs.map(projectStarcraftTmgFormationRelationshipComparisonV1) });
  Object.assign(report, { optionCount: result.optionCount, failureCounts: result.failureCounts,
    options: result.formationOptions });
  assert(result.optionCount > 0, 'B133_MANDATORY_CHARGE_HAS_NO_RULES_ACCEPTED_CONTINUATION');
  for (const option of result.formationOptions) {
    const instance = runtime.instantiate(state, domain, option.canonicalParameters);
    assert.deepEqual(instance.canonicalParameters, option.canonicalParameters);
    const next = runtime.apply(state, instance.action, { postRevision: 134 });
    assert.equal(next.ok, true);
    assert.equal(next.state.pendingAction?.stage === 'resolve_charge_after_roll', false);
    const plan = instance.action.sourceAction.chargeResolutionPlan;
    assert.equal(plan.chargeRoll, 6);
    assert.equal(plan.pendingHash, state.pendingAction.pendingHash);
    assert(['success', 'failure'].includes(plan.outcome));
    report.outcome = plan.outcome;
    if (plan.outcome === 'failure') {
      report.targetProofs = plan.failureProof.targetCertificates?.map(certificate => ({
        targetModelId: certificate.targetModelId, proof: certificate.proof,
        lowerBoundMilliInches: certificate.lowerBoundMilliInches,
        cutCount: certificate.cutPlanes?.length,
        visibilityVertexCount: certificate.visibilityVertexCount,
      }));
      assert.deepEqual(next.state.pieces.find(piece => piece.id === state.pendingAction.pieceId)
        .models.map(model => [model.id, model.xInches, model.yInches]),
      state.pieces.find(piece => piece.id === state.pendingAction.pieceId)
        .models.map(model => [model.id, model.xInches, model.yInches]));
    }
    if (plan.outcome === 'success') {
      assert.equal(option.canonicalParameters.placements.length, report.ownModelCount - 1);
      assert(plan.geometry.distanceTravelledMilliInches <= 10001);
      report.acceptedPath = option.canonicalParameters.path;
    }
  }
  assert.equal(hash(state), original.envelope.stateHash);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  report.elapsedMs = performance.now() - started;
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ ...report, options: undefined }));
}
