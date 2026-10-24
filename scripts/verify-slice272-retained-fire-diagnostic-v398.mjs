import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {organizeRosterTeachFactEvidenceV1} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=draft.teachFramework.state.investigation;
const id='teach-kerrigan-goliath-marauder-fire-zone-recovery-2';
const receipt=state.evidence.find(row=>row.challengeId===id);
const before=JSON.stringify(receipt);
const view=organizeRosterTeachFactEvidenceV1({receipts:[receipt],requests:state.operations,
  latestQueryIds:[],archive:new Map()});
assert.equal(view.querySelectionDiagnostics?.[0]?.selection?.subjects[0].sameSideAsQuerySeat,false,
  'saved empty result must expose its actual selected-side mismatch without replay');
assert.equal(view.querySelectionDiagnostics[0].originalReceiptHash,receipt.receiptHash);
assert.equal(view.querySelectionDiagnostics[0].nativeExecutions,0);
assert.equal(JSON.stringify(receipt),before);
const mismatched=structuredClone(receipt);mismatched.queryRepair.baseStateHash='different-scene';
assert.equal(organizeRosterTeachFactEvidenceV1({receipts:[mismatched],requests:state.operations,
  latestQueryIds:[],archive:new Map()}).querySelectionDiagnostics.length,0);
console.log(JSON.stringify({passed:true,actualFailure:177,originalReceiptUnchanged:true,
  noCrossSceneDiagnostic:true,nativeExecutions:0,providerCalls:0}));
