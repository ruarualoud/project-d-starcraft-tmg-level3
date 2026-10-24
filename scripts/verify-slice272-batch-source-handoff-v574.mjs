// Actual89 received a summary but no navigable direct source receipt. It kept
// selecting summary311 instead of Native310. Check product owner construction.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterExperimentOwnerContinuationV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const owner=state.work.find(w=>w.id==='p3-observed-menu-arrival-proof-v573');
const result=JSON.parse(await fs.readFile(path.join(base,'artifacts',owner.resultRef+'.json'),'utf8'));
const summary=owner.id+':order0:summary',expected='tool-view:'+owner.id+':order0:deploy-marine1';
const fixture={...state,work:state.work.filter(w=>w.id!==owner.id+':owner')};
const next=createRosterExperimentOwnerContinuationV1({state:fixture,owner,result,summaryIds:[summary],tools:{}});
assert.deepEqual(next.inputs.batchToolSource0,{source:'evidence',id:expected,pointer:''},
  'fan-in must preserve a direct readable Native view in addition to model summary');
assert.equal(next.inputs.batchFacts0.id,'role:'+summary);
const owner2={...owner,id:'next',inputs:{...owner.inputs,...next.inputs}};
const next2=createRosterExperimentOwnerContinuationV1({state:fixture,owner:owner2,result,summaryIds:[],tools:{}});
assert.equal(Object.keys(next2.inputs).filter(k=>/^batchToolSource\d+$/.test(k)).length,0,'prior-batch source inputs must not accumulate');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,actualRequest:89,directNativeSourceRetained:true,
  modelSummaryRetained:true,noHistoryAccumulation:true,providerCalls:0,productionWrites:0}));
