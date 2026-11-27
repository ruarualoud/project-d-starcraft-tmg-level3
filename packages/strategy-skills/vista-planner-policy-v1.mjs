import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {normalizeProviderVisualInputsV1} from '../secure-provider-runtime/provider-visual-input-v1.mjs';
const copy=v=>structuredClone(v);
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c,severity:'High'})};
export const VISTA_POLICY_SCHEMA='starcraft_vista_policy_program_v1';
// A bounded executable policy language, not a new Rules implementation. Each
// instruction invokes an existing read-only capability. Native facts stay intact.
export function compileVistaPolicyProgramV1(value){
 need(value&&Object.keys(value).every(k=>['instructions','memory','skillOrder','beforePlanning'].includes(k)),'VISTA_POLICY_FIELDS_INVALID');
 need(typeof value.instructions==='string'&&typeof value.memory==='string','VISTA_POLICY_TEXT_REQUIRED');
 need(Array.isArray(value.skillOrder)&&value.skillOrder.every(x=>typeof x==='string')&&new Set(value.skillOrder).size===value.skillOrder.length,'VISTA_POLICY_SKILLS_INVALID');
 need(Array.isArray(value.beforePlanning)&&value.beforePlanning.length<=8,'VISTA_BOUNDED_PROGRAM_REQUIRED');
 for(const op of value.beforePlanning){
  need(op&&['observe_board','read_relationships','recall'].includes(op.operation),'VISTA_POLICY_CAPABILITY_FORBIDDEN');
  const allowed={observe_board:['operation'],read_relationships:['operation','intent','subject','target','whenActionTypes'],recall:['operation','text','limit']}[op.operation];
  need(Object.keys(op).every(k=>allowed.includes(k)),'VISTA_HOST_BINDING_NOT_MODEL_FIELD');
  if(op.operation==='read_relationships'){
   need(typeof op.intent==='string'&&op.intent.trim()&&op.subject==='own_on_field'&&['enemy_on_field','mission_markers'].includes(op.target),'VISTA_RELATIONSHIP_PROGRAM_INVALID');
   need(op.whenActionTypes===undefined||(Array.isArray(op.whenActionTypes)&&op.whenActionTypes.every(x=>typeof x==='string')),'VISTA_ACTION_CONDITION_INVALID');
  }
  if(op.operation==='recall')need(typeof op.text==='string'&&Number.isSafeInteger(op.limit)&&op.limit>=1&&op.limit<=12,'VISTA_RECALL_PROGRAM_INVALID');
 }
 const body={schemaVersion:VISTA_POLICY_SCHEMA,...copy(value)};return {...body,programHash:hash(body)};
}
export function assertVistaPolicyProgramV1(program){
 const {schemaVersion,programHash,...semantic}=program||{};
 need(schemaVersion===VISTA_POLICY_SCHEMA&&compileVistaPolicyProgramV1(semantic).programHash===programHash,'VISTA_POLICY_PROGRAM_CHANGED');return program;
}
export function createVistaPlannerPolicyPortV1({store,program,scope,spatialQueryPort,memoryQueryPort,framePort}){
 assertVistaPolicyProgramV1(program);
 async function prepare({input,stage,choiceKey}){
  const room=input.roomProjection, state=room?.state;
  for(const k of ['roomId','matchBindingHash','seatKey'])need(input.scope?.[k]===scope[k],'VISTA_POLICY_SCOPE_CHANGED');
  need(room.viewer?.seatKey===scope.seatKey&&room.room?.roomId===scope.roomId,'VISTA_POLICY_VIEW_CHANGED');
  const identity={scope,programHash:program.programHash,choiceKey,stage,stateHash:room.room.stateHash};
  const id='vista-policy:'+hash(identity);let saved=await store.load(id);
  if(saved){need(hash(saved.identity)===hash(identity),'VISTA_POLICY_RECORD_CHANGED');if(saved.result)return copy(saved.result)}
  else{saved={reviewId:id,revision:0,identity,results:[],updatedAt:new Date().toISOString()};need((await store.commit(id,null,saved)).ok,'VISTA_POLICY_COMMIT_FAILED')}
  async function save(change){const next={...saved,...change,revision:saved.revision+1,updatedAt:new Date().toISOString()};need((await store.commit(id,saved.revision,next)).ok,'VISTA_POLICY_COMMIT_FAILED');saved=next;}
  const programSteps=stage==='planning'?program.beforePlanning:[];
  for(let index=saved.results.length;index<programSteps.length;index++){
   const op=programSteps[index];let result;
   if(op.operation==='observe_board'){
    need(framePort?.capture,'VISTA_FRAME_CAPABILITY_MISSING');result=await framePort.capture({projection:room,seat:scope.seatKey,stateHash:room.room.stateHash,stateRevision:room.room.stateRevision});
    need(result?.stateHash===room.room.stateHash&&result.seat===scope.seatKey,'VISTA_FRAME_STATE_CHANGED');
    result={...result,visualInputs:normalizeProviderVisualInputsV1([result.image])};delete result.image;
   }else if(op.operation==='recall'){
    need(memoryQueryPort?.query,'VISTA_MEMORY_CAPABILITY_MISSING');result=await memoryQueryPort.query({scope:copy(input.scope),query:{text:op.text,limit:op.limit,order:'newest_first'}});
    need(result.scope?.seatKey===scope.seatKey&&result.scope?.roomId===scope.roomId&&result.scope?.matchBindingHash===scope.matchBindingHash,'VISTA_MEMORY_SCOPE_CHANGED');
   }else{
    const actions=[...(input.spatialActionSpace.finiteActions||[]),...(input.spatialActionSpace.parameterDomains||[])];
    const types=new Set(actions.map(a=>a.action?.actionType||a.actionType));
    if(op.whenActionTypes?.length&&!op.whenActionTypes.some(t=>types.has(t)))result={status:'condition_not_met',observedActionTypes:[...types]};
    else{
     const alive=(state.pieces||[]).filter(p=>p.isOnField===true&&p.isDestroyed!==true&&p.currentModels>0);
     const subjects=alive.filter(p=>p.sideKey===scope.seatKey).map(p=>p.id);
     const targets=op.target==='enemy_on_field'?alive.filter(p=>p.sideKey!==scope.seatKey).map(p=>p.id):(input.spatialObservation?.markers||[]).filter(m=>m.kind==='mission_marker').map(m=>m.objectId);
     if(!subjects.length||!targets.length)result={status:'no_selected_visible_objects',subjectUnitIds:subjects,targetIds:targets};
     else{need(spatialQueryPort?.query,'VISTA_SPATIAL_CAPABILITY_MISSING');result=await spatialQueryPort.query({roomProjection:room,legalSpace:input.legalSpace,spatialObservation:input.spatialObservation,request:{requestId:id+':'+index,queryKind:'space.inspect_relationships',arguments:{subjectUnitIds:subjects,targetIds:targets,intent:op.intent}}});
      need(result&&typeof result.queryReceiptHash==='string','VISTA_NATIVE_QUERY_RESULT_REQUIRED');}
    }
   }
   await save({results:[...saved.results,{operation:op.operation,result:copy(result)}]});
  }
  const visualInputs=saved.results.flatMap(r=>r.result.visualInputs||[]);
  const context={schemaVersion:'starcraft_vista_planner_context_v1',programHash:program.programHash,policyReceipt:id,
   instructions:program.instructions,proceduralMemory:program.memory,skillOrder:program.skillOrder,
   observations:saved.results.map(r=>{const {visualInputs,...result}=r.result;return {...r,result}}),
   rulesAuthority:false,interpretation:'Policy instructions and memories are conditional strategy. Only attached Native observations are facts; their precision/unknown labels are unchanged.'};
  const result={context,visualInputs};await save({result});return copy(result);
 }
 return Object.freeze({prepare,programHash:program.programHash});
}
