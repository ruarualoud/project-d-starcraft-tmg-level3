// r22 Teach/decision re-asked an r21 inquiry whose control return caused r22.
// Assert real source projection and the actual outgoing role request, not only
// a directory entry. All artifacts/operations here remain in memory.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {projectRosterPriorInvestigationEvidenceV1} from '../packages/roster-strategist/roster-workflow-investigation-evidence-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone,memory=new Map(),cache=new Map();
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,await disk(ref));return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state);
assert.equal(state.draftRevision,22);
const commit=state.events.findLast(e=>e.type==='draft_committed'&&e.revision===22);
const writer=state.work.find(w=>w.id===commit.workId),dispute=writer.inputs.sourceControlDispute.value;
const oldOwner=state.work.find(w=>w.id===dispute.ownerWorkId),oldConclusion=await get(oldOwner.resultRef);
assert.equal(oldOwner.resultRef,dispute.originalResultRef);
assert.equal(dispute.capabilityBlockerVerified,false);
const teach=state.work.find(w=>w.id==='product:teach:r22:subject-v1');
const prior=projectRosterPriorInvestigationEvidenceV1({state,work:teach});
assert(prior,'The current Teach lost the actual inquiry that caused its Plan revision');
assert.equal(prior.revisionOrigin.workId,writer.id);
const returned=prior.controlReturns.find(r=>r.ownerWorkId===oldOwner.id);
assert(returned,'The original stopped question and control return must survive a Plan-only revision');
assert.equal(returned.resultRef,dispute.originalResultRef);
assert.equal(returned.sourceControlDispute.reviewResultRef,dispute.reviewResultRef);
assert.equal(returned.sourceControlDispute.capabilityBlockerVerified,false);
assert.deepEqual(returned.unresolvedQuestions,writer.inputs.investigationFrontier.value.unresolvedQuestions);
assert(prior.sources.some(s=>s.operation==='native_action'&&s.originalBindings.source===state.scope.source));
console.log(JSON.stringify({check:'actual-committed-cause-retains-inquiry-return-and-original-Native-sources',pass:true}));

for(const id of ['product:teach:r22:subject-v1','product:after-teach:r22:subject-v1']){
  const work=state.work.find(w=>w.id===id),assignment=await get(work.inputRef);
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
  const conclusionInput=Object.values(inputs).find(v=>v.source==='evidence'
    &&v.artifactRef===state.evidence.find(e=>e.id==='role:'+oldOwner.id).artifactRef
    &&v.pointer==='/experimentConclusion');
  assert(conclusionInput,'The previous conclusion must be delivered, not hidden behind another catalogue');
  assert.deepEqual(conclusionInput.value,oldConclusion.value.experimentConclusion);
  assert.equal(conclusionInput.scopeUsage,'historical_reference');
  assert.equal(inputs.priorInvestigationEvidence.value.acceptanceGranted,false);
  const directoryCopy=copy(assignment.evidenceDirectory);let captured;
  const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v970',store:{load:async()=>state,get,put},
    deliberation:{deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY_NO_PROVIDER');}}});
  try{await execute({...assignment,inputs},{operationState:copy(work.operationState),checkpointOperation:async()=>{},
    readEvidence:async()=>assert.fail('Request capture only'),
    publishContext:async(value,metadata={})=>{
      const ref=await put(value),id='offline-v970:'+ref;let index=directoryCopy.findIndex(e=>e.id===id);
      if(index<0){index=directoryCopy.length;directoryCopy.push({id,artifactRef:ref,title:metadata.title??'Exact carryover',
        kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
      return {...directoryCopy[index],evidenceNumber:index+1,...(metadata.includeDirectory?{evidenceDirectory:copy(directoryCopy)}:{})};
    }});}catch(error){if(!captured)throw error;}
  assert(captured);
  const sent=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  assert(sent.priorInvestigationEvidence.value.controlReturns.some(r=>r.resultRef===oldOwner.resultRef));
  assert(Object.values(sent).some(v=>v.pointer==='/experimentConclusion'
    &&v.artifactRef===conclusionInput.artifactRef&&hash(v.value)===hash(conclusionInput.value)));
  console.log(JSON.stringify({check:'actual-outgoing-role-preserves-unanswered-conclusion-and-scope',role:work.role,pass:true}));
}
const method=state.work.find(w=>w.id==='product:after-teach:r22:subject-v1:investigation');
assert(projectRosterPriorInvestigationEvidenceV1({state,work:method}).controlReturns.some(r=>r.ownerWorkId===oldOwner.id));
const wrongMap=copy(state);wrongMap.scope.map='another-map';
assert.equal(projectRosterPriorInvestigationEvidenceV1({state:wrongMap,work:teach}),null);
const wrongCommit=copy(state);wrongCommit.events.find(e=>e.sequence===commit.sequence).draftRef='not-current-draft';
assert.equal(projectRosterPriorInvestigationEvidenceV1({state:wrongCommit,work:teach}),null);
const chooser={...copy(teach),choiceOf:oldOwner.id};
const choiceState={...state,work:state.work.map(w=>w.id===teach.id?chooser:w)};
assert.equal(projectRosterPriorInvestigationEvidenceV1({state:choiceState,work:chooser}),null,'Do not widen single-operation roles');
assert.equal(hash(state),before);
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  sourceRebound:false,originalConclusionChanged:false,unknownApproved:false}));
