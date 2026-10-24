// Actual744/749/753 re-inspected the identical branch/menu. Compare complete
// actual Native receipts, not the role's assertion that its probe is different.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as progress from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const matches=state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready'
  &&w.id.startsWith('p5-current-obligations-v577:r2:map_and_arrival')&&w.inputs.request.value.operation==='inspect');
const [prior,current]=matches.slice(-2),old=await get(prior.resultRef),actual=await get(current.resultRef);
assert.deepEqual(actual.value.receipt,old.value.receipt);assert.deepEqual(actual.value.request,old.value.request);
assert.equal(typeof progress.findCompletedRosterInspectObservationV1,'function','same Inspect was not routed into no-new-information reconciliation');
const fixture={...state,work:[prior]},memory=new Map([[prior.resultRef,old]]);
const store={load:async()=>fixture,get:async ref=>memory.get(ref)??get(ref)};
const input={store,descriptor:{sourceStateHash:actual.value.receipt.sourceStateHash},args:actual.value.request,
  receipt:actual.value.receipt,contextRef:actual.value.contextRef,scope:current.bindings,excludeWorkId:current.id};
const found=await progress.findCompletedRosterInspectObservationV1(input);assert.equal(found.originalResultRef,prior.resultRef);
const changed=structuredClone(actual.value.receipt);changed.queryContracts={...changed.queryContracts,newCapability:'fixture'};
assert.equal(await progress.findCompletedRosterInspectObservationV1({...input,receipt:changed}),null,'a changed executable contract is new information');
assert.equal(await progress.findCompletedRosterInspectObservationV1({...input,args:{...input.args,seatKey:'player2'}}),null);
assert.equal(await progress.findCompletedRosterInspectObservationV1({...input,contextRef:'another-candidate'}),null);
assert.equal(await progress.findCompletedRosterInspectObservationV1({...input,scope:{...input.scope,map:'changed-map'}}),null);
const ownerId='fixture-current-owner',toolId='fixture-inspect',eid='tool-view:'+toolId;
memory.set('fixture-inspect',{value:{...actual.value,queryReuse:{...found,newObservation:false,readOnlyInspectionExecuted:true}}});
fixture.work.push({id:toolId,resultRef:'fixture-inspect'},
  {id:ownerId,experimentGoalId:'fixture-question',inputs:{batchToolSource0:{source:'evidence',id:eid,pointer:''}}});
fixture.evidence=[{id:eid}];
const context=await progress.projectRosterRepeatedObservationContextV1({assignment:{workId:ownerId},store});
assert.equal(context.repeated[0].operation,'inspect');assert.equal(context.repeated[0].newObservation,false);
const next=progress.projectRosterExperimentProgressInputsV1({inputs:{question:{value:'original question'},
  previousBatch:{value:{ownerWorkId:'prior',sourceEvidenceId:'role:prior',publicReason:'Repeat the same query'}}},progress:context});
assert.equal(next.task.value.stage,'reconcile_repeated_observation');assert(!next.previousBatch.value.publicReason);
assert.equal(next.question.value,'original question');
console.log(JSON.stringify({status:'passed',actualIdenticalInspectPair:true,completeReceiptComparison:true,
  changedContractsNotReused:true,currentQuestionPreserved:true,progressRecoverySelected:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
