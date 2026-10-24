// Actual r19 cold-resumed repair lost its observed menu and read an Assault
// scene instead. Also reproduce typed command reopening a closed read window.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],memory=new Map(),copy=structuredClone;
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.requestRef==='5fdf2621dd061a573602f443ad91bfbb69f12eea0bce0a2883970ea447a32ddc'));
const original=await get(work.inputRef),inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:original,state,readArtifact:get});
assert.ok(inputs.nativeChoiceSources,'cold repair must recover source identity by its saved choice lineage');
assert.equal(inputs.nativeChoiceSources.value.entries.length,1);
assert.equal(inputs.nativeChoiceSources.value.entries[0].stateRef.stateHash,'73c6cc4c53ffe64c69a1bd5c06345801d503d04bf0f44e6e530410c458028168');
assert.equal(inputs.nativeChoiceSource0.status,'read');
assert.equal(inputs.nativeChoiceSource0.value.finiteActions[0].action.actionType,'resolve_mission_start_of_round');
const req=await get('5fdf2621dd061a573602f443ad91bfbb69f12eea0bce0a2883970ea447a32ddc');
req.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs=inputs;
req.responseFormat.schema.properties.action.enum=['finish','conclude'];
const window=req.promptNodes.find(n=>n.kind==='experiment_evidence_window');window.phase='synthesize';
const prepared=prepareRosterStrategyRepairRequestV1(req);
assert.deepEqual(prepared.responseFormat.schema.properties.action.enum,['select','conclude']);
assert.deepEqual(prepared.promptNodes.find(n=>n.kind==='experiment_evidence_window'),window);
const choice={action:'select',publicReason:'Injected explicit selection of original menu1850 entry0.',reads:[],catalogueQueries:[],
 selection:{sourceEvidenceNumber:1850,kind:'finite',index:0,parametersJson:null,outcomeJson:null},conclusion:null,unresolvedQuestions:[]};
assert.ok(projectRosterStrategyRepairOutputV1({request:prepared,output:{...choice,selection:{...choice.selection,sourceEvidenceNumber:1004}}}).errors.length);
assert.deepEqual(projectRosterStrategyRepairOutputV1({request:prepared,output:choice}).errors,[]);
let captured,saved;
const assignment={...original,inputs};
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v951',store:{load:async()=>state,get,put},deliberation:{deliberate:async request=>{
 captured=request;assert.ok(request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.nativeChoiceSource0);
 return {output:choice,receipt:{providerKind:'offline_injection',contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
 roundIndex:request.roundIndex,outputHash:hash(choice),outputContractRef:request.responseFormat.outputContractRef}};
}}});
const result=await execute(assignment,{operationState:null,checkpointOperation:async op=>{saved=copy(op);},
 readEvidence:async()=>assert.fail('The exact complete menu is already delivered inline'),
 publishContext:async(value,metadata={})=>{const artifactRef=await put(value),id='offline-v951:'+artifactRef;
 let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
 if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef,title:metadata.title??'Offline',kind:metadata.kind??'interpretation',
 validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
 return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}});
assert.equal(result.kind,'proposal');assert.equal(result.value.workOrders.length,1);assert.equal(result.value.failedWorkOrders.length,0);
assert.equal(saved.correction,null);assert.equal(result.continuation,undefined);
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,productionWrites:0,
 checks:['cold_lineage_exact_menu','wrong_scene_rejected','synthesis_window_preserved','actual_executor_submits_without_reread'],promptCharacters:JSON.stringify(captured.promptNodes).length}));
