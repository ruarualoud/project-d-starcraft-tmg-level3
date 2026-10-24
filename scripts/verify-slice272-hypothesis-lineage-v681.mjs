// The actual Raynor hypothesis was declared and executed, but after a finite
// fact -> strategic-frontier -> fact handoff its structured design disappeared.
// Exercise the normal Run model seam, not a standalone prompt string assertion.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const lostRequest=await read('15cf3aff1d52a11cc50a8ef6b016f895b1e254dd982d4012e9cdcc8c3b31517f');
const targetId=lostRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId;
const firstOwnerId='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:decision:plan-r8:investigation';
const declaration=original.work.find(w=>w.id===firstOwnerId),originalProposal=await read(declaration.resultRef);
const test=originalProposal.value.workOrders.find(o=>o.experimentScope.hypothesisTest).experimentScope.hypothesisTest;
assert.match(test.claim,/Raynor forward using Orders/);
let state=structuredClone(original);const memory=new Map();
for(const w of state.work){
  if(w.id!==targetId){w.status='superseded';continue;}
  w.status='ready';w.failure=null;w.resultRef=null;w.operationState.pending=null;
}
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let observed;
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,
  sessionId:lostRequest.sessionId,
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async request=>{observed=request;throw Object.assign(Error('CONTROLLED_REQUEST_CAPTURED'),{dispatchOutcome:'not_dispatched'});}}});
await run.advance({concurrency:1});
assert(observed,'the normal Run must construct the target role request');
const inputs=observed.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const context=inputs.activeHypothesisTests?.value;
assert(context?.entries?.length,'the normal model input must carry the original declared design through the explicit control lineage');
const actual=context.entries.find(e=>e.hypothesisTest.claim===test.claim);
assert(actual);assert.deepEqual(actual.hypothesisTest,test);
assert.equal(actual.declarationWorkId,firstOwnerId);assert(actual.assessmentSourceEvidenceNumber>0);
assert.equal(actual.strategyImprovementProven,false);assert.equal(actual.measuredResultDelivered,false);
const inline=Object.values(inputs).find(i=>i.source==='evidence'&&i.evidenceNumber===actual.assessmentSourceEvidenceNumber
  &&i.pointer==='/experimentOrigin/hypothesisTest');
assert(inline);assert.deepEqual(inline.value,test);assert.equal(inline.status,'read');
assert.equal(context.originalTestStillNeedsAssessment,true);
const {projectRosterWorkflowHypothesisContextV1}=await import('../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs');
const unrelated=await projectRosterWorkflowHypothesisContextV1({state:original,workId:'discovery:r8:context',readArtifact:read});
assert.equal(unrelated,null,'an unrelated discovery is not made responsible for this test');
const changed=structuredClone(original);changed.scope.army='different-current-army';
assert.equal(await projectRosterWorkflowHypothesisContextV1({state:changed,workId:targetId,readArtifact:read}),null);
console.log(JSON.stringify({status:'passed',actualLostRequest:lostRequest.contextHash,
  currentStageStillLocal:true,originalDesignPreserved:true,exactDeclarationAndExecutionSource:true,
  unrelatedAndNewArmyExcluded:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  modelExperimentCompletionAndStrategyStillPending:true}));
