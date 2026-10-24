// Same concrete failure, one remaining integration seam: the actual role must
// send/decode the new command and preserve the question at its owner return.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state),memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const work=state.work.find(w=>w.id==='review-resolution:r19:combat_and_losses:source-revision');
const assignment=await get(work.inputRef),directoryCopy=copy(assignment.evidenceDirectory);
let captured,saved;
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v948',store:{load:async()=>state,get,put},
  deliberation:{deliberate:async request=>{
    captured=request;assert.equal(request.responseFormat.schemaName,'roster_experiment_control_repair_v1');
    const output={operation:'return_to_strategy',publicReason:'Return the exact scope conflict to its owner; no map fact is approved.',
      questionDispositions:[{questionNumber:1,classification:'outside_local_obligation',publicReason:'The original delegated combat classification does not require route arrival.',evidenceNumbers:[1725]}]};
    return {output,receipt:{providerKind:'offline_injection',contextHash:request.contextHash,roundKind:request.roundKind,
      sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:request.responseFormat.outputContractRef}};
  }}});
const report={providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
  const result=await execute({...assignment,inputs},{operationState:work.operationState,checkpointOperation:async op=>{saved=copy(op);},
    readEvidence:async()=>assert.fail('No new source needed for this control-only correction'),
    publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v948:'+ref;
      let index=directoryCopy.findIndex(e=>e.id===id);if(index<0){index=directoryCopy.length;directoryCopy.push({id,artifactRef:ref,
        title:metadata.title??'Offline context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),
        conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
      return {...directoryCopy[index],evidenceNumber:index+1,...(metadata.includeDirectory?{evidenceDirectory:copy(directoryCopy)}:{})};}});
  assert.equal(result.value.experimentConclusion.status,'strategy_required');
  assert(result.value.unresolvedQuestions.length);
  assert.equal(result.value.acceptanceGranted,false);
  assert.equal(saved.correction,null);
  assert.equal(hash(state),before);
  report.pass=true;report.promptCharacters=JSON.stringify(captured.promptNodes).length;
  report.outcome='Actual executor decodes explicit command and returns unresolved question without approval';
}catch(error){report.pass=false;report.error=error.message;report.correction=saved?.correction;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
