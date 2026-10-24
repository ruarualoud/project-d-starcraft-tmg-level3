// The actual summary requested all 152,796 queryReceipt characters just to
// distinguish a bounded search miss from proven impossibility.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
const root=process.argv[2];
const raw=JSON.parse(await readFile(`${root}/artifacts/5fbc0926148c0952ca7c1c30feb01ddae6a44751827e7eedabf7079eb80f1bac.json`,'utf8'));
const before=structuredClone(raw),native=raw.value.receipt.queryReceipt.result;
const view=projectRosterWorkflowReceiptViewV1({evidenceId:'captured-native',value:raw.value,conditions:raw.conditions});
assert.ok(view.formationOptionDirectory.searchOutcome,'bounded query outcome must be readable without expanding every rejected anchor');
const outcome=view.formationOptionDirectory.searchOutcome;
assert.deepEqual(outcome.search,native.search);
assert.equal(outcome.noLegalFormationProven,false);
assert.equal(outcome.arrivalOrMovementLegalityProven,false);
assert.equal(outcome.missCount,128);
assert.equal(outcome.misses.reduce((n,row)=>n+row.count,0),128);
for(const group of outcome.misses)for(const source of group.sources){
  const miss=native.misses[source.index];
  assert.equal(group.reason,miss.reason??null);
  assert.equal(group.anchorRejectionReason,miss.diagnostic?.anchorRejection?.reason??null);
  assert.equal(source.pointer,`/receipt/queryReceipt/result/misses/${source.index}`);
}
assert.equal(view.formationOptionDirectory.optionCount,0);
assert.ok(JSON.stringify(outcome).length<JSON.stringify(raw.value.receipt.queryReceipt).length/4);
assert.deepEqual(raw,before,'no modification of Native receipt');
const unknown=projectRosterWorkflowReceiptViewV1({evidenceId:'unknown',value:{operation:'spatial',status:'returned_to_model',
  receipt:{queryKind:'space.solve_static_formation',resultStatus:'unknown'}}});
assert.equal(unknown.formationOptionDirectory.optionCount,null,'missing output must not become zero candidates');
assert.equal(unknown.formationOptionDirectory.searchOutcome,null,'no fabricated Native result for failed queries');
console.log(JSON.stringify({pass:true,actualMisses:128,exactSearchAndProofFlags:true,missPointersRetained:true,
  outcomeCharacters:JSON.stringify(outcome).length,originalQueryCharacters:JSON.stringify(raw.value.receipt.queryReceipt).length,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
