import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {verifyOfficialAbilityEffectIrCatalogueV1} from './official-ability-effect-ir-v1.mjs';
import {isDeepStrictEqual} from 'node:util';

export const OFFICIAL_FIREBAT_STIMPACK_ID='unit:firebat/stimpack-movement-phase@1';
const source={
  'stimpack-movement-phase':{name:'Stimpack',phase:'movement',activation:'active',cost:1,resource:'CP',
    text:'This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3), its Perdition Flamethrower and all Close Combat Weapons gain PRECISION (3).',
    spec:{effectKind:'stimpack',actionKind:'active_ability',nonLethalDamage:2,speedModifier:3,precision:3,
      rangedWeaponScope:'perdition flamethrower',closeCombatWeaponScope:'all',expiresAt:'cleanup_and_refresh'}},
  'incinerator-gauntlets-movement-phase':{name:'Incinerator Gauntlets',phase:'movement',activation:'active',cost:1,resource:'CP',
    text:'Set a Fire Wall token Within 4" in an unoccupied space. If a Unit’s Leading Model’s path of travel passes through this token, or if any model in a Unit ends either a Move, Deploy, Run, Charge, Disengage, or Close Ranks action, or is Set Within 1" of this token, remove the Fire Wall token from the battlefield before executing that move. If you do, that Unit suffers HITS 5 (1). If that Unit performed a Charge action, it cannot resolve the IMPACT effect.',
    spec:{effectKind:'pre_movement_fire_wall',setWithinMilliInches:4000,endpointRangeMilliInches:1000,
      automaticHits:5,damagePerHit:1,triggerActions:['move','deploy','run','charge','disengage','close_ranks','set'],
      leadingPathCrossing:true,removeBeforeMove:true,suppressChargeImpact:true}},
  'fire-it-up-assault-phase':{name:'Fire it Up',phase:'assault',activation:'passive',cost:0,resource:null,
    text:"When this Unit makes a Ranged Attack with its Perdition Flamethrower, you may choose 1 model in this Unit to attack using a Flamer Template (FT) instead of rolling its regular Rate of Attack (RoA). If this Unit's Current Supply Value is 2, you may choose up to 2 models to attack using Flamer Templates instead.",
    spec:{effectKind:'per_model_flamer_substitution',attackKind:'ranged',weaponName:'Perdition Flamethrower',
      optional:true,maximumModels:1,maximumModelsAtSupplyTwo:2}},
  'need-a-light-combat-phase':{name:'Need A Light?',phase:'combat',activation:'passive',cost:0,resource:null,
    text:'When this Unit makes a Close Combat Attack with its Flame Strike, you may choose 1 model in this Unit to attack using a Flamer Template (FT) instead of rolling its regular Rate of Attack (RoA).',
    spec:{effectKind:'per_model_flamer_substitution',attackKind:'close_combat',weaponName:'Flame Strike',optional:true,maximumModels:1}}
};
export function compileOfficialFirebatSpecV1(definition){
  if(definition?.recordKey!=='army_units:firebat')return null;
  const entry=Object.entries(source).find(([suffix])=>definition.definitionId==='unit:firebat/'+suffix+'@1')?.[1];
  if(!entry)return null;
  if(definition.definitionName!==entry.name||definition.phase!==entry.phase||definition.activationKind!==entry.activation
    ||definition.sourceKind!=='unit_feature'||definition.sourceText!==entry.text
    ||definition.activationText!==(entry.activation==='active'?'<Active>\n(1 Command Point)':'<Passive>'))
    throw Error('FIREBAT_FEATURE_SOURCE_MISMATCH:'+definition.definitionId);
  return structuredClone(entry.spec);
}
export function createOfficialFirebatSourceBundleV1({catalogue,definitionIds}={}){
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  if(!Array.isArray(definitionIds)||!definitionIds.length||new Set(definitionIds).size!==definitionIds.length)
    throw Error('FIREBAT_SOURCE_SELECTION_REQUIRED');
  const routes=definitionIds.map(id=>{
    const d=catalogue.definitions.find(r=>r.definitionId===id),spec=compileOfficialFirebatSpecV1(d);
    if(!spec)throw Error('FIREBAT_FEATURE_NOT_SUPPORTED:'+id);
    return{definitionId:id,recordKey:d.recordKey,definitionName:d.definitionName,activationKind:d.activationKind,
      activationText:d.activationText,sourceKind:d.sourceKind,sourceText:d.sourceText,costByComposition:structuredClone(d.costByComposition),
      sourceFeatureHash:d.sourceFeatureHash,sourceRecordHash:d.sourceRecordHash,
      payloadHash:d.payloadHash,phase:d.phase,resourceType:source[id.slice('unit:firebat/'.length,-2)].resource,
      resourceCost:source[id.slice('unit:firebat/'.length,-2)].cost,...spec};
  }).sort((a,b)=>a.definitionId.localeCompare(b.definitionId));
  const body={schema:'starcraft_tmg_official_firebat_source_bundle_v1',version:'1.0.0',sourceCatalogueHash:catalogue.catalogueHash,
    sourceSnapshotHash:catalogue.sourceSnapshotHash,normalizedDatasetHash:catalogue.normalizedDatasetHash,routes,
    productionRoomEligible:false,trainingTruth:false};
  const bundle={...body,bundleHash:hash(body)};verifyOfficialFirebatSourceBundleV1(bundle);return Object.freeze(bundle);
}

export function verifyOfficialFirebatSourceBundleV1(bundle){
  const {bundleHash,...body}=bundle||{};
  if(bundle?.schema!=='starcraft_tmg_official_firebat_source_bundle_v1'||bundle.version!=='1.0.0'||bundleHash!==hash(body)
    ||!Array.isArray(bundle.routes)||!bundle.routes.length||new Set(bundle.routes.map(r=>r.definitionId)).size!==bundle.routes.length
    ||bundle.productionRoomEligible!==false||bundle.trainingTruth!==false
    ||![bundle.sourceCatalogueHash,bundle.sourceSnapshotHash,bundle.normalizedDatasetHash].every(s=>/^[a-f0-9]{64}$/u.test(s)))
    throw Error('FIREBAT_SOURCE_BUNDLE_INVALID');
  for(const r of bundle.routes){
    const spec=compileOfficialFirebatSpecV1(r),entry=source[r.definitionId.slice('unit:firebat/'.length,-2)];
    if(!spec||Object.entries(spec).some(([k,v])=>!isDeepStrictEqual(v,r[k]))
      ||r.resourceCost!==entry.cost||r.resourceType!==entry.resource
      ||![r.sourceFeatureHash,r.sourceRecordHash,r.payloadHash].every(s=>/^[a-f0-9]{64}$/u.test(s)))
      throw Error('FIREBAT_SOURCE_ROUTE_INVALID');
  }
  return true;
}
