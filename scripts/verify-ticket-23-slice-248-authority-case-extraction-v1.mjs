// Specific downstream omission repro, using saved A99 rather than a fake game.
// No complete-round claim, Rules execution, Provider call or original Room write.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildTicket23AuthorityStageCohortV1 } from
  './support/ticket23-authority-stage-cohort-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
const source = await readFile(new URL('./collect-ticket-23-real-performance-cases-v1.mjs', import.meta.url), 'utf8');
const branchStart = source.indexOf('if (cohortArm) {');
const branchEnd = source.indexOf('\nconst groups = new Map();', branchStart);
assert(branchStart >= 0 && branchEnd > branchStart);
let helper = {};
try {
  helper = await import(new URL('./support/ticket23-authority-performance-case-extraction-v1.mjs', import.meta.url));
} catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const captured = await buildTicket23AuthorityStageCohortV1({
  arm: input.arm, round: input.receipt.preGameClock.round,
  actions: [{ receipt: input.receipt }], timings: input.timings,
  uiByReceipt: new Map([[input.receipt.journalHash, input.ui]]),
  directory: input.originalDirectory,
  // A single original observation has all three bands. No quantile reselection.
  selectBands: rows => rows.map(row => ({ ...row, bands: ['short', 'median', 'extreme'] })),
});
const cohortArm = { arm: input.arm, cohort: [],
  authorityStageCapture: captured.captures,
  authorityStageCohort: captured.authorityStageCohort,
  actionPipelineCohort: captured.actionPipelineCohort };
async function extract(fixture) {
  let report;
  const stop = {};
  const context = { cohortArm: fixture, arm: input.arm, timings: input.timings,
    decisions: [], sourceDirectory: input.originalDirectory,
    outputPath: 'private-in-memory-only', completeRoundCohortPath: 'actual-partial-A99-fixture',
    completeRoundCohort: { sourceVersion: 'fixture_not_complete_round' }, hash,
    writeFile: async (_, text) => { report = JSON.parse(text); },
    console: { log() {} }, process: { exit() { throw stop; } }, ...helper };
  try { await vm.runInNewContext(`(async () => { ${source.slice(branchStart, branchEnd)} })()`, context); }
  catch (error) { if (error !== stop) throw error; }
  return report;
}
const result = await extract(cohortArm);
console.log(JSON.stringify({ operation: 'actual_A99_downstream_authority_case_omission',
  spatialCases: result.cases.length, authorityCases: result.authorityCases?.length || 0,
  fullRoundFixture: false, performancePromotionAdmitted: false,
  rulesExecutions: 0, providerCalls: 0, originalRoomWrites: 0 }));
assert.equal(result.authorityCases?.length || 0, 1,
  'NO_QUERY_AUTHORITY_CASE_DROPPED_BY_REAL_REQUEST_EXTRACTOR');
const entry = result.authorityCases[0];
assert.equal(entry.status, 'ready_for_signed_authority_state_restore');
assert.deepEqual(entry.originalReceipt, input.receipt);
assert.deepEqual(entry.originalProposal, input.receipt.proposal);
assert.deepEqual(entry.originalChanceReveal, input.receipt.chanceReveal);
assert.equal(entry.nativeReceiptSignatureVerified, true);
assert.equal(entry.stageSelections.length, 3);
assert.deepEqual(entry.stageSelections.map(row => [row.operation, row.elapsedMs]), [
  ['preview_action', 17000], ['apply_action', 26683], ['replay_room', 34376],
]);
assert.equal(result.authorityCoverage.length, 3);

const missing = structuredClone(cohortArm);
const first = missing.authorityStageCohort[0].selected[0];
first.receiptHash = 'missing-original-native-receipt';
const missingResult = await extract(missing);
const pending = missingResult.authorityCases.find(row =>
  row.receiptHash === 'missing-original-native-receipt');
assert.equal(pending.status, 'original_native_receipt_missing');
assert.equal(pending.stageSelections[0].observationId, first.observationId);
assert.deepEqual(pending.stageSelections[0].bands, first.bands);
assert.equal(pending.stageSelections[0].elapsedMs, first.elapsedMs);
console.log(JSON.stringify({ downstreamNativeReceiptProposalAndDicePreserved: true,
  threeStageSelectionsShareOneOriginalCase: true, missingOriginalRetainedWithoutReselection: true,
  fullRoundBranchVerified: false, pairedRuntimeExecutionVerified: false,
  performancePromotionAdmitted: false }));
