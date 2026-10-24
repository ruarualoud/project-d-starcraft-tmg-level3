// Actual e8776: the failed order names saved source 1174 inside argumentsJson,
// but the scoped correction prompt omits that source's navigable directory row.
// Exercise the shared role constructor. No Provider/Native/production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import * as dependencies from '../packages/roster-strategist/roster-workflow-repair-dependencies-v1.mjs';
const root=process.argv[2];
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const assignment=await get('478f8db6f4bbf8330bb124e7e5a73e1bde04d5df372862865b1240c260e6a3da');
const original=JSON.stringify(assignment),source=assignment.evidenceDirectory[1173];
const memory=new Map();let operation={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0};
const store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let calls=0,reads=0;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v838-source-navigation-offline',
  deliberation:{deliberate:async request=>{
    calls++;
    const rows=request.promptNodes.flatMap(node=>Array.isArray(node.entries)?node.entries:[]);
    assert.ok(rows.some(row=>row.number===1174||row.evidenceNumber===1174),
      'The explicitly selected source in the actual failed order must remain navigable in the scoped repair prompt');
    const originalTask=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.task;
    assert.deepEqual(originalTask,assignment.inputs.task,'Navigation must not repair or reinterpret the model proposal');
    assert.ok(!request.promptNodes.some(n=>n.directlyReadEvidenceNumbers?.includes(1174)),
      'A navigation address is not a source body read or approval');
    const output={action:'read',publicReason:'Read the saved source explicitly named by the failed order.',
      reads:[{evidenceNumber:1174,pointer:'/formationOptionDirectory'}],catalogueQueries:[],workOrders:[],
      unresolvedQuestions:[],conclusion:null};
    return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
      roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:structuredClone(request.responseFormat.outputContractRef),
      paidProviderCall:false,trainingTruth:false}};
  }}});
const result=await execute(assignment,{operationState:operation,checkpointOperation:async v=>{operation=structuredClone(v);},
  readEvidence:async(id,pointer)=>{assert.equal(id,source.id);assert.equal(pointer,'/formationOptionDirectory');reads++;
    const body=await get(source.artifactRef);assert.ok(body.formationOptionDirectory);
    return {status:'read',evidenceId:id,pointer,validity:'current',kind:source.kind,value:body.formationOptionDirectory};}});
assert.equal(result.value.status,'reads_completed');assert.equal(calls,1);assert.equal(reads,1);
assert.equal(operation.consecutiveCorrections,0);assert.equal(JSON.stringify(assignment),original);
const directory=[{id:'actual:a',number:7,validity:'current'},{id:'actual:b',number:11,validity:'historical'}];
const inputs={task:{value:{failedOrder:{steps:[{argumentsJson:JSON.stringify({selections:[{sourceEvidenceNumber:7,optionIndex:11}],
  nested:{binding:{fromEvidenceNumber:11}},invalid:[{fromEvidenceNumber:0},{sourceEvidenceNumber:-1},{sourceEvidenceNumber:'7'},
  {sourceEvidenceNumber:500}],prose:'sourceEvidenceNumber 500'})}]}},other:{evidenceId:'actual:a'}}};
assert.deepEqual(dependencies.projectRosterWorkflowAssignedSourceReferencesV1({inputs,directory}),directory);
assert.deepEqual(dependencies.projectRosterWorkflowAssignedSourceReferencesV1({inputs:{argumentsJson:'broken JSON',
  comment:'{"sourceEvidenceNumber":7}',optionIndex:7,hash:'7'},directory}),[]);
assert.deepEqual(dependencies.projectRosterWorkflowAssignedSourceReferencesV1({inputs:{evidenceNumbers:[7,11],
  sourceEvidenceId:'actual:b'},directory}),directory);
console.log(JSON.stringify({pass:true,actualFailure:'e8776',sameRoleConstructor:true,source1174ExplicitlyReadable:true,
  originalErrorAndProposalUnchanged:true,notAutoReadOrApproved:true,invalidAndProseReferencesIgnored:true,
  historicalValidityPreserved:true,scriptedModelCalls:calls,providerCalls:0,nativeCalls:0,productionWrites:0}));
