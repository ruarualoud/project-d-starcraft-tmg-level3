// Concrete actual883–886: three evidence batches must lead to synthesis,
// rather than letting repeated reads become another unbounded investigation.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import * as ownerModule from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),unchanged=JSON.stringify(state),memory=new Map();
const store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},
  load:async()=>structuredClone(state)};
const q=JSON.parse(await fs.readFile(path.join(dir,'885.request.json'),'utf8'));
const assignment={...q.request.promptNodes[0],evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
const actual=state.work.find(w=>w.id===assignment.workId),operation=structuredClone(actual.operationState);
operation.calls=operation.calls.slice(0,3);operation.turn=3;operation.pending=null;operation.correction=null;
let captured,calls=0;
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'isolated-saved-window',store,
  deliberation:{deliberate:async request=>{calls++;captured=request;
    assert.deepEqual(request.responseFormat.schema.properties.action.enum,['finish'],'BUG: exhausted read window still permits read');
    return JSON.parse(await fs.readFile(path.join(dir,'886.reply.json'),'utf8'));}},onRequest:async()=>{},onReply:async()=>{}});
const result=await execute(assignment,{operationState:operation,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_NEW_READ');}});
assert.equal(result.continuation,undefined);assert.equal(result.value.decisions[0].disposition,'revise');
assert.equal(calls,1);assert(captured.promptNodes.some(n=>n.kind==='decision_evidence_window'&&n.phase==='synthesize'));
assert.deepEqual(result.value.decisions[0].requiredData,[],'do not hand-edit the actual provider output');
const draft=await store.get(state.draftRef),verdict=await store.get(draft.builderVerdictRef);
const inherited=actual.inputs.investigationFrontier.value.unresolvedQuestions;
const readiness=assessRosterWorkflowReadinessV1({draft,verdict,work:[],acceptedDecisions:[{workId:actual.id,revision:2,
  resultRef:actual.resultRef,decision:result.value.decisions[0],carriedQuestions:inherited}]});
assert(inherited.length);assert(inherited.every(question=>readiness.strategyQuestions.some(q=>q.question===question)),
  'BUG: blank requiredData silently loses inherited necessary questions');
const full=JSON.parse(await fs.readFile(path.join(dir,'883.request.json'),'utf8')).request.promptNodes[0].inputs.questionEvidenceDirectory.value;
assert.equal(typeof ownerModule.pageRosterQuestionEvidenceDirectoryV1,'function');
const pages=ownerModule.pageRosterQuestionEvidenceDirectoryV1(full);
assert.deepEqual(Object.values(pages.pages).flat(),full.batches,'paged metadata preserves every original batch and source handle');
assert(Object.values(pages.pages).every(page=>page.length<=8));
const root=state.work.find(w=>w.id===actual.investigationOwnerId),r=await store.get(root.resultRef);
const fixed=ownerModule.createRosterExperimentOwnerContinuationV1({state,owner:root,result:r,summaryIds:[],draft:{...draft,mode:'fixed'}});
assert.equal(fixed.inputs.wholeDraft.value.rosterEditAuthority,'preset_immutable','fixed roster must not be described as editable');
assert.equal(JSON.stringify(state),unchanged);
console.log(JSON.stringify({passed:true,actualEvidenceRounds:3,newRealProviderCalls:0,newNativeCalls:0,productionWrites:0,
  checks:['real886 revision accepted in synthesis-only window','inherited questions preserved despite blank model list',
    'full directory pages lossless','fixed roster permissions exact']}));
