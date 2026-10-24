// Concrete B/r17 bug: a missing JSON address was promoted to absent capability.
// Real immutable contract + core reader + the actual downstream assignment.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [directory,output,from='core']=process.argv.slice(2),copy=structuredClone;
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const memory=new Map(),get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const entry=original.evidence.find(e=>e.artifactRef==='2a76205ae51e63dc2737e8f3d21c36b9fde0a007716e38f912af1403c7262b2e');
const wrong='/operations/7/capabilityContracts/firstRoundInitialization';
const correct='/operations/7/specContract/capabilityContracts/firstRoundInitialization';
const body=await get(entry.artifactRef),before=hash(body),checks=[];
let state=null;
const store={load:async()=>copy(state),save:async s=>{state=copy(s);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
try{
  if(from==='core'){
  const core=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('No model/tool dispatch')});
  await core.dispatch({type:'initialize',scope:original.scope});
  await core.dispatch({type:'publish_evidence',...entry,value:body});
  const result=await core.dispatch({type:'read_evidence',consumer:'repro',evidenceId:entry.id,pointer:wrong});
  assert.equal(result.status,'path_missing');
  assert(result.navigation?.candidatePointers.includes(correct),'Missing path has no exact source navigation');
  assert.equal(result.navigation.capabilityAbsenceProven,false);
  assert.equal(state.reads.length,0,'Suggestion must not mark capability as read');
  assert.equal(hash(await get(entry.artifactRef)),before);
  const valid=await core.dispatch({type:'read_evidence',consumer:'repro',evidenceId:entry.id,pointer:correct});
  assert.equal(valid.status,'read');assert.deepEqual(valid.value,body.operations[7].specContract.capabilityContracts.firstRoundInitialization);
  checks.push('actual_missing_path_is_navigable_without_retarget_or_approval');
  }
  if(from!=='invalid'){
  const work=original.work.find(w=>w.id==='product:after-teach:r17:subject-v1:investigation:strategy-frontier');
  const assignment=await get(work.inputRef);
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state:original,readArtifact:get});
  if(from!=='request'){
  const item=inputs.evidenceReadNavigation?.value?.entries.find(e=>e.pointer===wrong);
  assert(item?.navigation.candidatePointers.includes(correct),'Successor lacks source-owned diagnostic for retained failed read');
  assert.equal(item.sourceWorkId,'product:after-teach:r17:subject-v1:investigation');
  assert.equal(item.status,'path_missing');assert.equal(item.navigation.capabilityAbsenceProven,false);
  assert.deepEqual(assignment.inputs,(await get(work.inputRef)).inputs,'Old assigned input must stay immutable');
  checks.push('actual_downstream_owner_receives_retained_failure_navigation');
  }
  let captured;
  const captureDirectory=copy(assignment.evidenceDirectory);
  const execute=createRosterWorkflowReadRoleExecutorV1({store:{...store,load:async()=>copy(original)},sessionId:'offline-v942',
    deliberation:{deliberate:async request=>{captured=request;throw Error('OFFLINE_CAPTURE_ONLY');}}});
  try{await execute({...assignment,inputs},{operationState:copy(work.operationState),checkpointOperation:async()=>{},
    readEvidence:async()=>assert.fail('No new source read needed for request capture'),
    publishContext:async(value,metadata={})=>{
      const ref=await store.put(value),id='offline-context:'+ref;
      let index=captureDirectory.findIndex(e=>e.id===id);
      if(index<0){index=captureDirectory.length;captureDirectory.push({id,artifactRef:ref,
        title:metadata.title??'Offline exact context',kind:metadata.kind??'interpretation',validity:'current',
        bindings:copy(original.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
      return {...captureDirectory[index],evidenceNumber:index+1,
        ...(metadata.includeDirectory?{evidenceDirectory:copy(captureDirectory)}:{})};}});}
  catch(error){assert.match(error.message,/OFFLINE_CAPTURE_ONLY/);}
  assert(captured,'Real role executor must reach its Provider boundary');
  const delivered=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.evidenceReadNavigation;
  assert(delivered?.value?.entries.some(e=>e.navigation.candidatePointers.includes(correct)),
    'Exact navigation must survive production request focusing');
  assert(captured.userMessage.includes('current'),'Original strategic scope remains delivered');
  checks.push('actual_role_request_delivers_navigation_without_a_provider_call');
  }
  const helper=await import('../packages/roster-strategist/roster-evidence-path-navigation-v1.mjs');
  if(from!=='invalid'){
  const ambiguous=helper.projectRosterEvidencePathNavigationV1({a:{left:{target:1},right:{target:2}}},'/a/target');
  assert.deepEqual(ambiguous.candidatePointers.sort(),['/a/left/target','/a/right/target']);
  assert.equal(ambiguous.capabilityAbsenceProven,false);
  const absent=helper.projectRosterEvidencePathNavigationV1(body,'/operations/7/notARealCapability');
  assert.deepEqual(absent.candidatePointers,[]);assert.equal(absent.capabilityAbsenceProven,false);
  checks.push('ambiguous_and_absent_paths_never_prove_capability_absence');
  }
  assert.equal(helper.projectRosterEvidencePathNavigationV1(body,'invalid'),null);
  const escaped=helper.projectRosterEvidencePathNavigationV1({'a/b':{layer:{'x~y':0}}},'/a~1b/x~0y');
  assert.deepEqual(escaped.candidatePointers,['/a~1b/layer/x~0y']);
  assert.equal(helper.projectRosterEvidencePathNavigationV1(body,correct),null);
  checks.push('invalid_escaped_and_existing_paths_keep_exact_json_pointer_semantics');
  console.log(JSON.stringify({pass:true,checks}));
  await fs.writeFile(output,JSON.stringify({pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
}catch(error){console.log(JSON.stringify({pass:false,checks,error:error.message}));
  await fs.writeFile(output,JSON.stringify({pass:false,checks,error:error.message,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');process.exitCode=1;}
