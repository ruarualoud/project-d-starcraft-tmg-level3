import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectOfficialFriendlyLostSupplyV1} from '../rule-atoms/official-friendly-lost-supply-threshold-v1.mjs';
import {compileOfficialTalDarimThresholdSpecV1} from '../source-data/official-tal-darim-threshold-source-v1.mjs';
const normalize=s=>String(s||'').trim().toLowerCase();
const expected=['chain-of-ascension','4-or-more','6-or-more'].map(s=>'card:tal_darim/'+s+'-any@1');
function routesFor(bundle){
  const routes=bundle?.routes.filter(r=>expected.includes(r.definitionId))||[];
  if(!routes.length)return [];
  if(routes.length!==3||expected.some(id=>!routes.some(r=>r.definitionId===id)))throw Error('TAL_DARIM_THRESHOLD_COMPLETE_SOURCE_REQUIRED');
  for(const r of routes){const spec=compileOfficialTalDarimThresholdSpecV1({...r,definitionName:r.abilityName});
    if(!spec||Object.entries(spec).some(([k,v])=>r[k]!==v))throw Error('TAL_DARIM_THRESHOLD_ROUTE_INVALID');}
  return routes;
}
function ownerCard(state,routes,sideKey){
  const route=routes[0];if(!route)return null;
  return(state.cardResources?.[sideKey]||[]).find(c=>c.officialCardRecordKey===route.recordKey
    &&c.sourceRecordHash===route.sourceRecordHash&&c.officialPayloadHash===route.payloadHash)||null;
}
function firstWeapon(piece,round){
  const entry=piece.officialTalDarimFirstWeapon;
  if(!entry)return null;
  const {bindingHash,...body}=entry;
  if(entry.schema!=='starcraft_tmg_official_tal_darim_first_weapon_v1'||bindingHash!==hash(body)
    ||entry.pieceId!==piece.id||entry.sideKey!==piece.sideKey||!Number.isSafeInteger(entry.round)||!entry.weaponName)
    throw Error('TAL_DARIM_FIRST_WEAPON_BINDING_INVALID');
  return entry.round===Number(round)?entry:null;
}
export function assertOfficialTalDarimThresholdStateV1(state){
  const routes=routesFor(state.officialCharacteristicStatusFamilySourceBundle);
  if(!routes.length)return false;
  const policy=state.officialTalDarimThresholdPolicy,{policyHash,...body}=policy||{};
  if(policy?.schema!=='starcraft_tmg_official_tal_darim_threshold_policy_v1'||policy.version!=='1.0.0'
    ||policyHash!==hash(body)||policy.sourceBundleHash!==state.officialCharacteristicStatusFamilySourceBundle.bundleHash
    ||policy.baselineHash!==state.officialFriendlyLostSupplyBaseline?.baselineHash
    ||policy.exclusiveWeaponBatchContinuation!==true||policy.trainingTruth!==false)
    throw Error('TAL_DARIM_THRESHOLD_POLICY_REQUIRED');
  for(const sideKey of ['player1','player2'])if(ownerCard(state,routes,sideKey))projectOfficialFriendlyLostSupplyV1({state,sideKey});
  return true;
}
export function projectOfficialTalDarimThresholdWeaponsV1({bundle,state,piece,context}){
  const routes=routesFor(bundle);
  if(!routes.length||!piece.isOnField||piece.isDestroyed||!context.weaponName
    ||!['ranged','close_combat'].includes(normalize(context.attackKind))
    ||context.targetPieceId===piece.id||context.attackerPieceId&&context.attackerPieceId!==piece.id
    ||!ownerCard(state,routes,piece.sideKey))return null;
  const supply=projectOfficialFriendlyLostSupplyV1({state,sideKey:piece.sideKey}),used=firstWeapon(piece,state.round),
    matches=!used||used.weaponName===normalize(context.weaponName),
    applicable=matches?routes.filter(r=>r.threshold&&supply.totalLostSupply>=r.threshold):[];
  return{totalLostSupply:supply.totalLostSupply,baselineHash:supply.baselineHash,
    firstWeaponName:used?.weaponName||normalize(context.weaponName),matchesFirstWeapon:matches,
    precision:Math.max(0,...applicable.filter(r=>r.keyword==='precision').map(r=>r.value)),
    criticalHit:Math.max(0,...applicable.filter(r=>r.keyword==='critical_hit').map(r=>r.value)),
    sourceDefinitionIds:applicable.map(r=>r.definitionId).sort(),
    includesReservesAndDestroyed:true,contextualSupplyUsed:false,killCreditUsed:false};
}
export function recordOfficialTalDarimFirstWeaponV1(state,piece,weaponName){
  const routes=routesFor(state.officialCharacteristicStatusFamilySourceBundle),card=ownerCard(state,routes,piece.sideKey);
  if(!card||firstWeapon(piece,state.round))return null;
  if(!weaponName)throw Error('TAL_DARIM_FIRST_WEAPON_NAME_REQUIRED');
  const body={schema:'starcraft_tmg_official_tal_darim_first_weapon_v1',pieceId:piece.id,sideKey:piece.sideKey,
    round:Number(state.round),weaponName:normalize(weaponName),sourceCardInstanceId:card.cardInstanceId,
    sourceDefinitionId:'card:tal_darim/chain-of-ascension-any@1',trainingTruth:false};
  piece.officialTalDarimFirstWeapon={...body,bindingHash:hash(body)};
  return piece.officialTalDarimFirstWeapon;
}
