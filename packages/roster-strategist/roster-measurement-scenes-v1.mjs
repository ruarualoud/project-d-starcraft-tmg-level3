// Join measured states to the Native projection that created their geometry.
// Identity hashes locate records; unequal hashes are not geometric differences.
// This read-only Interface is shared by methods, authors, Teach and reviewers.
import {isDeepStrictEqual} from 'node:util';
import {projectRosterWorkflowStateReferenceV1 as stateReference} from './roster-workflow-state-reference-v1.mjs';
import {rosterMeasurementAssessmentScopeV1 as assessmentScope} from './roster-measurement-assessment-scope-v1.mjs';
export const ROSTER_MEASUREMENT_SCENE_DELIVERY_VERSION_V1=5;
const copy=structuredClone,unwrap=v=>v?.kind&&v.value?v.value:v;
const sameIds=(a,b)=>isDeepStrictEqual([...new Set(a)].sort(),[...new Set(b)].sort());
// A candidate laboratory handle is not part of Native world content. An exact
// copy may have a different handle while source/state, Rules and Builder are
// identical. Only those exact Native identities can bridge the handles here;
// projection target/parent consistency below still checks its own context.
const sameMeasuredState=(a,b)=>a?.schema===b?.schema
  &&typeof a?.sourceStateHash==='string'&&a.sourceStateHash===b?.sourceStateHash
  &&typeof a?.stateHash==='string'&&a.stateHash===b?.stateHash;
// Both public producers use the same Native scene projector. candidate_context
// embeds its receipt; do not silently omit that entire production path or
// flatten/rewrite the original artifact. Keep its exact source pointer.
function savedProjection(body){
  const candidate=body?.operation==='candidate_context';
  if(!candidate&&body?.operation!=='project_scene'||body.status!=='completed'
    ||body.receipt?.resultStatus!=='ok')return null;
  const receipt=candidate?body.receipt.sceneProjectionReceipt:body.receipt;
  const proof=receipt?.sceneProjection,target=stateReference(body);
  if(receipt?.resultStatus!=='ok'||proof?.schema!=='pregame_scene_projection_v1'||!target
    ||body.stateRef&&!isDeepStrictEqual(body.stateRef,target))return null;
  let reference,targetParent,pointer;
  if(candidate){
    const lab=body.receipt.laboratory;
    if(lab?.sourceStateHash!==receipt.sourceStateHash||lab.builderBundleHash!==receipt.builderBundleHash
      ||lab.rulesRuntimeHash!==receipt.rulesRuntimeHash||proof.targetRulesRuntimeHash!==lab.rulesRuntimeHash)return null;
    reference=body.submittedArguments?.comparisonScene?.referenceStateRef;
    targetParent={schema:target.schema,contextRef:body.receipt.contextRef,
      sourceStateHash:lab.sourceStateHash,stateHash:lab.sourceStateHash};
    pointer='/receipt/sceneProjectionReceipt/sceneProjection';
  }else{
    reference=body.submittedArguments?.referenceStateRef;targetParent=body.submittedArguments?.stateRef;
    pointer='/receipt/sceneProjection';
  }
  if(!reference||!targetParent||proof.referenceSourceStateHash!==reference.sourceStateHash
    ||proof.referenceStateHash!==reference.stateHash||proof.targetSourceStateHash!==target.sourceStateHash
    ||receipt.sourceStateHash!==target.sourceStateHash||receipt.branchStateHash!==target.stateHash
    ||proof.targetSourceStateHash!==targetParent.sourceStateHash||proof.targetParentStateHash!==targetParent.stateHash
    ||receipt.parentStateHash!==targetParent.stateHash||target.contextRef!==targetParent.contextRef)return null;
  return {receipt,proof,target,reference,pointer};
}
// Array order is not weapon identity. Keep original source pointers and do
// only arithmetic; a matched row is not a controlled-causality judgment.
function rowDifferences(reference,target){
  const left=reference.body.receipt.exchange?.attackEstimates,right=target.body.receipt.exchange?.attackEstimates;
  if(!Array.isArray(left)||!Array.isArray(right))return null;
  const identity=row=>({sideKey:row.sideKey,attackerUnitId:row.attackerUnitId,targetUnitId:row.targetUnitId,
    weaponName:row.weaponName,canonicalParameters:row.canonicalParameters});
  const rowRef=(measurement,index)=>({evidenceNumber:measurement.row.evidenceNumber,
    artifactRef:measurement.row.artifactRef,pointer:`/receipt/exchange/attackEstimates/${index}`});
  const metrics=['expectedDamage','expectedCasualties','expectedSupplyAfter','expectedSupplyLoss'];
  const rows=[],unmatched=[];
  for(const [index,row]of left.entries()){
    const key=identity(row),matches=right.map((r,i)=>({r,i})).filter(({r})=>isDeepStrictEqual(key,identity(r)));
    if(matches.length!==1||left.filter(r=>isDeepStrictEqual(key,identity(r))).length!==1){
      unmatched.push({identity:copy(key),reason:matches.length===0?'missing_target_row':'ambiguous_row_identity'});continue;
    }
    const {r:other,i}=matches[0];
    rows.push({identity:copy(key),reference:rowRef(reference,index),target:rowRef(target,i),
      metrics:metrics.filter(metric=>Number.isFinite(row.outcomes?.[metric])&&Number.isFinite(other.outcomes?.[metric]))
        .map(metric=>({metric,reference:row.outcomes[metric],target:other.outcomes[metric],
          referenceMinusTarget:row.outcomes[metric]-other.outcomes[metric]})),
      referenceSampleCount:row.outcomes?.sampleCount??null,targetSampleCount:other.outcomes?.sampleCount??null});
  }
  return {referenceMeasurement:reference.row.evidenceNumber,targetMeasurement:target.row.evidenceNumber,rows,unmatched};
}

