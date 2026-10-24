// Actual first source-control return missed the normal author's context
// projector. Verify the stored input AND the real executor's outgoing request.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterIncomingAuthorContextV1} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone,memory=new Map();
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref);
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const actualRequest=await disk('1162532efee50d67ff40b83deee9ffbe573580efb02bfa3f89194b1a0cf5bd37');
const old=actualRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert(old.inputs.sourceControlDispute);
assert(!actualRequest.promptNodes.some(n=>n.kind==='strategy_owner_assignment'),'frozen failed request required');
const projected=projectRosterIncomingAuthorContextV1(old);
assert(projected,'The actual source_control_dispute was not recognized as a current author assignment');
assert.equal(projected.node.returnKind,'source_control_dispute');
assert(!projected.inputs.originalTask);
assert(projected.history.originalTask);
assert.deepEqual(projected.inputs.sourceControlDispute,old.inputs.sourceControlDispute);
assert.equal(projected.node.factApprovalGranted,false);
const wrong=copy(old);wrong.inputs.sourceControlDispute.value.ownerWorkId='another-owner';
assert.equal(projectRosterIncomingAuthorContextV1(wrong),null);
const approved=copy(old);approved.inputs.sourceControlDispute.value.capabilityBlockerVerified=true;
assert.equal(projectRosterIncomingAuthorContextV1(approved),null);
console.log(JSON.stringify({check:'actual-new-return-enters-existing-owner-context-without-promoting-dispute',pass:true}));

const work=state.work.find(w=>w.id===old.workId),assignment=await get(work.inputRef);
const before=hash(state),directoryCopy=copy(assignment.evidenceDirectory);
let captured;const sentinel=Object.assign(Error('CAPTURE_ONLY_NO_PROVIDER'),{code:'CAPTURE_ONLY_NO_PROVIDER'});
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v967-delivery',store:{load:async()=>state,get,put},
  deliberation:{deliberate:async request=>{captured=request;throw sentinel;}}});
const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
try{await execute({...assignment,inputs},{operationState:copy(work.operationState),checkpointOperation:async()=>{},
  readEvidence:async()=>assert.fail('Only capture request construction; no query'),
  publishContext:async(value,metadata={})=>{
    const ref=await put(value),id='offline-v967:'+ref;let index=directoryCopy.findIndex(e=>e.id===id);
    if(index<0){index=directoryCopy.length;directoryCopy.push({id,artifactRef:ref,title:metadata.title??'Offline exact context',
      kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...directoryCopy[index],evidenceNumber:index+1,...(metadata.includeDirectory?{evidenceDirectory:copy(directoryCopy)}:{})};
  }});}catch(error){if(!captured)throw error;}
assert(captured);
assert(captured.promptNodes.some(n=>n.kind==='strategy_owner_assignment'));
assert(captured.promptNodes.some(n=>n.kind==='strategy_owner_context'));
const delivered=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(delivered.inputs.sourceControlDispute.value.kind,'source_control_dispute');
assert.equal(delivered.inputs.sourceControlDispute.value.unresolvedQuestions[0].resolved,false);
assert(!delivered.inputs.originalTask,'old fact-role restrictions must not be current author instructions');
assert.equal(hash(state),before);
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  oldPromptCharacters:JSON.stringify(actualRequest.promptNodes).length,
  newPromptCharacters:JSON.stringify(captured.promptNodes).length,
  promptComparisonIsNotStrategyEquivalence:true,rawReplyRewritten:false}));
