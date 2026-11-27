import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {createOfficialRoomRosterDisclosureDataBundleV1} from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import {buildOfficialRoomArmyAuditV1,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const lobby='build/ticket-28-wave3-human-lobby-v1/';
const plan=(await read('coordination/wave3/implementation-plan.json')).deliveryGoal.matchWiring;
const inventory=await read(plan.legacyDefinitionCoverageRef);
const previous=await read(inventory.binder.previousAuthority);
assert.equal(previous.receiptHash,inventory.binder.previousAuthorityReceiptHash);
const catalogue=previous.state.officialAbilityEffectIrCatalogue;
assert.equal(catalogue.catalogueHash,inventory.binder.previousCatalogueHash);
const current=await read('build/ticket-28-wave3-release-context-20261112-v1/ability-identities-v2.json');
assert.equal(current.sourceSnapshotHash,inventory.binder.currentFrozenSourceSnapshotHash);
const proofFiles=new Set((await read(lobby+'khassar-supply-287/protoss-inherited-sample.public.json')).sources);
for(const file of ['zerg-definitions-288/ravager.public.json','zerg-definitions-288/cocoon.public.json','zerg-definitions-287/zagara.public.json'])proofFiles.add(lobby+file);
const evidence=new Map();
for(const ref of proofFiles){
  const report=await read(ref);
  if(report.pending?.length)continue;
  for(const row of report.definitions??report.rows){
    const id=row.id??row.definitionId;
    if(row.registrationStatus && row.registrationStatus!=='executable_exact')continue;
    const definition=current.definitions.find(d=>d.definitionId===id);
    assert(definition && definition.sourceFeatureHash===(row.hash??row.sourceFeatureHash),id);
    const matches=evidence.get(id)??[];
    matches.push({ref,adapter:row.adapterId??row.adapter??null,consumer:row.capability??null,owner:row.owners?.length>0});
    evidence.set(id,matches);
  }
}
const rows=inventory.inherited.map(item=>{
  const old=catalogue.definitions.find(d=>d.definitionId===item.legacyDefinitionId);
  assert.equal(old.sourceFeatureHash,item.legacySourceFeatureHash);
  assert(current.definitions.some(d=>d.definitionId===item.definitionId));
  const matches=evidence.get(item.definitionId)??[];
  const unchanged=item.rawDifferences.length===0;
  const equalConsumer=matches.some(m=>m.owner&&m.adapter===item.adapterId&&m.consumer===item.previousConsumer);
  return {id:item.definitionId,changes:item.rawDifferences,oldSelected:item.selectedByStandardV218,
    exactInSample:matches.length>0,equalConsumer,eligibleForBindingInheritance:unchanged&&equalConsumer,
    originalConsumer:item.previousConsumer,originalAdapter:item.adapterId,matches};
});
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const context=await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
const {dataset,snapshot}=context;
assert.equal(dataset.sourceSnapshotHash,current.sourceSnapshotHash);
const roster=createOfficialRoomRosterDisclosureDataBundleV1({dataset,snapshot,releaseContext:context});
const configuration={dataset,releaseContext:context,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
const unitFactions={Protoss:'daelaam',Terran:'terran_armed_forces',Zerg:'zerg_swarm'};
const prices=[];
for(const row of rows.filter(row=>row.changes.includes('costByComposition'))){
  const def=current.definitions.find(d=>d.definitionId===row.id);
  const unit=dataset.recordsByKey[def.recordKey].payload;
  const upgrade=unit.upgrades[def.sourceIndex];
  const faction=unitFactions[unit.faction];
  for(const size of ['small','large']){
    if(!unit[size].models)continue;
    const audit=names=>buildOfficialRoomArmyAuditV1(roster.unitCompositionUpgradeDataBundle,'player1',{
      factionRecordKey:'tactical_cards:'+faction,tacticalCardRecordKeys:{daelaam:['tactical_cards:templar_archives'],
        zerg_swarm:['tactical_cards:accelerating_creep','tactical_cards:hydralisk_den'],terran_armed_forces:['tactical_cards:academy']}[faction],
      units:[{unitInstanceId:unit.id,recordKey:def.recordKey,compositionKind:size,upgradeNames:names}],
    },configuration);
    const before=audit([]).armyResourceBudgetResult,after=audit([upgrade.name]).armyResourceBudgetResult;
    const delta=after.mineralSpent-before.mineralSpent,printed=size==='small'?upgrade.costS:upgrade.costL;
    assert.equal(delta,printed,row.id+' '+size);
    prices.push({id:row.id,unit:def.recordKey,size,upgrade:upgrade.name,printed,
      before:before.mineralSpent,after:after.mineralSpent,delta,beforeHash:before.resultHash,afterHash:after.resultHash});
  }
}
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/';
const weaponRef=base+'wave3-raynor-free-replacement.public.json',shadeRef=base+'adept-own-shade-standard-2.84/result.json';
const weapon=await read(weaponRef),shade=await read(shadeRef);
const renamed=rows.filter(row=>row.changes.includes('definitionName'));
assert.equal(renamed.length,1);
const id=current.definitions.find(d=>d.definitionId===renamed[0].id);
const name=dataset.recordsByKey[id.recordKey].payload.upgrades[id.sourceIndex].name;
assert(weapon.outcomes.some(o=>o.weaponName===name&&o.actualHitDice>0&&o.coldLoad));
assert(shade.coldExact && shade.actions.includes('set_psionic_transfer_shade'));
const counts={total:rows.length,unchanged:rows.filter(r=>!r.changes.length).length,changed:rows.filter(r=>r.changes.length).length,
  selectedInAtLeastOneStandard:rows.filter(r=>r.oldSelected||r.exactInSample).length,selectedAndSameConsumer:rows.filter(r=>r.eligibleForBindingInheritance).length,
  priceDefinitions:new Set(prices.map(r=>r.id)).size,priceCases:prices.length};
await save(lobby+'incremental-pass/inheritance.public.json',{sourceSnapshotHash:current.sourceSnapshotHash,previousAuthority:inventory.binder.previousAuthority,
  counts,prices,weapon:{ref:weaponRef,name,formalMatchAdmitted:weapon.formalMatchAdmitted},shade:{ref:shadeRef,actions:shade.actions,scope:'set and finish only'},
  rows,providerCalls:0});
console.log(counts);
