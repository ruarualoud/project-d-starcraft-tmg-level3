// Actual baseline was Native-legal, but its dependent branch guard compared
// /receipt/status to "completed". False guards must return control, not stall.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1,projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const directory=process.argv[2],run=JSON.parse(await fs.readFile(path.join(directory,'product-run.json'),'utf8'));
const base=path.join(directory,'workspace/decision-workflows',run.workflowId);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id.endsWith('input-repair:order0:branches-around-baseline'));assert.ok(work);
const saved=await get(work.resultRef),before=JSON.stringify(saved);assert.equal(saved.value.reason,'guard_mismatch');
assert.ok(projectRosterWorkflowToolRepairV1(saved.value)?.correctable,'the retained failed prerequisite must return to the existing method/repair owner');
const assignment=await get(work.inputRef);assert.equal(assignment.inputs.guard0.value,'legal');
assert.equal(assignment.inputs.request.value.guards[0].expected,'completed');
let dispatched=0,next=0;const memory=new Map();
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):get(ref),
  put:async value=>{const ref='guard-memory-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowLaboratoryExecutorV1({store,
  laboratory:{labDescriptor:()=>({sourceStateHash:assignment.scope.source,rulesRuntimeHash:assignment.scope.rules,builderBundleHash:assignment.scope.army})},
  builderPort:{evaluateRosterCandidate:()=>{dispatched++;throw Error('UNEXPECTED_AUDIT');},enumerateArmyBuildingChoices:()=>{dispatched++;throw Error('UNEXPECTED_MENU');}},
  getCandidateInput:async()=>{dispatched++;throw Error('UNEXPECTED_CANDIDATE_READ');}});
const result=await executor.execute(assignment,{operationState:{},checkpointOperation:async()=>{}});
assert.equal(result.value.operation,'builder_branches');assert.equal(result.value.executed,false);assert.equal(result.continuation,true);
assert.equal(result.value.mismatches[0].expected,'completed');assert.equal(result.value.mismatches[0].actualValue,'legal');
assert.ok(result.value.mismatches[0].sourceWorkId);assert.ok(result.value.queryRepair.correctable);
assert.equal(dispatched,0,'false guard cannot dispatch the guarded query or replay the legal audit');assert.equal(JSON.stringify(saved),before);
console.log(JSON.stringify({passed:true,actualNativeLegalGuardMismatch:true,retainedControlHasRepair:true,
  actualExpectedAndProvenanceDelivered:true,guardNotWeakened:true,guardedDispatches:0,providerCalls:0,nativeArmyAudits:0,
  productionWrites:0,actualProductionRecoveryProven:false,strategyImprovementProven:false}));
