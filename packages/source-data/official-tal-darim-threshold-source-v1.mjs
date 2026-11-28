import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const entries={
  'chain-of-ascension':{name:'Chain of Ascension',text:'Chain of Ascension <Passive> <Any Phase>: Calculate the total lost Supply of all Friendly Units. While this total is:',
    spec:{effectKind:'friendly_lost_supply_total',actionKind:'query_modifier'}},
  '4-or-more':{name:'4 or more',text:"4 or more: All your Units' first used weapons gain PRECISION (1).",
    spec:{effectKind:'friendly_lost_supply_weapon_keyword',actionKind:'query_modifier',threshold:4,keyword:'precision',value:1,weaponScope:'all',firstWeaponOnly:true}},
  '6-or-more':{name:'6 or more',text:"6 or more: All your Units' first used weapons gain CRITICAL HIT (1).",
    spec:{effectKind:'friendly_lost_supply_weapon_keyword',actionKind:'query_modifier',threshold:6,keyword:'critical_hit',value:1,weaponScope:'all',firstWeaponOnly:true}}
};
const recordKey='tactical_cards:tal_darim';
export function compileOfficialTalDarimThresholdSpecV1(definition){
  const e=Object.entries(entries).find(([key])=>definition?.definitionId==='card:tal_darim/'+key+'-any@1')?.[1];
  if(!e)return null;
  if(definition.recordKey!==recordKey||definition.definitionName!==e.name||definition.sourceText!==e.text
    ||definition.sourceKind!=='card_feature'||definition.activationKind!=='passive'||definition.phase!=='any')
    throw Error('TAL_DARIM_THRESHOLD_SOURCE_MISMATCH');
  return{...structuredClone(e.spec),sourceRecordHash:definition.sourceRecordHash,payloadHash:definition.payloadHash};
}

// These two source rows continue the immediately preceding, explicit Passive
// Chain of Ascension heading. Record that review without changing their IDs,
// source bytes, semantic versions, or the old release's identity catalogue.
export function reviewOfficialTalDarimThresholdIdentityV1({dataset,registry}){
  const {registryHash,...body}=registry||{},record=dataset.recordsByKey[recordKey];
  if(registry?.schema!=='starcraft_tmg_ability_identity_registry_v2'||registryHash!==hash(body)
    ||record?.payload.isFactionCard!==true||record.payload.name!=="Tal'darim")throw Error('TAL_DARIM_IDENTITY_SOURCE_REQUIRED');
  const boosts=record.payload.boosts;
  if(!['chain-of-ascension','4-or-more','6-or-more'].every((key,index)=>boosts[index+1]?.name===entries[key].name
    &&boosts[index+1].description===entries[key].text))throw Error('TAL_DARIM_THRESHOLD_HEADING_SOURCE_MISMATCH');
  const reviewed=new Set(['card:tal_darim/4-or-more-any','card:tal_darim/6-or-more-any']);
  if(registry.entries.filter(e=>reviewed.has(e.semanticId)).length!==2)throw Error('TAL_DARIM_THRESHOLD_IDENTITY_MISSING');
  const next={...body,entries:registry.entries.map(e=>reviewed.has(e.semanticId)?{...e,activationKind:'passive',
    classificationReason:'Exact continuation clauses of the immediately preceding Chain of Ascension Passive/Any Phase heading.'}:e)};
  return{...next,registryHash:hash(next)};
}
