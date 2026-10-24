// The actual map/mission fact owner cited a scene's marker coordinates and
// was incorrectly required to judge that DIFFERENT owner's Raynor experiment.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {projectRosterWorkflowSavedSchemaRevalidationV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterHypothesisOriginV1} from '../packages/roster-strategist/roster-hypothesis-test-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=original.work.find(w=>w.operationState?.correction?.originalReplyRef==='c1669bc2a734ce5eed301933db833d9e868b263578414296c9dafe61e9b5ad7a');
assert(work);const reply=await read(work.operationState.correction.originalReplyRef);
const request=await read(work.operationState.calls.at(-1).requestRef);
assert.equal(request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.activeHypothesisTests,undefined);
const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
assert.equal(recovery?.repairKind,'hypothesis_assessment_ownership_scope',
  'The original fact answer must be revalidated, not forced to invent a verdict for a foreign experiment');
const origin=rosterHypothesisOriginV1(await read(original.evidence[815].artifactRef));assert(origin.hypothesisTest);
async function replay(owned){
  let state=structuredClone(original);const memory=new Map();
  for(const w of state.work){
    if(w.id!==work.id){w.status='superseded';w.inputRef??='controlled-not-dispatchable';continue;}
    w.status='ready';w.failure=null;w.operationState.revalidateReplyRef=work.operationState.correction.originalReplyRef;
    if(owned)w.inputs.activeHypothesisTests={source:'literal',value:{entries:[{hypothesisTest:origin.hypothesisTest}]}};
  }
  const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
    get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
  let calls=0;
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:request.sessionId,
    laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
      restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
      restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
    builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
    deliberation:{deliberate:async()=>{calls++;throw Error('NO_PROVIDER_REPURCHASE');}}});
  await run.advance({concurrency:1});assert.equal(calls,0);
  return {state,after:state.work.find(w=>w.id===work.id),store};
}
const actual=await replay(false);
assert.equal(actual.after.status,'evidence_ready');
assert.equal((await actual.store.get(actual.after.resultRef)).value.experimentConclusion.status,'answered');
assert.equal(actual.state.acceptanceGranted,false);
const owned=await replay(true);
assert(owned.after.operationState.correction.errors.some(e=>e.code==='declared_hypothesis_requires_scoped_assessment'),
  'A deliberately assigned test still needs its own verdict; only cross-owner obligations are removed');
console.log(JSON.stringify({status:'passed',actualMapFactsNoForeignVerdictRequired:true,
  assignedTestStillRequiresAssessment:true,paidReplyReusedUnchanged:true,normalRun:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,planNotApproved:true}));
