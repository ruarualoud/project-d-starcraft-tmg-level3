// A single Native-audit projection for joint draft writes and release readiness.
// Addresses may differ; selected units/upgrades and their audit must not.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {verifyRosterCandidateV1} from './roster-plan-contracts-v1.mjs';

export function projectRosterWorkflowNativeCandidateUnitsV1({candidate,verdict}){
  const auditedUnits=verdict?.audit?.units;
  const nativeById=new Map((Array.isArray(auditedUnits)?auditedUnits:[]).map(unit=>[unit.unitInstanceId,unit]));
  const invalid=verdict?.status!=='legal'||verdict.candidateHash!==hash(candidate)
    ||!Array.isArray(auditedUnits)||auditedUnits.length!==candidate.units.length
    ||nativeById.size!==auditedUnits.length||candidate.units.some(unit=>{
      const native=nativeById.get(unit.unitInstanceId),composition=native?.unitCompositionResult;
      return native?.recordKey!==unit.recordKey||composition?.unitInstanceId!==unit.unitInstanceId
        ||composition?.recordKey!==unit.recordKey||typeof composition?.compositionKind!=='string'
        ||!composition.compositionKind||!Array.isArray(native?.selectedUpgrades)
        ||native.selectedUpgrades.some(u=>typeof u.upgradeName!=='string'||!u.upgradeName
          ||typeof u.purchasableUpgradeProfileId!=='string'||!u.purchasableUpgradeProfileId);
    });
  if(invalid)throw Object.assign(Error('ROSTER_WORKFLOW_NATIVE_CANDIDATE_PROJECTION_INVALID'),
    {code:'ROSTER_WORKFLOW_NATIVE_CANDIDATE_PROJECTION_INVALID'});
  return candidate.units.map(unit=>{
    const native=nativeById.get(unit.unitInstanceId);
    return {unitInstanceId:unit.unitInstanceId,recordKey:unit.recordKey,
      compositionKind:native.unitCompositionResult.compositionKind,
      upgradeSelections:native.selectedUpgrades.map(u=>({upgradeName:u.upgradeName,
        purchasableUpgradeProfileId:u.purchasableUpgradeProfileId,
        ...(u.nominatedModelId===null||u.nominatedModelId===undefined?{}:{nominatedModelId:u.nominatedModelId})}))};
  });
}

export function rosterWorkflowPlanCandidateMatchesNativeV1({actual,expected}){
  try{verifyRosterCandidateV1(actual);}catch{return false;}
  const view=structuredClone(actual),nativeById=new Map(expected.units.map(u=>[u.unitInstanceId,u]));
  // Old valid Plans omitted this optional address. Resolve it only through a
  // unique same-unit/name/nomination selection in the CURRENT Native audit.
  // Explicit conflicting IDs and every semantic field remain comparison inputs.
  for(const unit of view.units)for(const upgrade of unit.upgradeSelections){
    if(upgrade.purchasableUpgradeProfileId!==null)continue;
    const matches=(nativeById.get(unit.unitInstanceId)?.upgradeSelections??[]).filter(u=>
      u.upgradeName===upgrade.upgradeName&&u.nominatedModelId===upgrade.nominatedModelId);
    if(matches.length===1)upgrade.purchasableUpgradeProfileId=matches[0].purchasableUpgradeProfileId;
  }
  const expectedView=structuredClone(expected);
  delete view.candidateHash;delete expectedView.candidateHash;
  return isDeepStrictEqual(view,expectedView);
}
