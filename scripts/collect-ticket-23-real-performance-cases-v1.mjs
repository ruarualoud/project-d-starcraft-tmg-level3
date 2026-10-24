// User-requested performance observations, not another test/audit loop.
// Original databases are read-only. Preserve full receipts and original requests.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  '../packages/online-agent-session/sqlite-live-decision-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { extractTicket23AuthorityPerformanceCasesV1 } from
  './support/ticket23-authority-performance-case-extraction-v1.mjs';

const [sourceDirectory, outputPath, completeRoundCohortPath, arm] = process.argv.slice(2);
let completeRoundCohort = null;
let cohortArm = null;
if (completeRoundCohortPath) {
  completeRoundCohort = JSON.parse(await readFile(completeRoundCohortPath, 'utf8'));
  assert.equal(completeRoundCohort.schemaVersion,
    'ticket23_complete_round_per_type_cohort_observation_v1');
  assert.ok(['A', 'B', 'C'].includes(arm), 'explicit original arm required');
  cohortArm = completeRoundCohort.arms.find(row => row.arm === arm);
  assert.ok(cohortArm, 'selected original arm missing from cohort');
  assert.equal(path.resolve(cohortArm.originalDirectory), path.resolve(sourceDirectory),
    'cohort must bind the same original source directory');
  assert.equal(cohortArm.sourceVersion, completeRoundCohort.sourceVersion);
  if (!completeRoundCohort.fullRoundObservationAvailableEveryArm
    || !['A', 'B', 'C'].every(key => completeRoundCohort.arms.some(row =>
      row.arm === key && row.completeRounds >= 1))) {
    // Do not decode all paid history or select replacement quantiles while the
    // owner's full-round baseline is pending. This is observation, not failure.
    const pending = { schemaVersion: 'starcraft_tmg_real_per_type_performance_cases_v1',
      sourceDirectory, createdAt: new Date().toISOString(), cases: [], coverage: [],
      status: 'waiting_for_complete_round_every_arm', arm,
      sourceVersion: completeRoundCohort.sourceVersion, completeRoundCohortPath,
      fullRoundObservationAvailableEveryArm: false,
      performancePromotionAdmitted: false, providerCalls: 0, rulesExecutions: 0,
      originalRoomWrites: 0, providerHistoryDecoded: false, trainingTruth: false };
    await writeFile(outputPath, JSON.stringify(pending), { mode: 0o600 });
    console.log(JSON.stringify({ outputPath, ...pending }));
    process.exit(0);
  }
}
const timings = (await readFile(path.join(sourceDirectory,
  'bot-stage-timings.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse);
const decisions = [];
for (const side of ['player1', 'player2']) {
  const db = new DatabaseSync(path.join(sourceDirectory, 'seats', side,
    'provider/live-decisions.sqlite'), { readOnly: true });
  try {
    for (const row of db.prepare('SELECT record_json FROM sc_live_decision_records').all()) {
      decisions.push(...Object.values(decodeStarcraftTmgLiveDecisionRecordV1(
        row.record_json).decisions));
    }
  } finally { db.close(); }
}
function requestsFromOutput(output) {
  const jsonRequests = output?.query_requests?.requests
    || output?.queryRequests?.requests || [];
  const calls = output?.toolCalls || output?.nativeToolCalls || [];
  const requests = [...jsonRequests];
  for (const call of calls) {
    try {
      const args = typeof call.function?.arguments === 'string'
        ? JSON.parse(call.function.arguments) : call.arguments;
      if (args?.queryKind && args?.argumentsJson) requests.push({
        requestId: args.requestId, queryKind: args.queryKind,
        arguments: JSON.parse(args.argumentsJson),
      });
    } catch { /* Unrecoverable originals stay explicit, never guessed. */ }
  }
  return requests;
}
function originalRequests(decision, receipt) {
  const requests = Object.values(decision.attempts || {}).flatMap(a =>
    requestsFromOutput(a.safeOutput)).filter(q => q.queryKind === receipt.queryKind);
  const result = receipt.result || {};
  if (!requests.length && receipt.queryKind === 'space.solve_formation'
    && decision.plannerResult?.formationSearchRequest) {
    const search = decision.plannerResult.formationSearchRequest;
    requests.push({ requestId: `host-required-formation-${decision.choiceKey}`,
      queryKind: receipt.queryKind, arguments: { domainId: result.domainId,
        maximumOptions: Number(search.maximumOptions || 4),
        ...(search.preferredAnchor ? { preferredAnchor: search.preferredAnchor } : {}),
        tacticalPurpose: String(search.tacticalPurpose || ''),
        formationObjectives: search.formationObjectives || [] },
    });
  }
  if (!requests.length && receipt.queryKind === 'legal_asset_placement_options'
    && decision.plannerResult?.assetPlacementSearchRequest) {
    const search = decision.plannerResult.assetPlacementSearchRequest;
    requests.push({ requestId: `host-required-asset-placement-${decision.choiceKey}`,
      queryKind: receipt.queryKind, arguments: { domainId: result.domainId,
        maximumOptions: Number(search.maximumOptions || 4),
        ...(search.preferredAnchor ? { preferredAnchor: search.preferredAnchor } : {}),
        tacticalPurpose: String(search.tacticalPurpose || '') } });
  }
  if (!requests.length && receipt.queryKind === 'instantiate_parameterized_action'
    && decision.completedDecision?.proposal?.kind === 'parameterized'
    && decision.completedDecision.proposal.domainId === result.domainId) {
    const proposal = decision.completedDecision.proposal;
    requests.push({ requestId: `validate-final-proposal-${Number(decision.proposalValidationRounds || 1)}`,
      queryKind: receipt.queryKind, arguments: { domainId: proposal.domainId,
        parameters: proposal.parameters } });
  }
  const unique = new Map(requests.map(r => [hash({ queryKind: r.queryKind,
    arguments: r.arguments }), r]));
  return [...unique.values()].filter(r => {
    const args = r.arguments || {};
    const suppliedDomain = args.domainId || args.candidateId || args.proposal?.domainId;
    if (result.domainId && suppliedDomain && result.domainId !== suppliedDomain) return false;
    if (result.canonicalParameters?.targetUnitId && args.parameters?.targetUnitId
      && result.canonicalParameters.targetUnitId !== args.parameters.targetUnitId) return false;
    if (result.scope && args.subjectUnitIds
      && hash([...args.subjectUnitIds].sort()) !== hash([...result.scope.subjectUnitIds].sort())) return false;
    if (result.scope?.requestedTargetIds && args.targetIds
      && hash([...args.targetIds].sort()) !== hash([...result.scope.requestedTargetIds].sort())) return false;
    return true;
  });
}
if (cohortArm) {
  // Quantiles were fixed by the authority-clock collector. Preserve every
  // selected identity/band, including missing or ambiguous original inputs;
  // never reselect the median among the requests easiest to recover.
  const cases = [];
  const coverage = [];
  for (const group of cohortArm.cohort) {
    const groupCases = [];
    for (const selected of group.selected) {
      const timing = timings.find(row => row.operation === 'spatial_query_backend'
        && row.roomId === selected.roomId && row.seatKey === selected.seatKey
        && row.stateRevision === selected.preStateRevision
        && row.queryKind === selected.queryKind
        && row.queryReceiptHash === selected.queryReceiptHash
        && row.recordedAt === selected.recordedAt);
      const decision = timing ? decisions.find(row =>
        row.authority?.roomId === selected.roomId
        && row.authority?.seatKey === selected.seatKey
        && row.authority?.stateRevision === selected.preStateRevision
        && row.authority?.stateHash === selected.preStateHash
        && row.queryReceipts?.some(receipt =>
          receipt.queryReceiptHash === selected.queryReceiptHash)) : null;
      const receipt = decision?.queryReceipts.find(row =>
        row.queryReceiptHash === selected.queryReceiptHash);
      const requests = receipt ? originalRequests(decision, receipt) : [];
      const status = !timing ? 'original_timing_missing'
        : !receipt ? 'missing_complete_historical_receipt'
        : receipt.ok !== true || receipt.status === 'unknown' || receipt.result == null
          ? 'original_receipt_not_successful'
          : requests.length !== 1 ? 'original_request_ambiguous_or_missing'
            : 'ready_for_signed_state_restore';
      const entry = { caseId: `${arm}-${selected.actionType}-${selected.queryKind.replaceAll('.', '-')}-${selected.preStateRevision}-${cases.length}`,
        kind: selected.queryKind, actionType: selected.actionType, arm, round: selected.round,
        cohortObservationId: selected.observationId, bands: selected.bands,
        historicalCount: group.totalObservations,
        eligibleHistoricalCount: group.successfulObservations,
        timing: timing || null, selectedTiming: selected, status,
        originalRequestCandidates: requests, originalReceipt: receipt || null,
        originalAuthority: decision?.authority || null,
        originalReceiptHash: receipt ? hash(receipt) : null,
        requestOrigin: requests.length !== 1 ? null
          : requests[0].requestId?.startsWith('host-required-')
            ? 'original_stored_planner_contract_and_host_recipe'
            : 'original_paid_model_safe_output_or_completed_proposal',
      };
      cases.push(entry);
      groupCases.push(entry);
    }
    coverage.push({ type: group.type, selected: groupCases.length,
      recoverableSelections: groupCases.filter(row =>
        row.status === 'ready_for_signed_state_restore').length,
      missingOrAmbiguousSelections: groupCases.filter(row =>
        row.status !== 'ready_for_signed_state_restore').map(row =>
        ({ cohortObservationId: row.cohortObservationId, status: row.status })),
      totalObservations: group.totalObservations,
      unknownOrFailedObservations: group.unknownOrFailedObservations });
  }
  const authority = await extractTicket23AuthorityPerformanceCasesV1({ sourceDirectory, cohortArm });
  const authorityCases = authority.cases;
  const authorityCoverage = authority.coverage;
  const selectedInputsReady = cases.length + authorityCases.length > 0
    && cases.every(row => row.status === 'ready_for_signed_state_restore')
    && authorityCases.every(row => row.status === 'ready_for_signed_authority_state_restore');
  const report = { schemaVersion: 'starcraft_tmg_real_per_type_performance_cases_v1',
    sourceDirectory, createdAt: new Date().toISOString(), cases, coverage, arm,
    authorityCases, authorityCoverage, actionPipelineCoverage: authority.actionPipelineCoverage,
    sourceVersion: completeRoundCohort.sourceVersion, completeRoundCohortPath,
    fullRoundObservationAvailableEveryArm: true,
    status: selectedInputsReady ? 'selected_complete_round_requests_ready' : 'selected_original_capture_pending',
    selectionPolicy: 'Exact authority-clock cohort identities and bands; no quantile reselection or replacement for missing/ambiguous original requests.',
    signedStateRestoreAndFullReplayCaptureStillRequired: true,
    wholeActionAndModelTimingCaptureStillRequired: true,
    historicalTimingIsNotControlledAB: true, performancePromotionAdmitted: false,
    providerCalls: 0, rulesExecutions: 0, originalRoomWrites: 0,
    hiddenChainOfThoughtStored: false, trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify({ outputPath, arm, status: report.status, coverage, authorityCoverage,
    cases: cases.map(({ caseId, kind, actionType, bands, status }) =>
      ({ caseId, kind, actionType, bands, status })),
    authorityCases: authorityCases.map(({ caseId, actionType, stageSelections, status }) =>
      ({ caseId, actionType, selectedStages: stageSelections.length, status })),
    performancePromotionAdmitted: false, providerCalls: 0, rulesExecutions: 0,
    originalRoomWrites: 0 }));
  process.exit(0);
}
const groups = new Map();
for (const timing of timings) {
  if (timing.operation !== 'spatial_query_backend' || !timing.queryReceiptHash) continue;
  if (!groups.has(timing.queryKind)) groups.set(timing.queryKind, []);
  groups.get(timing.queryKind).push(timing);
}
const cases = [];
const coverage = [];
for (const [kind, group] of groups) {
  group.sort((a, b) => a.elapsedMs - b.elapsedMs || a.recordedAt.localeCompare(b.recordedAt));
  // Failed/unknown validation shortcuts must not stand in for actual computation.
  // Keep their population counts; select quantiles within fully recoverable,
  // successful real requests, never silently invent an ambiguous input.
  const recovered = group.map(timing => {
    const decision = decisions.find(d => d.authority?.seatKey === timing.seatKey
      && d.authority?.stateRevision === timing.stateRevision
      && d.queryReceipts?.some(q => q.queryReceiptHash === timing.queryReceiptHash));
    const receipt = decision?.queryReceipts.find(q => q.queryReceiptHash === timing.queryReceiptHash);
    const requests = receipt ? originalRequests(decision, receipt) : [];
    return { timing, decision, receipt, requests };
  });
  const successful = r => r.receipt?.ok === true && r.receipt.status !== 'unknown'
    && r.receipt.result != null;
  const eligible = recovered.filter(r => successful(r) && r.requests.length === 1);
  coverage.push({ kind, total: group.length, eligible: eligible.length,
    unknownOrFailed: recovered.filter(r => !successful(r)).length,
    ambiguousOrMissingOriginalRequest: recovered.filter(r => successful(r) && r.requests.length !== 1).length,
    wholePopulationMedianElapsedMs: group[Math.floor((group.length - 1) / 2)].elapsedMs,
    wholePopulationExtremeElapsedMs: group.at(-1).elapsedMs });
  if (!eligible.length) continue;
  for (const [band, index] of [['short', 0], ['median', Math.floor((group.length - 1) / 2)],
    ['extreme', eligible.length - 1]]) {
    const selectedIndex = band === 'median' ? Math.floor((eligible.length - 1) / 2) : index;
    const { timing, decision, receipt, requests } = eligible[selectedIndex];
    const prior = cases.find(c => c.timing.queryReceiptHash === timing.queryReceiptHash);
    if (prior) { prior.bands.push(band); continue; }
    cases.push({ caseId: `${kind.replaceAll('.', '-')}-${band}-${timing.stateRevision}`,
      kind, bands: [band], historicalCount: group.length, eligibleHistoricalCount: eligible.length, timing,
      status: !receipt ? 'missing_complete_historical_receipt'
        : requests.length !== 1 ? 'original_request_ambiguous_or_missing' : 'ready_for_signed_state_restore',
      originalRequestCandidates: requests, originalReceipt: receipt || null,
      originalAuthority: decision?.authority || null,
      originalReceiptHash: receipt ? hash(receipt) : null,
      requestOrigin: requests[0]?.requestId?.startsWith('host-required-formation-')
        ? 'original_stored_planner_contract_and_host_recipe' : 'original_paid_model_safe_output',
    });
  }
}
const report = { schemaVersion: 'starcraft_tmg_real_per_type_performance_cases_v1',
  sourceDirectory, createdAt: new Date().toISOString(), cases, coverage,
  selectionPolicy: 'Each type independently among successful requests with exactly recoverable original parameters: shortest, lower median, longest; full population quantiles/unknown/ambiguous counts also retained. Duplicate identities share bands, not fabricated samples.',
  historicalTimingIsNotControlledAB: true, providerCalls: 0, originalRoomWrites: 0,
  hiddenChainOfThoughtStored: false, trainingTruth: false };
await writeFile(outputPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify({ outputPath, coverage, cases: cases.map(c => ({ caseId: c.caseId,
  kind: c.kind, bands: c.bands, count: c.historicalCount, status: c.status,
  requestCandidates: c.originalRequestCandidates.length, oldElapsedMs: c.timing.elapsedMs })),
  providerCalls: 0, originalRoomWrites: 0 }));
