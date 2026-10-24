// Concrete performance bug: C111 rebuilds the same blockers for every policy.
// Generation RED/GREEN, full query pairing and a captured comparison CPU probe.
// Neither mode applies an action or certifies the complete online SLA.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStarcraftTmgPrivatePayloadCodec } from
  '../packages/room-store/room-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from
  '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from
  '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { compareStarcraftTmgFormationBatchInWorkersV1 } from
  '../packages/online-agent-session/formation-comparison-worker-batch-v1.mjs';
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  '../packages/online-agent-session/tactical-relationship-graph-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [root, capturePath, recordedGatePath, diagnosticModulePath, reportPath,
  referenceReportPath, executionMode = 'generation', comparisonModulePath] = process.argv.slice(2);
const report = { schemaVersion: 'ticket23_actual_C111_generation_preparation_v1',
  providerCalls: 0, originalRoomWrites: 0, rulesApplyCalls: 0,
  fullQueryParityVerified: false, onlineSlaVerified: false,
  performancePromotionAdmitted: false, trainingTruth: false };
const sha = value => createHash('sha256').update(value).digest('hex');
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
const started = performance.now();
try {
  const capture = JSON.parse(await readFile(capturePath, 'utf8'));
  const recorded = JSON.parse(await readFile(recordedGatePath, 'utf8'));
  const state = capture.state;
  assert.equal(capture.stateRevision, 111);
  assert.equal(hash(state), capture.stateHash);
  assert.equal(state.pendingAction.pieceId, 'player2-swarmling');
  assert.equal(state.pendingAction.chargeRoll, 4);
  assert(recorded.originalInitialDirectory.startsWith(root + '/build/'));
  const sourcePrivate = JSON.parse(await readFile(path.join(
    recorded.originalInitialDirectory, 'runner-private.json'), 'utf8'));
  const db = new DatabaseSync(path.join(recorded.originalInitialDirectory,
    'room.sqlite'), { readOnly: true });
  let row;
  try {
    row = db.prepare('SELECT initial_envelope_cipher FROM sc_rooms WHERE room_id=?')
      .get(sourcePrivate.roomId);
  } finally { db.close(); }
  assert(row, 'C111_ORIGINAL_INITIAL_ENVELOPE_MISSING');
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: sourcePrivate.storeEncryptionKeyBase64,
    keyId: JSON.parse(row.initial_envelope_cipher).keyId });
  const initial = codec.decode(row.initial_envelope_cipher,
    'room:' + sourcePrivate.roomId + ':initial-envelope');
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root:
    await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: frozen.dataset,
      state: initial.state }) });
  assert.equal(runtime.descriptor.runtimeHash,
    capture.matchBinding.rulesRuntimeBinding.runtimeHash);
  const domain = runtime.enumerate(state, { sideKey: 'player2' }).parameterDomains
    .find(entry => entry.actionType === 'resolve_charge');
  assert(domain, 'C111_NATIVE_PENDING_CONTINUATION_MISSING');
  const sourceBefore = await readFile(diagnosticModulePath);
  const diagnostic = await import(pathToFileURL(diagnosticModulePath).href);
  report.runtimeHash = runtime.descriptor.runtimeHash;
  report.domainId = domain.domainId;
  report.stateHash = capture.stateHash;
  report.request = recorded.request;
  report.solverSourceSha256 = sha(sourceBefore);
  report.setupElapsedMs = performance.now() - started;
  report.executionMode = executionMode;
  if (executionMode === 'comparison_profile') {
    // Profile only the measured long-tail stage of the saved first option. This
    // does not repeat candidate generation or the passed full-query pairing.
    const reference = JSON.parse(await readFile(referenceReportPath, 'utf8'));
    assert.equal(reference.executionMode, 'full_solver_query');
    assert.equal(reference.stateHash, report.stateHash);
    assert.equal(reference.domainId, report.domainId);
    assert.deepEqual(reference.request, report.request);
    const option = reference.result.formationOptions[0];
    assert.equal(option.actionType, 'resolve_charge');
    const queryState = freeze(structuredClone(state));
    const source = domain.sourceDomain || domain;
    // This concrete capture already contains normalized, valid objectives.
    // Preserve their original order and weights; there is no new strategy input.
    const comparisonObjectives = recorded.request.formationObjectives;
    assert(comparisonObjectives.every(entry => Number.isSafeInteger(entry.weight)
      && entry.weight >= 1 && entry.weight <= 5
      && entry.targetIds.length <= 24));
    const baseline = buildStarcraftTmgTacticalRelationshipGraphV1({
      state: queryState, seatKey: 'player2', request: {
        intent: 'engage', subjectUnitIds: [source.pieceId],
        targetIds: [...new Set(comparisonObjectives.flatMap(entry => entry.targetIds))],
        maximumRelations: 64,
      },
    });
    assert.equal(baseline.relationshipGraphHash,
      option.relationshipComparison.baselineRelationshipGraphHash);
    const instantiated = runtime.instantiate(queryState, domain,
      option.canonicalParameters, { matchBinding: capture.matchBinding });
    const job = { state: queryState, source, slots: option.slots,
      objectives: option.formationObjectives, baseline,
      instantiatedAction: instantiated.action, comparisonObjectives };
    const queryStarted = performance.now();
    const cpuStarted = process.cpuUsage();
    report.progress = [];
    const [comparison] = await compareStarcraftTmgFormationBatchInWorkersV1([job], {
      profileCpu: true, observeProgress: event => report.progress.push(event),
    });
    report.queryElapsedMs = performance.now() - queryStarted;
    const cpu = process.cpuUsage(cpuStarted);
    report.queryCpuMsIncludingOwnedWorkers = (cpu.user + cpu.system) / 1000;
    report.result = comparison;
    report.resultHash = hash(comparison);
    assert.deepEqual(comparison, option.relationshipComparison);
    report.capturedComparisonParityVerified = true;
    report.cpuProfileSummary = report.progress.find(event =>
      event.stage === 'formation_comparison_cpu_profile');
    assert(report.cpuProfileSummary?.sampleCount > 0,
      'C111_COMPARISON_CPU_PROFILE_UNAVAILABLE');
    assert.equal(hash(queryState), capture.stateHash);
    assert.equal(hash(state), capture.stateHash);
    assert.equal(sha(await readFile(diagnosticModulePath)), report.solverSourceSha256);
    report.realProductionComparisonWorkersUsed = true;
    report.adapterAuthorityRereadExecuted = false;
    report.ok = true;
  } else if (executionMode === 'full_solver_query') {
    // Match the production Adapter's owned immutable input and real ordered
    // comparison workers. No diagnostic generator export or fake IPC worker.
    const queryState = freeze(structuredClone(state));
    const compareBatch = comparisonModulePath
      ? (await import(pathToFileURL(comparisonModulePath).href))
        .compareStarcraftTmgFormationBatchInWorkersV1
      : compareStarcraftTmgFormationBatchInWorkersV1;
    if (comparisonModulePath) {
      const moduleRoot = path.dirname(diagnosticModulePath);
      const dependencies = [comparisonModulePath,
        path.join(moduleRoot, 'formation-comparison-worker-v1.mjs'),
        path.join(moduleRoot, 'combat-estimation-runtime-v1.mjs'),
        path.resolve(moduleRoot, '../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs'),
        path.resolve(moduleRoot, '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs')];
      report.isolatedDependencySourceHashes = await Promise.all(dependencies.map(async file =>
        ({ file, sha256: sha(await readFile(file)) })));
    }
    const queryStarted = performance.now();
    const queryCpuStarted = process.cpuUsage();
    report.progress = [];
    let instantiateCalls = 0;
    const observe = event => {
      report.progress.push(event);
      if (['candidate_generation_complete', 'search_completed',
        'formation_comparison_batch_started', 'formation_comparison_batch_completed',
        'worker_batch_closed'].includes(event.stage)) {
        console.log(JSON.stringify({ event: 'C111_full_solver_stage',
          ...event, queryElapsedMs: performance.now() - queryStarted }));
      }
    };
    const result = await diagnostic.searchStarcraftTmgLegalFormationOptionsAsyncV1({
      state: queryState, domain, request: recorded.request,
      instantiate: (...args) => {
        instantiateCalls++;
        return runtime.instantiate(...args);
      },
      instantiateOptions: { matchBinding: capture.matchBinding },
      observeProgress: observe,
    }, { compareBatch: async jobs => {
      observe({ stage: 'formation_comparison_batch_started', jobCount: jobs.length });
      const comparisons = await compareBatch(jobs,
        { observeProgress: observe });
      observe({ stage: 'formation_comparison_batch_completed', jobCount: jobs.length });
      return comparisons;
    } });
    report.queryElapsedMs = performance.now() - queryStarted;
    const queryCpu = process.cpuUsage(queryCpuStarted);
    report.queryCpuMsIncludingOwnedWorkers = (queryCpu.user + queryCpu.system) / 1000;
    report.instantiateCalls = instantiateCalls;
    report.result = result;
    report.resultHash = hash(result);
    report.optionCount = result.optionCount;
    report.realProductionComparisonWorkersUsed = true;
    report.adapterAuthorityRereadExecuted = false;
    assert.equal(hash(state), capture.stateHash);
    assert.equal(hash(queryState), capture.stateHash);
    assert.equal(sha(await readFile(diagnosticModulePath)), report.solverSourceSha256,
      'SOLVER_SOURCE_CHANGED_DURING_CASE');
    for (const dependency of report.isolatedDependencySourceHashes || []) {
      assert.equal(sha(await readFile(dependency.file)), dependency.sha256,
        'ISOLATED_QUERY_DEPENDENCY_CHANGED_DURING_CASE');
    }
    if (referenceReportPath) {
      const reference = JSON.parse(await readFile(referenceReportPath, 'utf8'));
      assert.equal(reference.executionMode, executionMode);
      assert.equal(reference.stateHash, report.stateHash);
      assert.equal(reference.domainId, report.domainId);
      assert.deepEqual(reference.request, report.request);
      assert.deepEqual(result, reference.result);
      report.fullQueryParityVerified = true;
      report.fullQueryParityScope = 'complete public formation solver result';
      report.referenceQueryElapsedMs = reference.queryElapsedMs;
      report.referenceQueryCpuMsIncludingOwnedWorkers =
        reference.queryCpuMsIncludingOwnedWorkers;
    }
    report.ok = true;
  } else {
  assert.equal(executionMode, 'generation', 'UNKNOWN_PREPARATION_CASE_MODE');
  const generatorStarted = performance.now();
  const cpuStarted = process.cpuUsage();
  const generated = diagnostic.inspectChargeGenerationPreparationForRecordedCase({
    state, domain, request: recorded.request });
  report.generationElapsedMs = performance.now() - generatorStarted;
  const cpu = process.cpuUsage(cpuStarted);
  report.generationCpuMs = (cpu.user + cpu.system) / 1000;
  report.blockingPreparationCount = generated.blockingPreparationCount;
  report.generatedCandidateCount = generated.candidates.length;
  report.generatedCandidates = generated.candidates;
  report.generatedCandidatesHash = hash(generated.candidates);
  assert.equal(hash(state), capture.stateHash);
  assert.equal(sha(await readFile(diagnosticModulePath)), report.solverSourceSha256,
    'DIAGNOSTIC_SOURCE_CHANGED_DURING_CASE');
  if (referenceReportPath) {
    const reference = JSON.parse(await readFile(referenceReportPath, 'utf8'));
    assert.equal(reference.stateHash, report.stateHash);
    assert.equal(reference.domainId, report.domainId);
    assert.deepEqual(reference.request, report.request);
    assert.deepEqual(generated.candidates, reference.generatedCandidates);
    report.completeGeneratedCandidateParityVerified = true;
    report.referenceGenerationElapsedMs = reference.generationElapsedMs;
    report.referenceGenerationCpuMs = reference.generationCpuMs;
    report.referenceBlockingPreparationCount = reference.blockingPreparationCount;
  }
  assert.equal(generated.blockingPreparationCount, 1,
    'C111_SAME_STATE_BLOCKERS_REBUILT_INSIDE_POLICY_LOOP');
  report.ok = true;
  }
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  report.elapsedMs = performance.now() - started;
  await writeFile(reportPath, JSON.stringify(report) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ ...report, generatedCandidates: undefined,
    result: undefined, progress: undefined }));
}
