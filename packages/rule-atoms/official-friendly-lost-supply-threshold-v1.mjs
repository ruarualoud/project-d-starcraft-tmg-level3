import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {verifyOfficialUnitCardSupplyDataBundleV1} from '../source-data/official-unit-card-supply-data-bundle-v1.mjs';
export const OFFICIAL_FRIENDLY_LOST_SUPPLY_ATOM_ID='rule-atom:wave4/friendly-lost-supply-threshold@1';
const withoutHash=v=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='baselineHash'));

// Bind before deployment or declared attrition. Contextual/mission Supply and
// the opponent's VP ledger never contribute to this army characteristic.
export function createOfficialFriendlyLostSupplyBaselineV1({state}){
  const source=state.officialUnitCardSupplyDataBundle;
  verifyOfficialUnitCardSupplyDataBundleV1(source);
  if(new Set(state.pieces.map(p=>p.id)).size!==state.pieces.length)throw Error('FRIENDLY_LOST_SUPPLY_DUPLICATE_UNIT');
  const units=state.pieces.map(p=>{
    const profile=source.unitProfiles.find(r=>r.recordKey===p.officialUnitRecordKey),
      composition=profile?.compositions.find(c=>c.kind===p.compositionKind);
    if(!profile||profile.sourceRecordHash!==p.sourceRecordHash||profile.payloadHash!==p.officialPayloadHash
      ||!composition||composition.startingSupply!==p.currentSupply||composition.startingModels!==p.currentModels
      ||!['player1','player2'].includes(p.sideKey))throw Error('FRIENDLY_LOST_SUPPLY_PRISTINE_ROSTER_REQUIRED');
    return{pieceId:p.id,sideKey:p.sideKey,recordKey:p.officialUnitRecordKey,compositionKind:p.compositionKind,
      initialSupply:composition.startingSupply,sourceRecordHash:p.sourceRecordHash,payloadHash:p.officialPayloadHash};
  }).sort((a,b)=>a.pieceId.localeCompare(b.pieceId));
  const body={schema:'starcraft_tmg_official_friendly_lost_supply_baseline_v1',version:'1.0.0',
    unitCharacteristicsHash:source.bundleHash,units,trainingTruth:false};
  return{...body,baselineHash:hash(body)};
}

export function projectOfficialFriendlyLostSupplyV1({state,sideKey}){
  const baseline=state.officialFriendlyLostSupplyBaseline,source=state.officialUnitCardSupplyDataBundle;
  if(!['player1','player2'].includes(sideKey)||baseline?.schema!=='starcraft_tmg_official_friendly_lost_supply_baseline_v1'
    ||baseline.version!=='1.0.0'||baseline.trainingTruth!==false||baseline.baselineHash!==hash(withoutHash(baseline))
    ||baseline.unitCharacteristicsHash!==source?.bundleHash||!Array.isArray(baseline.units)
    ||new Set(baseline.units.map(p=>p.pieceId)).size!==baseline.units.length)
    throw Error('FRIENDLY_LOST_SUPPLY_BASELINE_INVALID');
  const units=baseline.units.filter(u=>u.sideKey===sideKey).map(u=>{
    const p=state.pieces.find(p=>p.id===u.pieceId),profile=source.unitProfiles.find(r=>r.recordKey===u.recordKey),
      composition=profile?.compositions.find(c=>c.kind===u.compositionKind);
    if(!p||p.sideKey!==sideKey||!Number.isSafeInteger(p.currentSupply)||p.currentSupply<0
      ||!Number.isSafeInteger(u.initialSupply)||u.initialSupply<0||p.currentSupply>u.initialSupply
      ||profile?.sourceRecordHash!==u.sourceRecordHash||profile?.payloadHash!==u.payloadHash
      ||composition?.startingSupply!==u.initialSupply)
      throw Error('FRIENDLY_LOST_SUPPLY_CURRENT_UNIT_INVALID');
    return{pieceId:p.id,initialSupply:u.initialSupply,currentSupply:p.currentSupply,lostSupply:u.initialSupply-p.currentSupply,
      inReserves:p.isInReserves===true,destroyed:p.isDestroyed===true};
  });
  // Current admitted summoned units have printed Supply 0. A future positive
  // Supply generated unit needs its own source-bound baseline registration.
  if(state.pieces.some(p=>p.sideKey===sideKey&&!baseline.units.some(u=>u.pieceId===p.id)&&p.currentSupply!==0))
    throw Error('FRIENDLY_LOST_SUPPLY_NEW_UNIT_BASELINE_REQUIRED');
  const body={schema:'starcraft_tmg_official_friendly_lost_supply_projection_v1',version:'1.0.0',sideKey,
    ruleAtomId:OFFICIAL_FRIENDLY_LOST_SUPPLY_ATOM_ID,baselineHash:baseline.baselineHash,units,
    totalLostSupply:units.reduce((n,u)=>n+u.lostSupply,0),includesReservesAndDestroyed:true,
    contextualSupplyUsed:false,killCreditUsed:false,mutationAuthority:false,trainingTruth:false};
  return{...body,projectionHash:hash(body)};
}
