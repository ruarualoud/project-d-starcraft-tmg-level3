// Deterministic navigation/comparison of saved Native scene receipts. Different
// roster branches intentionally have different whole-state/runtime identities.
// Compare observable fields, never infer experimental success from those IDs.
import {isDeepStrictEqual} from 'node:util';
const clone=structuredClone;
const identityEqual=(a,b)=>typeof a==='string'&&typeof b==='string'?a===b:null;
function positions(receipt){
  const units=receipt?.hypotheticalPlacements;
  if(receipt?.resultStatus!=='ok'||!Array.isArray(units)||!units.length)return null;
  if(units.some(u=>!u.pieceId||!Array.isArray(u.modelPositions)||!u.modelPositions.length
    ||u.placedModelCount!==u.modelPositions.length
    ||u.modelPositions.some(m=>!m.modelId||!Number.isFinite(m.xInches)||!Number.isFinite(m.yInches))))return null;
  if(new Set(units.map(u=>u.pieceId)).size!==units.length)return null;
  return units.map(u=>({pieceId:u.pieceId,models:clone(u.modelPositions)
    .sort((a,b)=>a.modelId.localeCompare(b.modelId))})).sort((a,b)=>a.pieceId.localeCompare(b.pieceId));
}
export function projectRosterComparisonSceneFactsV1(sources){
  const scenes=new Map();
  for(const {source,body}of sources){
    const receipt=body.receipt?.sceneProjectionReceipt??body.receipt;
    if(!receipt?.branchStateHash||!receipt.sourceStateHash)continue;
    const previous=scenes.get(source.artifactRef);
    if(previous){previous.evidenceNumbers.push(source.number);continue;}
    scenes.set(source.artifactRef,{artifactRef:source.artifactRef,evidenceNumbers:[source.number],receipt,
      pointer:body.receipt?.sceneProjectionReceipt?'/receipt/sceneProjectionReceipt':'/receipt'});
  }
  const all=[...scenes.values()],rows=[];
  const location=s=>({evidenceNumbers:s.evidenceNumbers,artifactRef:s.artifactRef,pointer:s.pointer,
    sourceStateHash:s.receipt.sourceStateHash,stateHash:s.receipt.branchStateHash,
    rulesRuntimeHash:s.receipt.rulesRuntimeHash});
  for(const target of all){
    const proof=target.receipt.sceneProjection;
    if(proof?.schema!=='pregame_scene_projection_v1')continue;
    const reference=all.find(s=>s.receipt.sourceStateHash===proof.referenceSourceStateHash
      &&s.receipt.branchStateHash===proof.referenceStateHash);
    const projected=positions(target.receipt),original=reference?positions(reference.receipt):null;
    // Only report this compatibility receipt when it actually belongs to the
    // target source. It records compiler checks, not every scientific premise.
    const compatible=target.receipt.resultStatus==='ok'
      &&target.receipt.sourceStateHash===proof.targetSourceStateHash
      &&target.receipt.rulesRuntimeHash===proof.targetRulesRuntimeHash;
    rows.push({schema:'roster_controlled_scene_comparison_v1',targetScene:location(target),
      referenceScene:reference?location(reference):null,
      referenceLookup:{sourceStateHash:proof.referenceSourceStateHash,stateHash:proof.referenceStateHash},
      exactModelPositionsEqual:original&&projected?isDeepStrictEqual(original,projected):null,
      comparedFields:'Every saved model position field, including model identity, coordinates, rotation, elevation and terrain/access-point support; unit/model order and layout-generator labels are not geometric differences.',
      wholeStateIdentityEqual:reference?identityEqual(reference.receipt.branchStateHash,target.receipt.branchStateHash):null,
      runtimeCompositionIdentityEqual:reference?identityEqual(reference.receipt.rulesRuntimeHash,target.receipt.rulesRuntimeHash):null,
      projectionCompatibility:compatible?{boardHash:proof.boardHash,
        builderBundleHash:target.receipt.builderBundleHash,rulesContract:clone(proof.rulesContract),
        phase:proof.phase,activeSideKey:proof.activeSideKey,terrainPreserved:proof.terrainPreserved,
        exactUnits:clone(proof.exactUnits),adaptedUnits:clone(proof.adaptedUnits),
        sourcePointer:target.pointer+'/sceneProjection'}:null,
      allControlledConditionsApproved:false,combinedAttackOutcomeProven:false,strategyImprovementProven:false,
      instruction:'This compares saved fields, not opaque identifiers. Runtime identity includes selected army composition; differing source/runtime/relationship hashes alone do not prove changed Rules VERSION, positions or cover. Use the exact reference/target scene receipts and projection rulesContract for those predicates. An adapted placement may end up equal: inspect the actual resulting positions, not only the adaptation request. Equality here does not prove unchanged footprints, weapon/target status, attack aggregation, arrival or strategic value; preserve the declared changed factors and check other relevant conditions. A missing comparison is unknown, not mismatch. No automatic rerun or strategic choice.'});
  }
  return rows;
}