// Validate that condition facts concern precisely the already matched Native
// pair. Unavailable data stays diagnostic, never equality, zero or approval.
async function measuredConditions(relations,measured,compareSceneConditions){
  const pairs=new Map();
  for(const relation of relations){
    if(relation.referenceMeasurement===relation.targetMeasurement)continue;
    const key=JSON.stringify([relation.referenceMeasurement,relation.targetMeasurement]);
    if(!pairs.has(key))pairs.set(key,relation);
  }
  const comparisons=[],reads=new Map();
  for(const relation of pairs.values()){
    const {referenceMeasurement,targetMeasurement,referenceStateRef,targetStateRef,source}=relation;
    const entry={referenceMeasurement,targetMeasurement,referenceStateRef:copy(referenceStateRef),
      targetStateRef:copy(targetStateRef),projectionSource:copy(source)};
    try{
      if(typeof compareSceneConditions!=='function')throw Object.assign(Error('condition_reader_unavailable'),{code:'condition_reader_unavailable'});
      const pair={referenceStateRef,targetStateRef},key=JSON.stringify(pair);
      if(!reads.has(key))reads.set(key,Promise.resolve().then(()=>compareSceneConditions(pair)));
      const receipt=await reads.get(key),comparison=receipt?.comparison;
      const exact=(identity,ref,number)=>{
        const native=measured.find(m=>m.row.evidenceNumber===number)?.body.receipt;
        return native&&identity?.sourceStateHash===ref.sourceStateHash&&identity?.baseStateHash===ref.stateHash
          &&identity.rulesRuntimeHash===native.rulesRuntimeHash&&identity.builderBundleHash===native.builderBundleHash;
      };
      if(receipt?.resultStatus!=='ok'||comparison?.complete!==true
        ||!exact(comparison.left,referenceStateRef,referenceMeasurement)||!exact(comparison.right,targetStateRef,targetMeasurement))
        throw Object.assign(Error('native_condition_identity_or_completeness_mismatch'),{code:'native_condition_identity_or_completeness_mismatch'});
      comparisons.push({...entry,status:'observed',receipt:copy(receipt)});
    }catch(error){comparisons.push({...entry,status:'unavailable',factProven:false,
      reasonCode:error.code??'condition_read_failed'});}
  }
  return {source:'literal',value:{schema:'roster_measurement_conditions_v1',version:1,comparisons,
    originalArtifactsUnchanged:true,trainingTruth:false,
    instruction:'Condition observations for the exact pairs already matched by their Native projection and measurements, not new scenarios or attacks. Read each complete Native comparison: its differences list all changed persisted fields and its coverage identifies equal fields. Geometry proof-scope flags are not negative findings and do not veto these condition facts. Unavailable entries prove nothing. The role still evaluates changed factors, query settings, sampling and reactions; no causal, strategic or release decision is made here.'}};
}

