// Mechanical projection of a model-selected comparison scene. No new Rules,
// strategic ranking, participant omission or implicit formation choice.
import {isDeepStrictEqual} from 'node:util';
const clone=v=>structuredClone(v);
// One source-owned contract for direct projection and candidate_context's nested
// comparisonScene. Shape errors need no Builder evaluation or private room.
export const PREGAME_SCENE_PROJECTION_ARGUMENTS_V1=Object.freeze({
  referenceStateRef:'Whole stateRef of the selected saved reference scene, including its candidate context; bind from Native evidence.',
  changedUnits:'Explicit [{unitId,mode:"repack_at_reference_anchor"}] for a model set/footprint that you choose to repack; [] when preserving exact model positions. Upgrade-only edits do not by themselves require repacking. Unit-ID strings are not accepted. Native still checks actual differences; Host never chooses adaptation.',
  unlistedUnits:'Required "off_table": compare exactly the reference participants, explicitly excluding all other target units.'
});
function reject(code,detail){throw Object.assign(Error(code),{code,detail,queryRepair:{correctable:true,
  sourceContract:'pregame_scene_projection_v1',originalQueryNotAnswered:true,
  inputContract:clone(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1),
  instruction:'Select a saved referenceStateRef and target stateRef. All reference participants must exist with the same unit/side identity. For each changed model set explicitly choose changedUnits[{unitId,mode:"repack_at_reference_anchor"}], or use a separate explicitly designed scenario. unlistedUnits:"off_table" restricts this private comparison to reference participants and is NOT a whole-roster value test. The Host never silently drops a participant or chooses an adaptation.'}});}
export function assertPregameSceneProjectionInputV1({changedUnits,unlistedUnits}){
  if(unlistedUnits!=='off_table'||!Array.isArray(changedUnits)
    ||changedUnits.some(u=>!u||Object.keys(u).some(k=>!['unitId','mode'].includes(k))
      ||typeof u.unitId!=='string'||u.mode!=='repack_at_reference_anchor')
    ||new Set(changedUnits.map(u=>u.unitId)).size!==changedUnits.length)
    reject('PREGAME_LAB_SCENE_PROJECTION_INPUT_INVALID');
}
export function compilePregameSceneProjectionV1({reference,target,changedUnits,unlistedUnits}){
  assertPregameSceneProjectionInputV1({changedUnits,unlistedUnits});
  const incompatible=['boardHash','builderBundleHash','round']
    .filter(k=>reference[k]!==target[k]);
  // Runtime hashes also bind the selected army's executable composition. The
  // experiment intentionally changes that army; compare its Rules VERSION and
  // mission contract, not the per-army runtime identity. Keep both identities.
  if(!isDeepStrictEqual(reference.rulesContract,target.rulesContract))incompatible.push('rulesContract');
  if(incompatible.length)reject('PREGAME_LAB_SCENE_PROJECTION_ENVIRONMENT_MISMATCH',{fields:incompatible});
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
    materializedSpec:clone(spec),hostSelectedReferenceOrAdaptation:false,terrainPreserved:true,
    referenceNonGeometryTransferred:false,targetNonGeometryPreservedExceptActivation:true,
    arrivalOrMovementLegalityProven:false,globalRosterSuperiorityProven:false,trainingTruth:false,
    conditions:['Conditional geometry/activation comparison, not a played state or guaranteed arrival',
      'Unlisted units stay off-table by explicit policy; their utility and cost opportunity are not measured',
      'Changed model sets are repacked only at the explicitly accepted reference anchor; inspect the actual Native result',
      'Target roster owns its abilities/resources/status; this does not transplant enemy choices or action history']}};
}
