// Join only one immutable Native inspect result. Do not reimplement legality,
// merge scenes, infer missing reasons, or turn a capability route into an action.
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
const copy=structuredClone;
const labels=(value,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value??{},key))
  .map(key=>[key,copy(value[key])]));
export function projectRosterActionSubjectStateV1(value,pieceId){
  if(value?.operation!=='inspect'||typeof pieceId!=='string'||!Array.isArray(value.receipt?.availableUnits))return null;
  const matches=value.receipt.availableUnits.map((unit,index)=>({unit,index})).filter(({unit})=>unit.unitId===pieceId);
  if(matches.length!==1)return null;
  const {unit,index}=matches[0];
  return {...labels(unit,['unitId','sideKey','onTable','deploymentStatus','activatedPhases','currentSupply']),
    readPointer:`/receipt/availableUnits/${index}`,sourceKind:'same_inspect_unit_state',
    successorEligibilityProven:false};
}
export function projectRosterActionUnavailableDirectoryV1(value){
  const disabled=value?.operation==='inspect'?value.receipt?.actionSpace?.actionAvailability?.disabledActions:null;
  if(!Array.isArray(disabled))return null;
  return disabled.map((entry,index)=>({index,pieceId:entry.pieceId??null,actionType:entry.actionType,phase:entry.phase??null,
    disabledReason:entry.disabledReason??null,subjectState:projectRosterActionSubjectStateV1(value,entry.pieceId),
    readPointer:`/receipt/actionSpace/actionAvailability/disabledActions/${index}`}));
}
export function projectRosterActionEligibilityV1(value){
  const receipt=value?.receipt,space=receipt?.actionSpace;
  if(value?.operation!=='inspect'||!space)return null;
  const stateRef=projectRosterWorkflowStateReferenceV1(value);
  const nativeState=space.authority?.stateHash;
  const bindingStatus=!stateRef||typeof nativeState!=='string'?'state_identity_missing':
    stateRef.stateHash!==nativeState?'state_identity_mismatch':'same_native_state';
  const completeMenu=Array.isArray(space.finiteActions)&&Array.isArray(space.parameterDomains);
  const rows=new Map();
  const add=(entry,field,record)=>{
    if(!entry||typeof entry.actionType!=='string')return;
    const pieceId=entry.pieceId??null,key=JSON.stringify([pieceId,entry.actionType]);
    const row=rows.get(key)??{pieceId,actionType:entry.actionType,currentOptions:[],disabledOptions:[],capabilityReferences:[]};
    row[field].push(record);rows.set(key,row);
  };
  for(const [index,entry]of (space.finiteActions??[]).entries())add(entry.action,'currentOptions',{
    kind:'finite',index,...labels(entry,['candidateId']),...labels(entry.action,['weaponName','abilityName','profileKey']),
    readPointer:`/receipt/actionSpace/finiteActions/${index}`});
  for(const [index,entry]of (space.parameterDomains??[]).entries())add(entry,'currentOptions',{
    kind:'domain',index,...labels(entry,['domainId','weaponName','abilityName','profileKey']),
    readPointer:`/receipt/actionSpace/parameterDomains/${index}`});
  for(const [index,entry]of (space.actionAvailability?.disabledActions??[]).entries())add(entry,'disabledOptions',{
    index,...labels(entry,['disabledReason','phase','weaponName','abilityName','profileKey']),
    readPointer:`/receipt/actionSpace/actionAvailability/disabledActions/${index}`});
  for(const [index,entry]of (space.actionCapabilityReference?.routes??[]).entries())add(entry,'capabilityReferences',{
    index,...labels(entry,['routeId','routeStatus','phase','weaponName','abilityName','profileKey']),
    readPointer:`/receipt/actionSpace/actionCapabilityReference/routes/${index}`});
  const actions=[...rows.values()].map(row=>({...row,subjectState:projectRosterActionSubjectStateV1(value,row.pieceId),availability:bindingStatus!=='same_native_state'?'state_unverified':
    row.currentOptions.length?'listed_in_named_state':row.disabledOptions.length?'disabled_in_named_state':
      completeMenu?'not_listed_in_named_state':'menu_incomplete'}));
  return {schema:'roster_action_eligibility_view_v1',version:2,stateRef,bindingStatus,
    round:receipt.round??null,phase:receipt.phase??null,sideKey:space.authority?.seatKey??null,
    completeMenu,actions,executionGranted:false,provesGlobalImpossibility:false,
    instruction:'This is a deterministic index of ONE named Native state, not the latest state across experiments. currentOptions are the only listed selectors at this state; read the exact option and instantiate/preview its parameters through Native before execution. One listed weapon/ability does not authorize other variants in the same actionType row. capabilityReferences describe implemented routes/phases ONLY: even routeStatus=executable_exact does NOT mean currently selectable. not_listed_in_named_state means no selector here, not a proven disabledReason, permanent inability or a future-round result. disabledOptions keep exact Native reasons for their own variants. State-unverified/incomplete views cannot supply missing eligibility. Never replace this menu with a historical or different-branch capability; explicitly choose and inspect another authorized state if necessary. This view does not alter Rules, authorize a retry or certify strategy.'};
}
