// Reproduce actual Builder-accepted compositionProfileId lost by scene mapping.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {candidateRoomRecipe} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {buildOfficialRoomArmyAuditV1,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(root+'/workflow.json','utf8');
const state=JSON.parse(before),read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const failed=(await read(state.work.at(-1).resultRef)).value;
assert.match(failed.code,/STANDARD_ROOM_UNIT_COMPOSITION_UNKNOWN/);
const selected=failed.request.candidateInput,draft=await read(state.draftRef);
const config=JSON.parse(await fs.readFile('build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json','utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const bundle=createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:bundle});
const failures=[];
function check(name,fn){try{fn();}catch(e){failures.push({name,error:e.message.slice(0,700)});}}
function room(candidate){
  return buildOfficialRoomArmyAuditV1(bundle,candidate.sideKey,candidateRoomRecipe(candidate),{
    dataset:source.dataset,scaleId:candidate.scaleId,mineralBudget:candidate.mineralBudget,
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
}
check('exact-production-profile-id-candidate-native-audit-matches-room',()=>{
  const verdict=builder.evaluateRosterCandidate(selected);
  assert.equal(verdict.status,'legal');
  assert.deepEqual(room(selected),verdict.audit);
});
check('legacy-saved-name-only-recipe-is-byte-for-byte-unchanged',()=>{
  const c=draft.candidateInput;
  assert.deepEqual(candidateRoomRecipe(c),{factionRecordKey:c.factionRecordKey,
    tacticalCardRecordKeys:c.tacticalCardRecordKeys,
    units:c.units.map(u=>({unitInstanceId:u.unitInstanceId,recordKey:u.recordKey,
      compositionKind:u.compositionKind,upgradeNames:u.upgrades.map(x=>x.upgradeName)}))});
});
check('model-and-upgrade-identities-are-not-dropped-at-room-boundary',()=>{
  const c=structuredClone(draft.candidateInput),unit=c.units[0];
  const option=bundle.unitCompositionProfiles.find(x=>x.recordKey===unit.recordKey)
    .compositionOptions.find(x=>x.compositionKind===unit.compositionKind);
  unit.startingModelIds=Array.from({length:option.startingModels},(_,i)=>`explicit-model-${i}`);
  for(const [i,u] of unit.upgrades.entries()){
    const profile=bundle.purchasableUpgradeProfiles.find(x=>x.recordKey===unit.recordKey&&x.upgradeName===u.upgradeName);
    u.purchasableUpgradeProfileId=profile.purchasableUpgradeProfileId;
    delete u.upgradeName;u.upgradeInstanceId=`explicit-upgrade-${i}`;
    if(profile.specialistAssignmentRequired)u.nominatedModelId=unit.startingModelIds.at(-1);
  }
  const verdict=builder.evaluateRosterCandidate(c);
  assert.equal(verdict.status,'legal');
  assert.deepEqual(room(c),verdict.audit);
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),before);
console.log(JSON.stringify({passed:!failures.length,failures,realNativeBuilder:true,providerCalls:0,
  productionWrites:0,scope:'actual frozen Native Builder and room army construction; no game, source refresh or strategy approval'}));
if(failures.length)process.exitCode=1;
