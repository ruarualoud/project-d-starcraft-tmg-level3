// Mechanical projection of a model-selected comparison scene. No new Rules,
// strategic ranking, participant omission or implicit formation choice.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const clone=v=>structuredClone(v);
// One source-owned contract for direct projection and candidate_context's nested
// comparisonScene. Shape errors need no Builder evaluation or private room.
export const PREGAME_SCENE_PROJECTION_ARGUMENTS_V1=Object.freeze({
  referenceStateRef:'Whole stateRef of the selected saved reference scene, including its candidate context; bind from Native evidence.',
  changedUnits:'Explicit [{unitId,mode:"repack_at_reference_anchor"}] for a model set/footprint that you choose to repack; [] when preserving exact model positions. Upgrade-only edits do not by themselves require repacking. Unit-ID strings are not accepted. Native still checks actual differences; Host never chooses adaptation.',
  unlistedUnits:'Required "off_table": compare exactly the reference participants, explicitly excluding all other target units.',
  terrainPolicy:'Optional "require_equal" (default) or explicitly "copy_reference". Default copies ONLY unit geometry and requires equal environments. copy_reference copies terrain/accessPoints from the selected saved reference into this PRIVATE comparison; all other board fields, mission, Rules and round must still match. It never transfers resources, damage or action history. Use it to compare an upgrade on the same declared clear-terrain or terrain-bearing reference; Host never infers this choice from prose.'
});
export const PREGAME_SCENE_PROJECTION_PARAMETER_SCHEMA_V1=Object.freeze({type:'object',additionalProperties:false,required:['changedUnits','unlistedUnits'],properties:{
 changedUnits:{type:'array',items:{type:'object',additionalProperties:false,required:['unitId','mode'],properties:{unitId:{type:'string',minLength:1},mode:{type:'string',enum:['repack_at_reference_anchor']}}}},
 unlistedUnits:{type:'string',enum:['off_table']},terrainPolicy:{type:'string',enum:['require_equal','copy_reference']}}});
const terrainFields=['terrain','accessPoints'];
export function capturePregameTerrainEnvironmentV1(board){
  const other=clone(board),fields={};
  for(const key of terrainFields){if(Object.hasOwn(other,key))fields[key]=other[key];delete other[key];}
  return {nonTerrainHash:hash(other),fields};
}
export function applyPregameProjectedTerrainV1(board,transfer){
  if(transfer?.policy!=='copy_reference'||hash(board)!==transfer.targetBoardHash
    ||capturePregameTerrainEnvironmentV1(board).nonTerrainHash!==transfer.nonTerrainHash
    ||!transfer.fields||Object.keys(transfer.fields).some(k=>!terrainFields.includes(k)))
    reject('PREGAME_LAB_SCENE_PROJECTION_TERRAIN_SOURCE_CHANGED');
  const next=clone(board);
  for(const key of terrainFields){delete next[key];if(Object.hasOwn(transfer.fields,key))next[key]=clone(transfer.fields[key]);}
  if(hash(next)!==transfer.referenceBoardHash)reject('PREGAME_LAB_SCENE_PROJECTION_TERRAIN_SOURCE_CHANGED');
  return next;
}
export function projectPregameSceneProjectionFailureV1({code,detail}){
  if(code!=='PREGAME_LAB_SCENE_PROJECTION_ENVIRONMENT_MISMATCH'||!detail?.fields?.length
    ||!detail.fields.every(k=>['boardHash','builderBundleHash','round','rulesContract'].includes(k)))return null;
  return {correctable:false,controlReturn:true,sourceContract:'pregame_scene_environment_v1',
    failureClass:'scene_environment_mismatch',resolutionRequired:'method_or_scope_decision',
    environmentFields:clone(detail.fields),environmentDifferences:clone(detail.environmentDifferences??[]),
    projectionExecuted:false,originalQueryNotAnswered:true,candidateMayAlreadyBeLegal:true,
    ineffectiveCorrections:['changedUnits','model repacking','upgrade renaming'],
    inputContract:clone(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1),
    instruction:'The rejected fields are ENVIRONMENT identities, not unit/model identity. boardHash means the saved reference board/terrain differs from the candidate target board. Default comparisonScene/project_scene copies ONLY unit positions, not terrain. Repacking models or renaming upgrades cannot fix this. Return the original experiment and both identities to its method owner. For the same declared reference environment the owner may explicitly select terrainPolicy:"copy_reference" in comparisonScene or project_scene; Native copies only saved terrain/accessPoints and still requires all other board fields, mission, Rules and round to match. Alternatively explicitly prepare a compatible target or redesign the method. Do not infer terrain changes from prose, replace the reference, reset attempts or replay a valid candidate audit. A legal candidate may already be saved in detail.candidateReceipt. The failed projection proves no combat result or strategic inferiority.'};
}
function reject(code,detail){throw Object.assign(Error(code),{code,detail,queryRepair:projectPregameSceneProjectionFailureV1({code,detail})??{correctable:true,
  sourceContract:'pregame_scene_projection_v1',originalQueryNotAnswered:true,
  inputContract:clone(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1),
  instruction:'Select a saved referenceStateRef and target stateRef. All reference participants must exist with the same unit/side identity. For each changed model set explicitly choose changedUnits[{unitId,mode:"repack_at_reference_anchor"}], or use a separate explicitly designed scenario. unlistedUnits:"off_table" restricts this private comparison to reference participants and is NOT a whole-roster value test. The Host never silently drops a participant or chooses an adaptation.'}});}
