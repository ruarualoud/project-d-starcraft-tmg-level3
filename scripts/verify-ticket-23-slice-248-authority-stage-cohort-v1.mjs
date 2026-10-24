// Concrete omission: actual A99 finish_activation has no tool query, so the
// existing per-round selection block returns no performance case for it.
// Execute that exact source block on the saved native receipt/UI/timings; this
// is not a completed-round claim and does not execute Rules or open a new Room.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { createStarcraftTmgRefereeCrypto, hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [inputPath] = process.argv.slice(2);
assert(inputPath, 'explicit original omission input required');
const input = JSON.parse(await readFile(inputPath, 'utf8'));
assert.equal(input.receipt.action.actionType, 'finish_activation');
assert.equal(input.ui.providerCalls, 0);
assert.equal(input.fullRoundFixture, false);
const privateState = JSON.parse(await readFile(path.join(input.originalDirectory,
  'runner-private.json'), 'utf8'));
const crypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem,
  hmacSecret: privateState.refereeHmacSecret,
  keyId: input.receipt.refereeSignature.keyId,
  trustLevel: 'development_persistent',
});
const { journalHash, refereeSignature, audit, ...receiptCore } = input.receipt;
assert(crypto.verify(receiptCore, refereeSignature, 'accepted_receipt'));
assert.equal(hash({ receipt: receiptCore, refereeSignature }), journalHash);
assert.equal(input.ui.receiptHash, journalHash);
assert.equal(input.ui.postStateHash, input.receipt.postStateHash);

const collectorPath = new URL('./collect-ticket-23-complete-round-performance-cohort-v1.mjs', import.meta.url);
const source = await readFile(collectorPath, 'utf8');
const bandsStart = source.indexOf('function selectBands(rows)');
const bandsEnd = source.indexOf('\nconst arms = []', bandsStart);
const bodyStart = source.indexOf('    const actionByPreRevision = ');
const bodyEnd = source.indexOf('\n  }\n  arms.push', bodyStart);
assert(bandsStart >= 0 && bandsEnd > bandsStart && bodyStart >= 0 && bodyEnd > bodyStart);
let helper = {};
try {
  helper = await import(new URL('./support/ticket23-authority-stage-cohort-v1.mjs', import.meta.url));
} catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

async function selection(fixture) {
  const context = {
    arm: fixture.arm,
    round: fixture.receipt.preGameClock.round,
    originalBoundary: { roomId: fixture.receipt.roomId },
    actions: [{ receipt: fixture.receipt }],
    timings: { rows: fixture.timings },
    byReceipt: new Map([[fixture.receipt.journalHash, fixture.ui]]),
    directory: fixture.originalDirectory,
    cohort: [], authorityStageCapture: [], authorityStageCohort: [], actionPipelineCohort: [],
    ...helper,
  };
  const result = await vm.runInNewContext(`(async () => {
    ${source.slice(bandsStart, bandsEnd)}
    ${source.slice(bodyStart, bodyEnd)}
    return { cohort, authorityStageCapture, authorityStageCohort, actionPipelineCohort };
  })()`, context);
  return JSON.parse(JSON.stringify(result));
}
const selected = await selection(input);
console.log(JSON.stringify({ operation: 'actual_A99_authority_stage_omission',
  receiptHash: journalHash, nativeReceiptSignatureVerified: true,
  spatialQueryGroups: selected.cohort.length,
  authorityActions: selected.authorityStageCapture.length,
  authorityStageGroups: selected.authorityStageCohort.length,
  actionWindowGroups: selected.actionPipelineCohort.length,
  fullRoundFixture: false, performancePromotionAdmitted: false,
  providerCalls: 0, rulesExecutions: 0, originalRoomWrites: 0 }));
assert.equal(selected.authorityStageCapture.length, 1,
  'ACCEPTED_NO_QUERY_ACTION_OMITTED_FROM_PERFORMANCE_COHORT');
const captured = selected.authorityStageCapture[0];
assert.equal(captured.receiptHash, journalHash);
assert.equal(captured.authorityTimingStatus, 'complete');
assert.deepEqual(captured.authorityStages.map(row => [row.operation, row.elapsedMs]), [
  ['preview_action', 17000], ['apply_action', 26683], ['replay_room', 34376],
]);
assert.equal(captured.decisionToMemoryWindow.elapsedMs, 91836);
assert.equal(captured.webEvidenceSpan.status, 'complete');
assert(selected.authorityStageCohort.every(row => row.selected.length === 1));

const ambiguous = structuredClone(input);
const oldPreview = ambiguous.timings.find(row => row.operation === 'preview_action');
ambiguous.timings.push({ ...oldPreview, elapsedMs: 1,
  recordedAt: new Date(Date.parse(oldPreview.recordedAt) - 1000).toISOString() });
const duplicateResult = await selection(ambiguous);
assert.equal(duplicateResult.authorityStageCapture[0].authorityTimingStatus, 'pending');
assert(duplicateResult.authorityStageCapture[0].reasons.includes('ambiguous_stage:preview_action'));
assert.equal(duplicateResult.authorityStageCohort.find(row => row.type[1] === 'preview_action').selected.length, 0,
  'a fast failed/duplicate attempt must not replace the original stage');

const missing = structuredClone(input);
missing.timings = missing.timings.filter(row => row.operation !== 'replay_room');
const missingResult = await selection(missing);
assert(missingResult.authorityStageCapture[0].reasons.includes('missing_stage:replay_room'));
assert.equal(missingResult.authorityStageCohort.find(row => row.type[1] === 'replay_room').selected.length, 0);
console.log(JSON.stringify({ actualSavedNoQueryActionCaptured: true,
  exactThreeStageTimingsPreserved: true, ambiguityAndMissingEvidenceRetained: true,
  fullRoundBranchVerified: false, wallTimeOrStrategyAdmission: false }));
