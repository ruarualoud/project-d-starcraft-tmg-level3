// Reproduce actual e5210/e5224: a retained view describes a whole-group option
// as one Raptor; unsupported scenario flags are misreported as missing parent.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const viewEntry=saved.evidence[972],originalView=await get(viewEntry.artifactRef);
assert.equal(originalView.schema,'roster_workflow_receipt_view_v1');
const sourceEntry=saved.evidence.find(e=>e.id===originalView.evidenceId),source=await get(sourceEntry.artifactRef);
const units=source.receipt.queryReceipt.result.formationOptions[0].jointUnitIds;
assert.equal(units.length,4);assert.equal(originalView.formationOptionDirectory.options[0].unitIds,undefined);
const state={...structuredClone(saved),work:[],reads:[],events:[]};
const memory=new Map(),store={load:async()=>structuredClone(state),save:async()=>{},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref='test:'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const flow=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('no execution in read test');}});
const failures=[];async function check(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failures.push(name+': '+e.message);console.log('FAIL '+name+': '+e.message);}}
await check('retained view root uses current source-derived option identity',async()=>{
  const row=await flow.dispatch({type:'read_evidence',consumer:'v784',evidenceId:viewEntry.id,pointer:''});
  assert.deepEqual(row.value.formationOptionDirectory.options[0].unitIds,units);
  assert.equal(row.value.currentReadProjection.originalArtifactUnchanged,true);
  assert.deepEqual(row.value.sections,originalView.sections,'section addresses stay stable');
});
await check('nested view pointer uses same identity',async()=>{
  const row=await flow.dispatch({type:'read_evidence',consumer:'v784',evidenceId:viewEntry.id,pointer:'/formationOptionDirectory/options/0'});
  assert.deepEqual(row.value.unitIds,units);assert.equal(row.value.selectionScope,'whole_joint_formation');
});
if(!process.argv.includes('--remaining-only'))await check('exact Native source pointer remains unchanged',async()=>{
  const row=await flow.dispatch({type:'read_evidence',consumer:'v784',evidenceId:viewEntry.id,pointer:'/receipt/queryReceipt/result/formationOptions/0'});
  assert.deepEqual(row.value,source.receipt.queryReceipt.result.formationOptions[0]);
});
await check('already delivered old view receives current registered-source supplement',async()=>{
  const oldRead={status:'read',evidenceId:viewEntry.id,pointer:'',value:originalView};
  memory.set('oldRead',oldRead);
  const context=await projectRosterWorkflowReadContextV1({collected:[],operation:{calls:[],deliveredReads:[{resultRef:'oldRead'}]},
    directory:saved.evidence.map((e,i)=>({...e,number:i+1})),store});
  const supplement=context.nativeMeasurements.find(s=>s.sourceEvidenceId===sourceEntry.id);
  assert.deepEqual(supplement.projection.formationOptionDirectory.options[0].unitIds,units);
  assert.equal(supplement.originalViewUnchanged,true);assert.equal(supplement.acceptanceGranted,false);
});
await check('unsupported flags report actual fields, not missing parent',async()=>{
  const failed=(await get('0a8b8bb3647b78538fce02a9d5f5537431e4602ca39ee1ffdf3a5f1f03a9f2b5')).value;
  let nativeCalls=0;
  const laboratory={labDescriptor:()=>({sourceStateHash:saved.scope.source}),
    runFormationSelectionBranch:()=>{nativeCalls++;throw Error('invalid request reached Native');}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
  const result=await executor.execute({workId:'v784',scope:saved.scope,inputs:{request:{value:{operation:'formation_scene',
    args:failed.submittedArguments,bindings:[],guards:[],experimentScope:failed.request.executionScope}}}},
    {operationState:{},checkpointOperation:async()=>{}});
  assert.equal(result.value.detail?.reason,'unsupported_fields',JSON.stringify(result.value));
  assert.deepEqual(result.value.detail.fields,['preservePositions','clearTerrain','isolateToPlacedPieces','reassessAllOnField']);
  assert.equal(result.value.queryRepair.correctable,true);assert.equal(nativeCalls,0);
});
assert.deepEqual(await get(viewEntry.artifactRef),originalView);
assert.deepEqual(await get(sourceEntry.artifactRef),source);
console.log(JSON.stringify({failures,providerCalls:0,productionWrites:0,sourceArtifactsUnchanged:true}));
assert.equal(failures.length,0);
