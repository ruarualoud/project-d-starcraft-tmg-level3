import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterToolReceiptReferenceV1 } from '../packages/roster-strategist/roster-plan-contracts-v1.mjs';
const source=await fs.readFile(new URL('../packages/roster-strategist/roster-strategist-runtime-v1.mjs',import.meta.url),'utf8');
const start=source.indexOf('  async function executeInformationNeed(');
const end=source.indexOf('  // --------------------------------------------------------- deliberation',start);
assert.ok(start>=0&&end>start);
const calls=[...source.matchAll(/await executeInformationNeed\([\s\S]*?\);/g)].map(m=>m[0]);
assert.equal(calls.length,2,'Both initial and revised Foundation must use the common executor');
const captured=[];
const evidencePort={async query(query){captured.push(query);return {status:'unknown',
  schema:'starcraft_tmg_roster_teach_evidence_receipt_v1',requestKind:'spatial',
  unknownReasonCode:'TEST_ISOLATED_QUERY',receiptHash:'d'.repeat(64)};}};
const need={needId:'real-revised-query',kind:'spatial',questionText:'Read current evidence',toolRequest:{}};
const foundationTrace={outputHash:'a'.repeat(64),informationNeedOutcomes:[]};
const revisionTrace={revisedFoundationHash:'b'.repeat(64),informationNeedOutcomes:[]};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
await new AsyncFunction('clone','freezeDeep','createRosterToolReceiptReferenceV1','labDescriptor',
  'need','evidencePort','branchByNeedId','toolReceipts','foundationTrace','revisionTrace',
  source.slice(start,end)+'\n'+calls.join('\n'))(structuredClone,Object.freeze,
  createRosterToolReceiptReferenceV1,{laboratoryId:'caller-contract-test',sourceStateHash:'c'.repeat(64)},
  need,evidencePort,new Map(),[],foundationTrace,revisionTrace);
assert.deepEqual(captured.map(row=>row.initialFoundationHash),['a'.repeat(64),'b'.repeat(64)]);
assert.equal(foundationTrace.informationNeedOutcomes.length,1);
assert.equal(revisionTrace.informationNeedOutcomes.length,1);
console.log(JSON.stringify({passed:true,initialAndRevisedCallersVerified:true,checks:3,
  providerCalls:0,nativeActions:0,isolatedSourceCallBoundary:true}));