export function assertPregameSceneProjectionInputV1({changedUnits,unlistedUnits,terrainPolicy='require_equal'}){
  if(!['require_equal','copy_reference'].includes(terrainPolicy)||unlistedUnits!=='off_table'||!Array.isArray(changedUnits)
    ||changedUnits.some(u=>!u||Object.keys(u).some(k=>!['unitId','mode'].includes(k))
      ||typeof u.unitId!=='string'||u.mode!=='repack_at_reference_anchor')
    ||new Set(changedUnits.map(u=>u.unitId)).size!==changedUnits.length)
    reject('PREGAME_LAB_SCENE_PROJECTION_INPUT_INVALID');
}
export function compilePregameSceneProjectionV1({reference,target,changedUnits,unlistedUnits,terrainPolicy='require_equal'}){
  assertPregameSceneProjectionInputV1({changedUnits,unlistedUnits,terrainPolicy});
  const copyTerrain=terrainPolicy==='copy_reference'
    &&reference.terrainEnvironment&&target.terrainEnvironment
    &&reference.terrainEnvironment.nonTerrainHash===target.terrainEnvironment.nonTerrainHash;
  const incompatible=['boardHash','builderBundleHash','round']
    .filter(k=>reference[k]!==target[k]&&!(k==='boardHash'&&copyTerrain));
  if(terrainPolicy==='copy_reference'&&!copyTerrain&&!incompatible.includes('boardHash'))incompatible.push('boardHash');
  // Runtime hashes also bind the selected army's executable composition. The
  // experiment intentionally changes that army; compare its Rules VERSION and
  // mission contract, not the per-army runtime identity. Keep both identities.
  if(!isDeepStrictEqual(reference.rulesContract,target.rulesContract))incompatible.push('rulesContract');
  if(incompatible.length)reject('PREGAME_LAB_SCENE_PROJECTION_ENVIRONMENT_MISMATCH',{fields:incompatible,
    environmentDifferences:incompatible.map(field=>({field,reference:clone(reference[field]??null),target:clone(target[field]??null)})),
    referenceStateHash:reference.baseStateHash,targetStateHash:target.baseStateHash});
  const participants=reference.units.filter(u=>u.onTable);
  if(!participants.length||reference.geometryFailures.length)
    reject('PREGAME_LAB_SCENE_PROJECTION_REFERENCE_INCOMPLETE',{participants:participants.length,geometryFailures:reference.geometryFailures});
  const placements=[],differences=[],adaptedUnits=[],exactUnits=[],consumed=new Set();
  for(const unit of participants){
    const destination=target.units.find(u=>u.unitId===unit.unitId);
    if(!destination||destination.sideKey!==unit.sideKey||destination.officialUnitRecordKey!==unit.officialUnitRecordKey){
      differences.push({unitId:unit.unitId,reason:'missing_or_different_unit_identity'});continue;
    }
    if(!unit.modelPositions.length||unit.livingModelCount!==unit.modelPositions.length){
      differences.push({unitId:unit.unitId,reason:'reference_partial_model_placement'});continue;
    }
    const exact=isDeepStrictEqual(unit.modelFootprints,destination.modelFootprints);
    const adaptation=changedUnits.find(u=>u.unitId===unit.unitId);
    if(exact&&!adaptation){placements.push({pieceId:unit.unitId,modelPositions:clone(unit.modelPositions)});exactUnits.push(unit.unitId);continue;}
    if(!adaptation){differences.push({unitId:unit.unitId,reason:'model_set_or_footprint_changed',referenceModels:unit.livingModelCount,targetModels:destination.livingModelCount});continue;}
    consumed.add(unit.unitId);
    const anchor=unit.modelPositions[0];
    placements.push({pieceId:unit.unitId,xInches:anchor.xInches,yInches:anchor.yInches});
    adaptedUnits.push({unitId:unit.unitId,mode:adaptation.mode,referenceModels:unit.livingModelCount,
      targetModels:destination.livingModelCount,anchor:{xInches:anchor.xInches,yInches:anchor.yInches},exactGeometryPreserved:false});
  }
  const unused=changedUnits.filter(u=>!consumed.has(u.unitId));
  if(differences.length||unused.length)reject('PREGAME_LAB_SCENE_PROJECTION_DIFFERENCES',{differences,unusedAdaptations:unused});
  const spec={kind:'hypothetical_geometry',phase:reference.phase,activeSideKey:reference.activeSideKey,
    isolateToPlacedPieces:true,reassessAllOnField:true,placements};
  return {spec,proof:{schema:'pregame_scene_projection_v1',referenceSourceStateHash:reference.sourceStateHash,
    referenceStateHash:reference.baseStateHash,targetSourceStateHash:target.sourceStateHash,targetParentStateHash:target.baseStateHash,
    referenceRulesRuntimeHash:reference.rulesRuntimeHash,targetRulesRuntimeHash:target.rulesRuntimeHash,rulesContract:clone(target.rulesContract),
    boardHash:reference.boardHash,phase:reference.phase,activeSideKey:reference.activeSideKey,
    exactUnits,adaptedUnits,excludedTargetUnits:target.units.filter(u=>!participants.some(p=>p.unitId===u.unitId)).map(u=>u.unitId),
    materializedSpec:clone(spec),hostSelectedReferenceOrAdaptation:false,
    terrainPreserved:reference.boardHash===target.boardHash,
    ...(copyTerrain?{terrainTransfer:{policy:'copy_reference',targetBoardHash:target.boardHash,
      referenceBoardHash:reference.boardHash,nonTerrainHash:reference.terrainEnvironment.nonTerrainHash,
      fields:clone(reference.terrainEnvironment.fields),hostSelectedTerrain:false}}:{}),
    referenceNonGeometryTransferred:false,targetNonGeometryPreservedExceptActivation:true,
    arrivalOrMovementLegalityProven:false,globalRosterSuperiorityProven:false,trainingTruth:false,
    conditions:['Conditional geometry/activation comparison, not a played state or guaranteed arrival',
      'Unlisted units stay off-table by explicit policy; their utility and cost opportunity are not measured',
      'Changed model sets are repacked only at the explicitly accepted reference anchor; inspect the actual Native result',
      'Target roster owns its abilities/resources/status; this does not transplant enemy choices or action history']}};
}
