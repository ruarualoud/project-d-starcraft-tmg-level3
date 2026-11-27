import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectOfficialAllocatedCasualtyModelIdsV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import {evaluateOfficialWithinWhollyWithinV1} from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
export function inspectOfficialDetonationFactsV1(state,source,route,context){
 const invalid=()=>{throw Error('DETONATION_CASUALTY_WITNESS_INVALID');};
 if(!source||source.officialUnitRecordKey!==route.recordKey||route.effectKind!=='before_casualty_detonation'
  ||source.isOnField!==true||source.isDestroyed||!source.currentModels)return invalid();
 projectOfficialAllocatedCasualtyModelIdsV1(state,source);
 const witness=context?.beforeCasualtyReservations?.find(row=>row.targetPieceId===source.id);
 const reservation=(source.officialBeforeCasualtyReservations||[]).find(r=>r.reservationHash===(witness?.reservationHash??context?.beforeCasualtyReservationHash));
 if(!reservation||!reservation.modelIds.length||reservation.sourceActionHash!==(witness?.sourceActionHash??context.beforeCasualtySourceActionHash))return invalid();
 const measurements=state.pieces.filter(p=>p.sideKey!==source.sideKey&&p.isOnField===true&&!p.isDestroyed&&p.currentModels>0)
  .map(target=>{const checks=source.models.filter(m=>m.isOnField!==false&&!m.isDestroyed).map(model=>evaluateOfficialWithinWhollyWithinV1({
   state,dataBundle:state.officialModelBaseGeometryDataBundle,source:{kind:'model',unitId:source.id,modelId:model.id},
   targetUnitId:target.id,rangeMilliInches:route.enemyRangeMilliInches}));
   return{targetUnitId:target.id,within:checks.some(c=>c.unitWithin),measurementResultHashes:checks.map(c=>c.resultHash)};});
 const body={sourcePieceId:source.id,sourceDefinitionId:route.definitionId,sourceFeatureHash:route.sourceFeatureHash,
  reservationHash:reservation.reservationHash,modelIdsToBeDestroyed:[...reservation.modelIds],
  hits:reservation.modelIds.length*route.hitsPerCasualty,damagePerHit:route.damagePerHit,
  targetUnitIds:measurements.filter(m=>m.within).map(m=>m.targetUnitId).sort(),measurements,
  sourceModelsStillOnBattlefield:true,areaEffectWithoutTargetSelection:true,trainingTruth:false};
 return{...body,factsHash:hash(body)};
}
