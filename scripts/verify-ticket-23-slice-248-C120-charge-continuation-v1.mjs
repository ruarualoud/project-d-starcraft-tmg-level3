// Concrete live C120: Vile's original roll4/cap9 yielded no generated layout.
// Only this stopped case: no Provider, original-room write, reroll or room creation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
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
  'Usage: frozen-worktree-root original-C-directory report-path');
assert(!path.resolve(reportPath).startsWith(path.resolve(originalDirectory) + path.sep),
  'Report must not be written into the original room');
const report = { schemaVersion: 'ticket23_C120_actual_charge_continuation_v1',
  providerCalls: 0, originalRoomWrites: 0, originalAcceptedActionsApplied: 0,
  onlineApplyReplayVerified: false, performancePromotionAdmitted: false,
  trainingTruth: false, progress: [] };
const started = performance.now();
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const phase = name => console.log(JSON.stringify({ diagnostic: 'C120-concrete-repro',
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
  const db = new DatabaseSync(path.join(directory, 'seats/player2/provider/live-decisions.sqlite'),
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
  assert(offsets.length > 2, 'C120 cached member format must be present');
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
  assert.equal(original.stateRevision, 120);
  assert.equal(choice.authority.stateRevision, 120);
  assert.equal(hash(state), original.envelope.stateHash);
  assert.equal(choice.authority.stateHash, original.envelope.stateHash);
  assert.equal(state.pendingAction.pieceId, 'player2-vile');
  assert.equal(state.pendingAction.chargeRoll, 4);
  assert.equal(state.pendingAction.maxDistanceMilliInches, 9000);
  const planner = Object.values(choice.attempts)
    .map(attempt => attempt.safeOutput?.planning || attempt.safeOutput)
    .filter(output => output?.formationSearchRequested === true).at(-1);
  assert(planner, 'C120_PAID_FORMATION_INTENT_MISSING');
  Object.assign(report, { roomId: original.roomId, stateRevision: 120,
    stateHash: original.envelope.stateHash, originalRoll: 4,
    originalCapMilliInches: 9000, ownModelCount: state.pieces
      .find(piece => piece.id === 'player2-vile').currentModels });
  await writeFile(reportPath + '.source-state.private.json.gz',
    gzipSync(Buffer.from(JSON.stringify({ state, stateRevision: 120,
      stateHash: original.envelope.stateHash, matchBinding: original.envelope.matchBinding,
      paidPlanner: planner })), { level: 1 }), { mode: 0o600, flag: 'wx' });
  phase('original-state-and-paid-intent-retained');

  let initialDirectory = originalDirectory;
  let initialRoomId = original.roomId;
  const projectRoot = path.resolve(root, '../..');
  for (let depth = 0; depth < 8; depth++) {
    assert([root, projectRoot].some(base =>
      initialDirectory.startsWith(path.join(base, 'build') + path.sep)),
    'C120 initial ancestry must remain inside this project');
    const fork = await json(path.join(initialDirectory, 'fork-private.json'))
      .catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!fork) break;
    assert.equal(fork.targetRoomId, initialRoomId);
    initialDirectory = fork.sourceDirectory;
    initialRoomId = fork.sourceRoomId;
    assert(depth < 7, 'C120 initial ancestry exceeds the native factory');
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
  const domain = runtime.enumerate(state, { sideKey: 'player2' }).parameterDomains
    .find(entry => entry.actionType === 'resolve_charge');
  assert(domain, 'C120_FROZEN_RULES_CONTINUATION_MISSING');
  const request = { maximumOptions: planner.formationMaximumOptions,
    preferredAnchor: { xMilliInches: planner.formationPreferredX,
      yMilliInches: planner.formationPreferredY },
    tacticalPurpose: planner.formationTacticalPurpose,
    formationObjectives: planner.formationObjectives };
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
        console.log(JSON.stringify({ diagnostic: 'C120-concrete-repro', ...event }));
      }
    },
  }, { compareBatch: async jobs => jobs.map(projectStarcraftTmgFormationRelationshipComparisonV1) });
  Object.assign(report, { optionCount: result.optionCount, failureCounts: result.failureCounts,
    options: result.formationOptions });
  assert(result.optionCount > 0, 'C120_MANDATORY_CHARGE_HAS_NO_RULES_ACCEPTED_CONTINUATION');
  for (const option of result.formationOptions) {
    const instance = runtime.instantiate(state, domain, option.canonicalParameters);
    assert.deepEqual(instance.canonicalParameters, option.canonicalParameters);
    const next = runtime.apply(state, instance.action, { postRevision: 121 });
    assert.equal(next.ok, true);
    assert.equal(next.state.pendingAction?.stage === 'resolve_charge_after_roll', false);
    const plan = instance.action.sourceAction.chargeResolutionPlan;
    assert.equal(plan.chargeRoll, 4);
    assert.equal(plan.pendingHash, state.pendingAction.pendingHash);
    assert(['success', 'failure'].includes(plan.outcome));
    report.outcome = plan.outcome;
    if (plan.outcome === 'success') {
      assert.equal(option.canonicalParameters.placements.length, report.ownModelCount - 1);
      assert(plan.geometry.distanceTravelledMilliInches <= 9001);
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
