// Actual v147 Native casualty evidence is lost by the large-receipt prompt projection.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { projectRosterTeachPromptEvidenceV1 as project } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const base = process.argv[2];
const observation = JSON.parse(await fs.readFile(base + '/common-v147-native-chance-successor-green2.private.json', 'utf8'));
const nativeRows = observation.receipts.filter(row => ['v147-open-loss-choice','v147-settled-loss'].includes(row.name));
const before = JSON.stringify(nativeRows);
const started = performance.now();
const archive = new Map();
const projected = project(nativeRows.map(row => row.receipt), archive);
const report = { providerCalls: 0, nativeExecutions: 0, roomActions: 0 };
try {
  for (let i=0; i<nativeRows.length; i++) {
    const source = nativeRows[i].receipt.sourceReceipt;
    const evidence = projected[i].nativeActionEvidence?.find(row => row.sourceReceiptHash === source.receiptHash);
    assert(evidence, 'Native successor evidence hidden behind archive-only large receipt');
    assert.equal(evidence.branchStateHash, source.branchStateHash);
    assert.deepEqual(evidence.nativeEvents, source.nativeEvents);
    assert.equal(evidence.conditionalOnParent, true);
    assert.equal(evidence.provenArrivalHistory, false);
    assert.equal(evidence.wholeQuestionAnswered, false);
    const pieces = source.stateChanges.find(change => change.key === 'pieces')?.value;
    if (pieces) for (const piece of pieces) {
      const unit = evidence.postStateUnits.find(row => row.unitId === piece.id);
      assert.equal(unit.currentModels, piece.currentModels);
      assert.equal(unit.currentSupply, piece.currentSupply);
      assert.deepEqual(unit.destroyedModelIds, piece.destroyedModelIds);
    }
    if (source.nativeOutcomeAssumption) {
      assert.deepEqual(evidence.nativeOutcomeAssumption, source.nativeOutcomeAssumption);
      assert.equal(evidence.outcomeProbability, null);
    }
  }
  const settled = projected[1];
  assert.equal(settled.followUpReceipts[0].receipt.queryReceipt.status, 'exact');
  assert.deepEqual(settled.followUpReceipts[0].receipt.queryReceipt.result,
    nativeRows[1].receipt.followUpReceipts[0].receipt.queryReceipt.result);
  // Repeated references still expose essential native observations.
  const repeated = project([nativeRows[1].receipt, nativeRows[1].receipt], new Map());
  assert.deepEqual(repeated[1].nativeActionEvidence, repeated[0].nativeActionEvidence);
  assert.equal(repeated[1].sameContentAsEarlierObject, true);
  assert.equal(JSON.stringify(nativeRows), before, 'Historical evidence must not be rewritten');
  const target = projected[1].nativeActionEvidence[0].postStateUnits.find(row => row.unitId === 'player2-kerrigan-raptor');
  assert.equal(target.currentModels, 5);
  assert.equal(target.currentSupply, 1);
  Object.assign(report, { status: 'PASS', actualCasualtyEvidenceVisible: true,
    controlResultPreserved: true, originalEvidenceUnchanged: true,
    wholeStrategicQuestionNotCertified: true });
} catch(error) {
  Object.assign(report,{status:'FAIL',reason:error.message});process.exitCode=1;
}
report.elapsedMs = performance.now()-started;
report.inputBytes = Buffer.byteLength(before);
report.projectedBytes = Buffer.byteLength(JSON.stringify(projected));
await fs.writeFile(base + '/common-v148-native-evidence-projection-' + process.argv[3] + '.private.json',
  JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
console.log(JSON.stringify(report));
