// Concrete stopped B111: real V1 -> V6, same paid intent and original roll6.
// Geometry-only gate; advisory comparison is not a strategy-performance gate.
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
import { searchStarcraftTmgLegalFormationOptionsAsyncV1,
  projectStarcraftTmgFormationRelationshipComparisonV1 } from
  '../packages/online-agent-session/legal-formation-search-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [root, capturePath, choicePath, originalDirectory, reportPath] = process.argv.slice(2);
const report = { schemaVersion: 'ticket23_B111_actual_charge_continuation_v1',
  providerCalls: 0, originalRoomWrites: 0, onlineApplyReplayVerified: false,
  strategyComparisonVerified: false, performancePromotionAdmitted: false,
  trainingTruth: false, progress: [] };
const started = performance.now();
try {
  const capture = JSON.parse(gunzipSync(await readFile(capturePath)));
  const state = capture.state;
  assert.equal(capture.stateRevision, 111);
  assert.equal(hash(state), capture.stateHash);
  // The native Envelope owns matchBindingHash derivation; hashing the expanded
  // public binding here is not that contract. Retain its native provenance and
  // compare only the actual frozen runtime identity consumed by this factory.
  const originalRuntimeHash = capture.matchBinding.rulesRuntimeBinding.runtimeHash;
  assert.equal(typeof originalRuntimeHash, 'string');
  assert.equal(state.pendingAction.pieceId, 'player2-kerrigan-raptor');
  assert.equal(state.pendingAction.chargeRoll, 6);
  const saved = JSON.parse(gunzipSync(await readFile(choicePath)));
  const planner = Object.values(saved.choice.attempts).map(attempt => attempt.safeOutput)
    .filter(output => output?.formationSearchRequested === true).at(-1);
  assert(planner, 'B111_PAID_FORMATION_INTENT_MISSING');
  const fork = JSON.parse(await readFile(path.join(originalDirectory, 'fork-private.json'), 'utf8'));
  // The immediate legal-prefix fork starts mid-match and contains summoned
  // units. Like the Web factory, construct V1 from the ORIGINAL audited army,
  // then enumerate the untouched current B111 state (including those summons).
  let initialDirectory = fork.sourceDirectory;
  let initialRoomId = fork.sourceRoomId;
  for (let depth = 0; depth < 8; depth++) {
    assert(initialDirectory.startsWith(root + '/build/'));
    const ancestor = await readFile(path.join(initialDirectory, 'fork-private.json'), 'utf8')
      .then(JSON.parse, error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
    if (!ancestor) break;
    assert.equal(ancestor.targetRoomId, initialRoomId);
    initialDirectory = ancestor.sourceDirectory;
    initialRoomId = ancestor.sourceRoomId;
    assert(depth < 7, 'B111_ORIGINAL_ANCESTOR_CHAIN_EXCEEDS_NATIVE_FACTORY');
  }
  report.originalInitialDirectory = initialDirectory;
  const sourcePrivate = JSON.parse(await readFile(path.join(initialDirectory,
    'runner-private.json'), 'utf8'));
  const db = new DatabaseSync(path.join(initialDirectory, 'room.sqlite'), { readOnly: true });
  let row;
  try { row = db.prepare('SELECT initial_envelope_cipher FROM sc_rooms WHERE room_id=?')
    .get(initialRoomId); } finally { db.close(); }
  assert(row, 'B111_ORIGINAL_INITIAL_ENVELOPE_MISSING');
  const codec = createStarcraftTmgPrivatePayloadCodec({ key: sourcePrivate.storeEncryptionKeyBase64,
    keyId: JSON.parse(row.initial_envelope_cipher).keyId });
  const initial = codec.decode(row.initial_envelope_cipher,
    'room:' + initialRoomId + ':initial-envelope');
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root:
    await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: frozen.dataset, state: initial.state }) });
  // Runtime identity includes this arm's audited roster/catalogue. Do not
  // borrow A/C's hash merely because all three hosts share the same code.
  assert.equal(runtime.descriptor.runtimeHash, originalRuntimeHash);
  const domain = runtime.enumerate(state, { sideKey: 'player2' }).parameterDomains
    .find(entry => entry.actionType === 'resolve_charge');
  assert(domain, 'B111_NATIVE_PENDING_CONTINUATION_MISSING');
  const request = { maximumOptions: planner.formationMaximumOptions,
    preferredAnchor: { xMilliInches: planner.formationPreferredX,
      yMilliInches: planner.formationPreferredY },
    tacticalPurpose: planner.formationTacticalPurpose,
    formationObjectives: planner.formationObjectives };
  report.domainId = domain.domainId;
  report.runtimeHash = runtime.descriptor.runtimeHash;
  report.request = request;
  const result = await searchStarcraftTmgLegalFormationOptionsAsyncV1({ state, domain, request,
    instantiate: (snapshot, currentDomain, parameters) => runtime.instantiate(snapshot,
      currentDomain, parameters),
    observeProgress: event => {
      if (['charge_candidate_generation_diagnostic', 'candidate_generation_complete',
        'search_completed'].includes(event.stage)) report.progress.push(event);
    },
  }, { compareBatch: async jobs =>
    jobs.map(projectStarcraftTmgFormationRelationshipComparisonV1) });
  report.optionCount = result.optionCount;
  report.failureCounts = result.failureCounts;
  report.options = result.formationOptions;
  assert(result.optionCount > 0, 'B111_MANDATORY_CHARGE_HAS_NO_RULES_ACCEPTED_CONTINUATION');
  for (const option of result.formationOptions) {
    const instance = runtime.instantiate(state, domain, option.canonicalParameters);
    assert.deepEqual(instance.canonicalParameters, option.canonicalParameters);
    const next = runtime.apply(state, instance.action, { postRevision: 112 });
    assert.equal(next.ok, true);
    assert.equal(next.state.pendingAction?.stage === 'resolve_charge_after_roll', false);
    const plan = instance.action.sourceAction.chargeResolutionPlan;
    assert.equal(plan.chargeRoll, 6);
    assert.equal(plan.pendingHash, state.pendingAction.pendingHash);
    report.outcome = plan.outcome;
    // The original backend records prove that all24 direct candidates collided.
    // Lock this concrete repair to a real complete, Rules-accepted detour, not
    // a new unproved failure outcome or just a free leader endpoint.
    assert.equal(plan.outcome, 'success', 'B111_DETOUR_NOT_A_RULES_ACCEPTED_SUCCESS');
    assert(instance.canonicalParameters.path.length > 1,
      'B111_ACCEPTED_CHARGE_STILL_HAS_ONLY_A_DIRECT_SEGMENT');
    report.acceptedPath = instance.canonicalParameters.path;
    report.distanceTravelledMilliInches = plan.geometry.distanceTravelledMilliInches;
    assert(report.distanceTravelledMilliInches <= state.pendingAction.maxDistanceMilliInches + 1,
      'B111_DETOUR_EXCEEDS_ORIGINAL_ROLLED_MOVE');
  }
  assert.equal(hash(state), capture.stateHash);
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
