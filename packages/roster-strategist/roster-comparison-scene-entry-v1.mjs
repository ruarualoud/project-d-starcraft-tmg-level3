// Conditions describe the experiment ENTRY, not its outcome. Actual Native
// transitions may change distance/engagement; hypothetical reconstruction must
// qualify again. Cold restore never replays an action to establish this fact.
import {isDeepStrictEqual} from 'node:util';
import {prepareStaticFormationRelationshipsV1} from '../online-agent-session/static-formation-relationships-v1.mjs';
import {requireRosterComparisonSceneRequirementsV1,ROSTER_COMPARISON_SCENE_INSTRUCTION_V1}
  from './roster-comparison-scene-contract-v1.mjs';
const copy=structuredClone;
const branch=branchStateHash=>({kind:'branch',branchStateHash});
function snapshot(laboratory,base){
  const s=laboratory.captureComparisonSnapshot?.({base});
  if(s?.schema!=='pregame_scene_comparison_snapshot_v1'||!s.state||!s.baseStateHash||!s.sourceStateHash)
    throw Object.assign(Error('ROSTER_COMPARISON_NATIVE_SNAPSHOT_REQUIRED'),{code:'ROSTER_COMPARISON_NATIVE_SNAPSHOT_REQUIRED'});
  return s;
}
function position(state,id){
  const p=state.pieces.find(p=>p.id===id);if(!p)return null;
  return {onTable:p.isOnField===true,models:(p.models??[]).filter(m=>!m.isDestroyed).map(m=>({
    id:m.id,isOnField:m.isOnField!==false,xInches:m.xInches,yInches:m.yInches,
    rotationDegrees:m.baseRotationDegrees??0,elevation:m.elevation??'ground',
    supportTerrainIds:m.supportTerrainIds??[],adjacentAccessPointIds:m.adjacentAccessPointIds??[]}))};
}
function assess(binding,current,previous=null){
  const requirements=requireRosterComparisonSceneRequirementsV1(binding),issues=[];
  let relationshipAssessment=null;
  if(requirements.relationshipConstraints)try{
    relationshipAssessment=prepareStaticFormationRelationshipsV1(current.state,{relationshipConstraints:requirements.relationshipConstraints}).assess(current.state);
    if(!relationshipAssessment.complete||!relationshipAssessment.passed)issues.push({reason:'entry_relationships_not_satisfied'});
  }catch(error){issues.push({reason:'entry_relationships_unavailable',code:error.code??error.message});}
  if(previous)for(const id of requirements.preserveSourceUnitIds){
    const before=position(previous.state,id),after=position(current.state,id);
    if(!before||!after||!isDeepStrictEqual(before,after))issues.push({reason:'source_preserved_unit_changed',unitId:id});
  }
  return {version:1,status:issues.length?'not_ready':'ready',purposeSource:copy(binding.purposeSource),
    requirements:copy(requirements),sourceStateHash:current.sourceStateHash,stateHash:current.baseStateHash,
    ...(previous?{constructionParentStateHash:previous.baseStateHash}:{}),relationshipAssessment,issues,
    sourcePreservationChecked:Boolean(previous),strategyComparisonProven:false,otherControlsProven:false,
    instruction:'Actual Native snapshot geometry only. Phase, cover/Creep, payment, legal action timing and comparison utility remain separate obligations.'};
}
function unmet(assessment){
  const code='ROSTER_COMPARISON_ENTRY_CONDITIONS_UNMET';
  throw Object.assign(Error(code),{code,detail:assessment,dispatchOutcome:'not_dispatched',queryRepair:{
    correctable:false,controlReturn:true,sourceContract:'roster_comparison_scene_entry_v1',
    failureClass:'scene_conditions_unmet',resolutionRequired:'method_or_scope_decision',nativeExecuted:false,
    originalQueryNotAnswered:true,assessment:copy(assessment),
    instruction:'The selected actual entry does not satisfy the declared design. Correct the construction using existing Native evidence or return the bounded method to its owner; do not change the design to match the result, replay successful actions, or classify this as a strategy refutation. '+ROSTER_COMPARISON_SCENE_INSTRUCTION_V1}});
}
export function createRosterComparisonSceneGateV1(){
  const entries=new Map(),rejected=new Map();
  const identity=(binding,contextRef,source,state)=>JSON.stringify([binding.purposeSource?.artifactRef,
    binding.sceneRequirements,contextRef??null,source,state]);
  const matches=(entry,binding,contextRef)=>entry?.version===1
    &&entry.purposeSource?.artifactRef===binding.purposeSource?.artifactRef
    &&isDeepStrictEqual(entry.requirements,binding.sceneRequirements)&&entry.contextRef===(contextRef??null)
    &&entry.assessment?.status==='ready'&&entry.entryStateHash===entry.assessment.stateHash
    &&entry.sourceStateHash===entry.assessment.sourceStateHash;
  function enter({binding,laboratory,base,contextRef=null}){
    if(!binding)return null;
    requireRosterComparisonSceneRequirementsV1(binding);
    const current=snapshot(laboratory,base),key=identity(binding,contextRef,current.sourceStateHash,current.baseStateHash);
    if(rejected.has(key))unmet(rejected.get(key));
    if(entries.has(key))return {...copy(entries.get(key)),arm:binding.arm};
    const assessment=assess(binding,current);if(assessment.status!=='ready')unmet(assessment);
    const entry={version:1,arm:binding.arm,purposeSource:copy(binding.purposeSource),requirements:copy(binding.sceneRequirements),
      contextRef:contextRef??null,sourceStateHash:current.sourceStateHash,entryStateHash:current.baseStateHash,
      atStateHash:current.baseStateHash,assessment,provenance:'native_entry_snapshot',strategyComparisonProven:false};
    entries.set(key,entry);return copy(entry);
  }
  function constructed({binding,laboratory,base,parentBase,contextRef=null}){
    if(!binding)return null;
    const current=snapshot(laboratory,base),previous=parentBase?snapshot(laboratory,parentBase):null;
    const assessment=assess(binding,current,previous),key=identity(binding,contextRef,current.sourceStateHash,current.baseStateHash);
    entries.delete(key);rejected.delete(key); // A constructed scene is a NEW entry, not a continuation.
    if(assessment.status!=='ready')rejected.set(key,assessment);
    else{
      const entry=enter({binding,laboratory,base,contextRef});entry.assessment=assessment;entries.set(key,entry);
    }
    return assessment;
  }
  function advance({binding,entry,receipt,contextRef=null}){
    if(!binding||!matches(entry,binding,contextRef)||receipt?.resultStatus!=='ok'
      ||!receipt.branchStateHash||receipt.sourceStateHash!==entry.sourceStateHash
      ||receipt.parentStateHash!==entry.atStateHash)return null;
    const next={...copy(entry),arm:binding.arm,atStateHash:receipt.branchStateHash,nativeParentStateHash:receipt.parentStateHash,
      provenance:'native_transition_from_verified_entry'};
    entries.set(identity(binding,contextRef,next.sourceStateHash,next.atStateHash),next);return copy(next);
  }
  function restoreNative({binding,entry,receipt,laboratory,contextRef=null}){
    if(!binding||!matches(entry,binding,contextRef)||entry.provenance!=='native_transition_from_verified_entry'
      ||entry.atStateHash!==receipt?.branchStateHash||entry.nativeParentStateHash!==receipt?.parentStateHash)return false;
    const parentKey=identity(binding,contextRef,receipt.sourceStateHash,receipt.parentStateHash);
    let parent=entries.get(parentKey);
    if(!parent&&entry.entryStateHash===receipt.parentStateHash){
      // Recompute the immutable saved starting snapshot; no action replay.
      try{parent=enter({binding,laboratory,base:branch(receipt.parentStateHash),contextRef});}catch{return false;}
    }
    if(!parent||parent.entryStateHash!==entry.entryStateHash)return false;
    return Boolean(advance({binding,entry:parent,receipt,contextRef}));
  }
  function sourcesMatch(binding,sources){
    if(!binding)return true;
    if(binding.sceneRequirementsContractVersion!==1)return false;
    return sources.length>0&&sources.every(({value,arm})=>{
      const required=binding.sceneRequirementsByArm?.[arm]??binding.sceneRequirements;
      if(!required)return false;
      if(required.relationshipConstraints===null)return true; // Stateless controls retain their own checks.
      const witnesses=value?.comparisonSceneEntries??(value?.comparisonSceneEntry?[value.comparisonSceneEntry]:[]);
      return value?.status==='completed'&&witnesses.length>0&&witnesses.every(entry=>
        (entry.arm===arm||entry.arm==='shared')&&matches(entry,{...binding,sceneRequirements:required},value.contextRef??entry.contextRef??null));
    });
  }
  return {enter,constructed,advance,restoreNative,sourcesMatch};
}