export async function projectRosterMeasurementSceneInputsV1({sources,measurements,readArtifact,compareSceneConditions}){
  const values=new Map(),get=async ref=>{
    if(!values.has(ref))values.set(ref,unwrap(await readArtifact(ref)));
    return values.get(ref);
  };
  const measured=[];
  for(const row of measurements){
    if(row.participantStatus==='unavailable')continue;
    const body=await get(row.artifactRef),ref=stateReference(body);
    if(body.status==='completed'&&body.receipt?.resultStatus==='ok'&&ref)measured.push({row,body,ref});
  }
  const relations=[],inputs={},delivered=new Map(),differences=[];
  for(const {row:source,e}of sources.values()){
    const projection=savedProjection(await get(e.artifactRef));if(!projection)continue;
    const {receipt,proof,reference,target,pointer}=projection;
    for(const left of measured)for(const right of measured){
      if(!sameMeasuredState(left.ref,reference)||!sameMeasuredState(right.ref,target)
        ||!sameIds(left.row.subjectUnitIds,right.row.subjectUnitIds)||!sameIds(left.row.targetIds,right.row.targetIds)
        ||left.body.receipt.rulesRuntimeHash!==proof.referenceRulesRuntimeHash
        ||right.body.receipt.rulesRuntimeHash!==proof.targetRulesRuntimeHash
        ||left.body.receipt.builderBundleHash!==receipt.builderBundleHash
        ||right.body.receipt.builderBundleHash!==receipt.builderBundleHash)continue;
      const participants=[...new Set([...left.row.subjectUnitIds,...left.row.targetIds])].sort();
      // terrainPreserved means the target's ORIGINAL terrain was unchanged.
      // Copying reference terrain intentionally makes that false, but provides
      // a distinct Native observation. Do not mislabel it as incompatible.
      const terrainRelationship=proof.terrainPreserved===true?'target_terrain_preserved'
        :proof.terrainTransfer?.policy==='copy_reference'
          &&typeof proof.boardHash==='string'&&proof.terrainTransfer.referenceBoardHash===proof.boardHash
          ?'reference_terrain_copied':'not_established';
      const exact=terrainRelationship!=='not_established'&&participants.length>0
        &&participants.every(id=>proof.exactUnits?.includes(id)
          &&proof.materializedSpec?.placements?.some(p=>p.pieceId===id&&p.modelPositions?.length))
        &&!(proof.adaptedUnits??[]).some(u=>participants.includes(u.unitId));
      const sourceRef={evidenceNumber:source.evidenceNumber,sourceEvidenceId:e.id,artifactRef:e.artifactRef,pointer};
      relations.push({referenceMeasurement:left.row.evidenceNumber,targetMeasurement:right.row.evidenceNumber,
        referenceStateRef:copy(reference),targetStateRef:copy(target),participantUnitIds:participants,source:sourceRef,
        geometryStatus:exact?'exact_participants_preserved':'projection_requires_inspection',
        terrainPreserved:proof.terrainPreserved===true,terrainRelationship,phase:proof.phase,activeSideKey:proof.activeSideKey});
      if(!differences.some(p=>p.referenceMeasurement===left.row.evidenceNumber&&p.targetMeasurement===right.row.evidenceNumber)){
        const difference=rowDifferences(left,right);if(difference)differences.push(difference);
      }
      if(!delivered.has(e.artifactRef)){
        delivered.set(e.artifactRef,true);
        inputs['measurementScene'+delivered.size]={source:'evidence',evidenceId:e.id,evidenceNumber:source.evidenceNumber,
          artifactRef:e.artifactRef,pointer:sourceRef.pointer,status:'read',value:copy(proof)};
      }
    }
  }
  if(!relations.length)return {};
  const measurementConditions=await measuredConditions(relations,measured,compareSceneConditions);
  return {...inputs,measurementConditions,...(differences.length?{measurementRowDifferences:{source:'literal',value:{
    schema:'roster_measurement_row_differences_v1',version:2,comparisons:differences,assessmentScope:assessmentScope('matched_row_arithmetic'),
    instruction:'Exact saved operands and reference-minus-target arithmetic, matched by attacker, target, side, weapon and declared choices, NOT array index. Missing or duplicate rows do not become zero. Original source row pointers remain authoritative. Do not substitute a different weapon value or accept reviewer arithmetic that contradicts these operands. Arithmetic alone neither establishes nor refutes component attribution; evaluate it with the delivered condition and configuration observations. These rows are not a combined volley. Preserve the original sampling and reaction limitations.'}}}:{}),measurementScenes:{source:'literal',value:{schema:'roster_measurement_scenes_v1',
    version:ROSTER_MEASUREMENT_SCENE_DELIVERY_VERSION_V1,relations,originalArtifactsUnchanged:true,
    assessmentScope:assessmentScope('native_geometry_relationships'),
    instruction:'These links use exact Native source/context/branch identities, not names or proposed conditions. The accompanying original projection records which participants kept every model position and which were adapted, with terrain, phase and exclusions. Different candidate/state/graph hashes do not by themselves demonstrate different geometry or independent confounders. Non-geometric conditions are assessed by the separate complete Native measurementConditions observations, not by these geometry links. Target-owned abilities/resources/status are not transplanted from the reference. Inspect the saved query settings and uncertainty separately; no remeasurement is needed merely to read those conditions. A cached result for the exact measured state is not a fresh observation but is still that saved measurement. Geometry preservation is not an arrival or movement legality claim.'}}};
}
