import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {verifyOfficialFirebatSourceBundleV1} from '../source-data/official-firebat-source-v1.mjs';
export const OFFICIAL_FIREBAT_SUBSTITUTION_ATOM_ID='rule-atom:wave4/per-model-flamer-substitution@1';

// Selection only. The attack owner supplies its actual contributing model set;
// coverage, dice, defence, casualties and weapon completion keep their owners.
export function prepareOfficialFirebatModelSubstitutionV1({state,pieceId,attackKind,eligibleModelIds,templateModelIds,sourceBundle}){
  verifyOfficialFirebatSourceBundleV1(sourceBundle);
  const piece=state.pieces.find(p=>p.id===pieceId),route=sourceBundle.routes.find(r=>r.attackKind===attackKind);
  if(!piece||piece.officialUnitRecordKey!=='army_units:firebat'||piece.sourceRecordHash!==route?.sourceRecordHash
    ||piece.officialPayloadHash!==route.payloadHash||sourceBundle.normalizedDatasetHash!==state.officialAttackProfileCatalogue?.normalizedDatasetHash
    ||route.phase!==state.phase||!piece.isOnField||piece.isDestroyed||!['ranged','close_combat'].includes(attackKind))
    throw Error('FIREBAT_SUBSTITUTION_SOURCE_OR_PHASE_INVALID');
  const selected=(piece.selectedUpgradeNames||[]).map(s=>s.toLowerCase()),cost=Number(route.costByComposition?.[piece.compositionKind]||0);
  if(cost>0&&!selected.includes(route.definitionName.toLowerCase()))throw Error('FIREBAT_SUBSTITUTION_UPGRADE_NOT_PURCHASED');
  const live=(piece.models||[]).filter(m=>m.isOnField!==false&&!m.isDestroyed).map(m=>m.id),eligible=new Set(eligibleModelIds);
  if(!Array.isArray(eligibleModelIds)||eligible.size!==eligibleModelIds.length||!eligible.size
    ||eligibleModelIds.some(id=>!live.includes(id))||!Array.isArray(templateModelIds)
    ||new Set(templateModelIds).size!==templateModelIds.length||templateModelIds.some(id=>!eligible.has(id)))
    throw Error('FIREBAT_SUBSTITUTION_MODEL_SELECTION_INVALID');
  const limit=attackKind==='ranged'&&Number(piece.currentSupply)===2?route.maximumModelsAtSupplyTwo:route.maximumModels;
  if(templateModelIds.length>limit)throw Error('FIREBAT_SUBSTITUTION_MODEL_LIMIT');
  const templates=[...templateModelIds].sort(),numeric=eligibleModelIds.filter(id=>!templates.includes(id)).sort();
  const body={schema:'starcraft_tmg_official_firebat_model_substitution_v1',version:'1.0.0',
    ruleAtomId:OFFICIAL_FIREBAT_SUBSTITUTION_ATOM_ID,sourceBundleHash:sourceBundle.bundleHash,sourceFeatureHash:route.sourceFeatureHash,
    sourceDefinitionId:route.definitionId,stateHash:hash(state),round:Number(state.round),phase:state.phase,pieceId,attackKind,
    weaponName:route.weaponName,currentSupply:Number(piece.currentSupply),maximumTemplateModels:limit,
    templateModelIds:templates,numericModelIds:numeric,substitutedModelsExcludedFromNumericPool:true,
    coverageResolved:false,completeAttackResolution:false,trainingTruth:false};
  return{...body,planHash:hash(body)};
}
