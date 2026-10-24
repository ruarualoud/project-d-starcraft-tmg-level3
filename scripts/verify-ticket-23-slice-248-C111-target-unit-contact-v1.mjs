// Concrete C111: nominated Marine is screened; Rules accepts contact with its Unit.
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
const report = { schemaVersion: 'ticket23_C111_actual_charge_continuation_v1',
  providerCalls: 0, originalRoomWrites: 0, onlineApplyReplayVerified: false,
  strategyComparisonVerified: false, performancePromotionAdmitted: false,
  trainingTruth: false, progress: [] };
const started = performance.now();
try {
  const capture = JSON.parse(await readFile(capturePath, "utf8"));
  const state = capture.state;
  assert.equal(capture.stateRevision, 111);
  assert.equal(hash(state), capture.stateHash);
  // The native Envelope owns matchBindingHash derivation; hashing the expanded
  // public binding here is not that contract. Retain its native provenance and
  // compare only the actual frozen runtime identity consumed by this factory.
  const originalRuntimeHash = capture.matchBinding.rulesRuntimeBinding.runtimeHash;
  assert.equal(typeof originalRuntimeHash, 'string');
  assert.equal(state.pendingAction.pieceId, 'player2-swarmling');
  assert.equal(state.pendingAction.chargeRoll, 4);
  const saved = JSON.parse(await readFile(choicePath, "utf8"));
  const choice = saved.selected.at(-1).value;
  const planner = choice.attempts["provider-attempt-3b14dd4af778b45641c97e89d6616241123340835a705cd19111c564cb8bc970"].safeOutput;
  assert(planner, 'C111_PAID_FORMATION_INTENT_MISSING');
  const fork = JSON.parse(await readFile(path.join(originalDirectory, 'fork-private.json'), 'utf8'));
  // The immediate legal-prefix fork starts mid-match and contains summoned
  // units. Like the Web factory, construct V1 from the ORIGINAL audited army,
  // then enumerate the untouched current C111 state (including those summons).
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
    assert(depth < 7, 'C111_ORIGINAL_ANCESTOR_CHAIN_EXCEEDS_NATIVE_FACTORY');
  }
  report.originalInitialDirectory = initialDirectory;
  const sourcePrivate = JSON.parse(await readFile(path.join(initialDirectory,
    'runner-private.json'), 'utf8'));
  const db = new DatabaseSync(path.join(initialDirectory, 'room.sqlite'), { readOnly: true });
  let row;
  try { row = db.prepare('SELECT initial_envelope_cipher FROM sc_rooms WHERE room_id=?')
    .get(initialRoomId); } finally { db.close(); }
  assert(row, 'C111_ORIGINAL_INITIAL_ENVELOPE_MISSING');
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
  assert(domain, 'C111_NATIVE_PENDING_CONTINUATION_MISSING');
  const request = { maximumOptions: planner.formationMaximumOptions,
    preferredAnchor: { xMilliInches: planner.formationPreferredX,
      yMilliInches: planner.formationPreferredY },
    tacticalPurpose: planner.formationTacticalPurpose,
    formationObjectives: planner.formationObjectives };
  report.domainId = domain.domainId;
  report.runtimeHash = runtime.descriptor.runtimeHash;
  report.request = request;
  const result = await searchStarcraftTmgLegalFormationOptionsAsyncV1({ state, domain, request,
    instantiate: (snapshot, currentDomain, parameters) => {
      try { return runtime.instantiate(snapshot, currentDomain, parameters); }
      catch (error) {
        const code = String(error.message).split(":")[0];
        report.failureExamples ||= {};
        report.failureExamples[code] ||= { message: error.message, parameters };
        throw error;
      }
    },
    observeProgress: event => {
      if (['charge_candidate_generation_diagnostic', 'candidate_generation_complete',
        'search_completed'].includes(event.stage)) report.progress.push(event);
    },
  }, { compareBatch: async jobs =>
    jobs.map(projectStarcraftTmgFormationRelationshipComparisonV1) });
  report.optionCount = result.optionCount;
  report.failureCounts = result.failureCounts;
  report.options = result.formationOptions;
  assert(result.optionCount > 0, 'C111_NOMINATED_MODEL_SEEDS_MISS_LEGAL_TARGET_UNIT_CONTACT');
  for (const option of result.formationOptions) {
    const instance = runtime.instantiate(state, domain, option.canonicalParameters);
    assert.deepEqual(instance.canonicalParameters, option.canonicalParameters);
    const next = runtime.apply(state, instance.action, { postRevision: 112 });
    assert.equal(next.ok, true);
    assert.equal(next.state.pendingAction?.stage === 'resolve_charge_after_roll', false);
    const plan = instance.action.sourceAction.chargeResolutionPlan;
    assert.equal(plan.chargeRoll, 4);
    assert.equal(plan.pendingHash, state.pendingAction.pendingHash);
    report.outcome = plan.outcome;
    assert.equal(plan.outcome, 'success', 'C111_NO_RULES_ACCEPTED_UNIT_CONTACT');
    assert.equal(instance.canonicalParameters.placements.length, 3);
    assert.equal(plan.geometry.finalModelPositions.length, 4);
    report.acceptedPath = instance.canonicalParameters.path;
    report.distanceTravelledMilliInches = plan.geometry.distanceTravelledMilliInches;
    assert(report.distanceTravelledMilliInches <= state.pendingAction.maxDistanceMilliInches + 1,
      'C111_DETOUR_EXCEEDS_ORIGINAL_ROLLED_MOVE');
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
