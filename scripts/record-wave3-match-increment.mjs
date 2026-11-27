import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';

import { createOfficialReactionFamilySourceBundleV2, ARTANIS_STAND_DEFINITION_ID, ARTANIS_DASH_DEFINITION_ID }
  from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';

import { assertRosterPlanningSkillSourceV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as legacyPack }
  from '../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs';

const plan = await read('coordination/wave3/implementation-plan.json');
const inventory = await read(plan.deliveryGoal.matchWiring.legacyDefinitionCoverageRef);
const legacy = await read(inventory.binder.previousAuthority);
assert.equal(legacy.receiptHash, inventory.binder.previousAuthorityReceiptHash);
assert.equal(legacy.state.officialAbilityEffectIrCatalogue.catalogueHash, inventory.binder.previousCatalogueHash);
const manifest = await read('content/source-releases/wave3-20261125-human-match-v1.json');
const tabletopRef = (await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json')).manifestRef;
const tabletop = await read(tabletopRef);
assert.equal(tabletop.source.snapshotHash, manifest.source.snapshotHash);
assert.equal(tabletop.source.datasetHash, manifest.source.datasetHash);
assert.deepEqual(tabletop.components.abilityIdentities, manifest.components.abilityIdentities);
const manifestsByHash = new Map([manifest,tabletop].map(m=>[m.manifestHash,m]));
const dataset = await read(manifest.source.datasetRef);
assert.throws(()=>assertRosterPlanningSkillSourceV1({dataset,manifest,resources:{strategySkills:legacyPack}}), {
  code:'ROSTER_PLANNING_SKILL_SOURCE_MISMATCH',expected:manifest.source.datasetHash,actual:legacyPack.sourceBinding.dataset});
const identities = await read(manifest.components.abilityIdentities.ref);
assert.equal(identities.identityCatalogueHash, manifest.components.abilityIdentities.integrity.value);
assert.equal(dataset.datasetHash, manifest.source.datasetHash);
assert.equal(identities.sourceSnapshotHash, inventory.binder.currentFrozenSourceSnapshotHash);
const current = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: identities,
  sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({dataset, includeInlineCardPhases:true}) });
const artanis = createOfficialReactionFamilySourceBundleV2({catalogue:current,
  definitionIds:[ARTANIS_STAND_DEFINITION_ID,ARTANIS_DASH_DEFINITION_ID]});
const prior = new Map(inventory.inherited.map(row => [row.definitionId, row]));
const original = new Map(legacy.state.officialAbilityEffectIrCatalogue.definitions.map(row => [row.definitionId, row]));
const additions = new Map((await read(plan.definitionInventoryRef)).entries.map(row => [row.semanticId+'@'+row.semanticVersion,row]));
const base = 'build/ticket-28-wave3-human-lobby-v1/remaining-six/';
const evidence = new Map();
function index(id, hash, stage, ref, version, admitted, manifestHash) {
  const fact = identities.definitions.find(row => row.definitionId === id);
  assert.equal(fact?.sourceFeatureHash, hash, id+' from '+ref);
  const reports = evidence.get(id) ?? [];
  reports.push({stage, ref, ...(manifestHash && {manifestHash}), ...(version && {version}), ...(admitted !== undefined && {rosterAdmitted:admitted})});
  evidence.set(id,reports);
}
for(const folder of ['openings','web-openings']) {
 const files = await fs.readdir(path.join(root,base,folder)).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
 for(const name of files.filter(n=>n.endsWith('.public.json')).sort()){
  const ref=base+folder+'/'+name, record=await read(ref);
  assert(manifestsByHash.has(record.manifestHash),ref);
  for (const d of record.definitions ?? []) index(d.id,d.hash,d.registrationStatus,ref,record.version,record.admitted,record.manifestHash);
 }
}
// Historical rooms can pin a different map or match version. Inherit a
// binding only for the same definition, source bytes and identified release.
const raiderReceiptRef = base + 'raider-reserve-on-human-map/result.public.json';
const raiderReceipt = await read(raiderReceiptRef);
const raiderOpening = await read(base+'openings/raiders-'+raiderReceipt.version+'.public.json');
const signedOpening = await read(base+'raider-reserve-on-human-map/opening.json');
assert.equal(raiderOpening.admitted,true);
assert.equal(manifestsByHash.get(raiderOpening.manifestHash).source.snapshotHash,
  manifestsByHash.get(raiderReceipt.sourceManifest).source.snapshotHash);
assert.equal(raiderReceipt.sourceManifest,signedOpening.manifestHash);
assert.equal(raiderReceipt.version,signedOpening.version);
assert.deepEqual(signedOpening.pendingNativeDefinitionIds,[]);
assert.equal(raiderReceipt.coldExact,true);
assert.equal(raiderReceipt.revision,2);
assert.deepEqual(raiderReceipt.actions,['resolve_characteristic_status_ability','resolve_relocation_ability']);
assert.equal(raiderReceipt.spentCp,0);
assert.equal(raiderReceipt.printedCp,1);
assert.equal(raiderReceipt.activationEnded,true);
const strikeComponent='build/ticket-28-wave2-capabilities-20261113-v1/tank-coordinated-strike/';
const strikeDomain=await read(strikeComponent+'source-projection-domain.json');
const strikeConsume=await read(strikeComponent+'source-projection-consume.json');
const strikeSuccessor=await read(strikeComponent+'source-projection-successor.json');
const strikeCold=await read(strikeComponent+'source-projection-cold.json');
assert.equal(strikeConsume.revision,1);
assert.equal(strikeConsume.cost,0);
assert(strikeConsume.origins>0);
assert.equal(strikeSuccessor.origins,strikeConsume.origins);
assert.equal(strikeSuccessor.revision,2);
assert.equal(strikeCold.allEnvelopesExact,true);
assert.equal(strikeDomain.sourceFeatureHash, identities.definitions.find(d=>d.definitionId===strikeDomain.definitionId).sourceFeatureHash);
for (const [name, stage] of [['raiders-roll','signed_discount_r0_r1'],['rapid-reinforcements','signed_deployment_r1_r2']]) {
  const id='unit:raynor_s_raider__marine_/'+name+'-movement-phase@1';
  const source=raiderOpening.definitions.find(d=>d.id===id);
  assert.equal(source?.registrationStatus,'executable_exact',id);
  index(id,source.hash,stage,raiderReceiptRef,raiderReceipt.version,true,raiderReceipt.sourceManifest);
}
const roomRoot = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const standardRef=roomRoot+'/wave3-formal-native-binding-gap-v218.public.json';
const standard=await read(standardRef);
const selectedInherited=inventory.inherited.filter(d=>d.selectedByStandardV218);
assert.equal(standard.after.registered,standard.selectedDefinitions);
assert.equal(selectedInherited.length,standard.selectedDefinitions);
assert.equal(standard.baseline.detail.sourceCatalogueHash,inventory.binder.currentFrozenCatalogueHash);
assert(standard.signed.receipts.some(r=>r.stage==='committed'));
for(const d of selectedInherited) {
  const identity=identities.definitions.find(row=>row.definitionId===d.definitionId);
  assert(identity && d.oldIdentityVerified && d.currentFrozenDefinitionFound);
  index(d.definitionId,identity.sourceFeatureHash,'registered_in_signed_standard_roster',standardRef,
    standard.after.runtime,true,inventory.binder.selectedStandardReleaseManifestHash);
}
for (const entry of (await fs.readdir(path.join(root, roomRoot), {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  for (const filename of ['coverage.json','admission.json']) {
    const ref = roomRoot + '/' + entry.name + '/' + filename;
    let sample;
    try { sample = await read(ref); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!manifestsByHash.has(sample.manifestHash)) continue;
    for (const d of sample.rows ?? sample.definitions ?? []) {
      if (d.registrationStatus !== 'executable_exact' || !d.definitionId || !d.sourceFeatureHash) continue;
      index(d.definitionId,d.sourceFeatureHash,'executable_exact',ref,sample.version,undefined,sample.manifestHash);
    }
  }
}
const wormRef=base+'zerg-coverage.public.json', worm=await read(wormRef);
for (const room of ['raven-standard-v228','raven-seeker-standard-v229','nova-shared-standard-v230',
  'nova-holo-standard-v233/nova_assault_mode','nova-holo-standard-v233/assets','nova-stealth-standard-v235/stealth-factory']) {
  const ref=roomRoot+'/'+room+'/factory-state.json';
  const admission=await read(roomRoot+'/'+room+'/admission.json');
  assert.deepEqual(admission.pending,[]);
  const initial=await read(ref);
  for(const [key,bundle] of Object.entries(initial)) {
    if(!key.endsWith('SourceBundle'))continue;
    const bindings=bundle?.routes ?? bundle?.definitions;
    if(!Array.isArray(bindings) || !bindings.length)continue;
    assert.equal(bundle.sourceSnapshotHash,manifest.source.snapshotHash);
    assert.equal(bundle.normalizedDatasetHash,dataset.datasetHash);
    for(const route of bindings) {
      if(!route.definitionId || !route.sourceFeatureHash)continue;
      index(route.definitionId,route.sourceFeatureHash,'route_in_admitted_room',ref,admission.version??admission.releaseMatchVersion,true);
    }
  }
}
for (const d of worm.inherited) index(d.id,d.sourceFeatureHash,d.boundary,d.reference);
const pylonRef=roomRoot+'/wave3-pylon-native-entry-component.public.json';
const pylon=await read(pylonRef);
const pylonSigned=await read(roomRoot+'/wave3-pylon-native-entry-signed-receipt.public.json');
const pylonCold=await read(roomRoot+'/wave3-pylon-native-entry-signed-cold.public.json');
assert(pylon.generatedProfileBound && pylon.onePerRound && pylon.peFirstThenFullPrice && pylon.replayFromSerializedStateExact);
assert(pylonSigned.signed && pylonSigned.completeMovementActivation && pylonCold.exactStateHashAndJournal);
assert.equal(pylonSigned.revision,pylonCold.revision);
const pylonAuthority=await read(roomRoot+'/wave3-pylon-native-entry-signed-authority.json');
const pylonDefinitions=new Set();
for(const bundle of [pylonAuthority.state.officialBattlefieldAssetFamilySourceBundle,pylonAuthority.state.officialStructureSourceBundle]){
  assert.equal(bundle.sourceSnapshotHash,manifest.source.snapshotHash);
  assert.equal(bundle.normalizedDatasetHash,dataset.datasetHash);
  for(const route of bundle.routes??bundle.definitions){
    if(!pylon.frozenDefinitions.includes(route.definitionId)) continue;
    index(route.definitionId,route.sourceFeatureHash,'generated_unit_consumer',pylonRef);
    pylonDefinitions.add(route.definitionId);
  }
}
assert.deepEqual([...pylonDefinitions].sort(),[...pylon.frozenDefinitions].sort());
const newZerg=await read(worm.additionsRef);
assert(manifestsByHash.has(newZerg.manifestHash));
const zergOpenings=new Map();
for (const d of newZerg.rows) for (const ref of d.confirmedBy){
  if(!zergOpenings.has(ref)) zergOpenings.set(ref,await read(ref));
  const opening=zergOpenings.get(ref);
  assert.equal(opening.manifestHash,newZerg.manifestHash);
  assert.deepEqual(opening.pending,[]);
  assert.equal(opening.phase,'start_of_round');
  assert(opening.definitions.some(r=>r.id===d.id && r.hash===d.hash && r.adapter && r.owners.length));
  index(d.id,d.hash,'formal_roster_admission',ref,opening.version,true,opening.manifestHash);
}
const generatedRef=base+'terran-generated-296.public.json';
const generated=await read(generatedRef);
assert(manifestsByHash.has(generated.manifestHash) && generated.admitted);
assert.equal(generated.support.pool.effectiveSupply,0);
assert.equal(generated.support.marker.effectiveSupply,1);
for(const d of generated.definitions) index(d.id,d.hash,d.stage,generatedRef,generated.version,true,generated.manifestHash);
const earlier=await read('build/ticket-28-wave3-human-lobby-v1/incremental-pass/inheritance.public.json');
assert.equal(earlier.sourceSnapshotHash, identities.sourceSnapshotHash);
const raynorRef='build/ticket-28-wave3-human-lobby-v1/incremental-pass/raynor-menu-2.89.0.public.json';
const raynor=await read(raynorRef);
assert(manifestsByHash.has(raynor.manifest));
for(const choice of raynor.outcomes) {
  const definition=current.definitions.find(d=>d.recordKey==='army_units:jim_raynor' && d.definitionName===choice.expected);
  assert(definition && choice.passed && choice.domainId && !choice.pending.length && choice.weaponMenu.includes(choice.expected));
  index(definition.definitionId,definition.sourceFeatureHash,'equipped_weapon_in_formal_menu',raynorRef,raynor.version,true,raynor.manifest);
}
for (const name of ['khassar','medic']) {
  const ref='build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/'+name+'/definition-bindings.public.json';
  const record=await read(ref);
  assert.equal(record.source,manifest.manifestHash);
  for (const d of record.definitions) {
    assert(d.owners?.length && d.adapterId && d.capability, d.id);
    index(d.id,d.hash,'selected_owner_and_native_consumer',ref,record.version,true,record.source);
  }
}
const samples=new Map(earlier.rows.map(r=>[r.id,r]));
const componentItems = new Map(plan.items.map(item=>[item.id,item]));
const aggregated = plan.deliveryGoal.componentCloseout;
assert.equal(aggregated.total, additions.size);
const receiptSets = new Map();
function recordEvidenceRefs(node,itemId) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.evidenceRefs)) {
    const refs = receiptSets.get(itemId) ?? new Set();
    for (const ref of node.evidenceRefs) if (typeof ref === 'string' && ref.startsWith('build/') && ref.endsWith('.json')) refs.add(ref);
    receiptSets.set(itemId,refs);
  }
  for (const value of Object.values(node)) if (value && typeof value === 'object') recordEvidenceRefs(value,itemId);
}
for (const row of aggregated.items) recordEvidenceRefs(componentItems.get(row.itemId).runtimeProgress,row.itemId);
const directSourceRefs = new Map();
function linkEvidence(object, ref, itemId) {
  if (!object || typeof object !== 'object') return;
  const id=object.definitionId ?? object.sourceDefinitionId;
  const added=additions.get(id);
  const sourceHash=object.sourceFeatureHash;
  if (added?.plannedItemId === itemId && sourceHash && identities.definitions.some(d=>d.definitionId===id && d.sourceFeatureHash===sourceHash)) {
    const refs=directSourceRefs.get(id)??new Set();refs.add(ref);directSourceRefs.set(id,refs);
  }
  for (const v of Object.values(object)) if (v && typeof v==='object') linkEvidence(v,ref,itemId);
}
for (const [item,refs] of receiptSets) for (const ref of [...refs].sort()) {
  // Large state databases and checkpoints are not needed to index published results.
  if (!/(?:result|boundary|receipt|coverage|verification|binding)[^/]*\.json$/iu.test(ref)) continue;
  let size;
  try {size=(await fs.stat(path.join(root,ref))).size;} catch(e){if(e.code==='ENOENT')continue;throw e;}
  if (size>512*1024) continue;
  linkEvidence(await read(ref),ref,item);
}
const factFields = ['recordKey','sourceIndex','definitionName','sourceKind','activationKind','activationText','phase','sourceText','costByComposition','sourceFeatureHash'];
const facts = def => Object.fromEntries(factFields.map(k=>[k,def[k]]));
const rows=current.definitions.map(def=>{
  const inherited=prior.get(def.definitionId), added=additions.get(def.definitionId);
  assert(Boolean(inherited)!==Boolean(added), def.definitionId);
  const row={id:def.definitionId, race:dataset.recordsByKey[def.recordKey].payload.faction,wave3:facts(def), openingEvidence:evidence.get(def.definitionId)??[]};
  if(inherited){
    const old=original.get(inherited.legacyDefinitionId);
    assert.equal(old.sourceFeatureHash,inherited.legacySourceFeatureHash);
    row.wave1={...facts(old),id:old.definitionId,adapter:inherited.adapterId,consumer:inherited.previousConsumer};
    row.sourceChange=inherited.rawDifferences.length?'changed':'unchanged';
    row.changedFields=inherited.rawDifferences;
    row.earlierOpeningRefs=[...new Set((samples.get(def.definitionId)?.matches??[]).map(m=>m.ref))];
  }else{
    row.sourceChange='added';
    row.componentStatus=added.componentVerification?.status ?? 'individual_status_not_recorded_in_definition_inventory';
    row.componentWorkItem=added.plannedItemId;
    row.componentAcceptanceCard=componentItems.get(added.plannedItemId).acceptanceCardRef;
    row.exactSourceReceiptRefs=[...(directSourceRefs.get(def.definitionId)??[])];
    row.componentEvidence=added.evidenceRefs;
  }
  return row;
});
assert.equal(rows.length,prior.size+additions.size);
const result={coordinatedStrikeComponent:{definitionId:strikeDomain.definitionId,sourceFeatureHash:strikeDomain.sourceFeatureHash,
  domain:strikeComponent+'source-projection-domain.json',consume:strikeComponent+'source-projection-consume.json',
  successor:strikeComponent+'source-projection-successor.json',cold:strikeComponent+'source-projection-cold.json'},
  legacyStrategyPackMismatch:{packHash:legacyPack.hash,expectedDataset:dataset.datasetHash,
  actualDataset:legacyPack.sourceBinding.dataset,rejection:'ROSTER_PLANNING_SKILL_SOURCE_MISMATCH'},oldSnapshotHash:inventory.binder.previousSnapshotHash,wave3SnapshotHash:identities.sourceSnapshotHash,
  releaseManifestHash:manifest.manifestHash,reviewedArtanisReactionSources:artanis.routes.map(({definitionId,sourceFeatureHash,triggerKind,effectKind,resourceType,resourceCost})=>
    ({definitionId,sourceFeatureHash,triggerKind,effectKind,resourceType,resourceCost})),
  datasetHash:dataset.datasetHash,identityCatalogueHash:identities.identityCatalogueHash,
  comparedManifests:[...manifestsByHash.values()].map(m=>({id:m.releaseId,hash:m.manifestHash,deploymentCardGeometry:m.components.deploymentCardGeometry??null})),
  counts:Object.fromEntries(['unchanged','changed','added'].map(k=>[k,rows.filter(r=>r.sourceChange===k).length])),
  componentCloseout:aggregated.items.map(i=>({item:i.itemId,total:i.total,verified:i.verified,
    evidence:componentItems.get(i.itemId).acceptanceCardRef})),
  changedManifestComponents:Object.keys(manifest.components).filter(k=>JSON.stringify(manifest.components[k])!==JSON.stringify(tabletop.components[k])),
  evidenceScope:'Per-ability source delta. Opening evidence is per roster and version. Compare full rows and action receipts separately.',rows};
const terran=rows.filter(r=>r.race==='Terran');
const hasScopedEvidence=r=>r.openingEvidence.some(e=>e.rosterAdmitted === true ||
  e.stage==='executable_exact' && e.rosterAdmitted===undefined);
const supportRef=base+'web-openings/support-2.93.0.public.json';
const support=await read(supportRef);
assert.equal(support.manifestHash,manifest.manifestHash);
assert.equal(support.diagnostic?.code,'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING');
assert.deepEqual(support.pending,support.definitions.filter(d=>d.registrationStatus!=='executable_exact').map(d=>d.id));
result.terranMatchEvidence={total:terran.length,
  inherited:terran.filter(r=>r.sourceChange!=='added').length,
  added:terran.filter(r=>r.sourceChange==='added').length,
  indexed:terran.filter(hasScopedEvidence).length,
  refusedSupportRoster:{ref:supportRef,version:support.version,selected:support.definitions.length,
    pendingInThisVersion:support.pending},
  stillToReconcile:terran.filter(r=>!hasScopedEvidence(r)).map(r=>r.id)};
result.matchEvidenceByFaction=Object.fromEntries([...new Set(rows.map(r=>r.race))].sort().map(race=>{
  const roster=rows.filter(r=>r.race===race);
  const counts={roomAdmitted:0,generatedConsumer:0,exactBinding:0,missing:[]};
  for(const row of roster){
    const records=row.openingEvidence;
    if(records.some(e=>e.stage==='generated_unit_consumer')) counts.generatedConsumer++;
    else if(records.some(e=>e.rosterAdmitted===true || e.stage==='formal_roster_admission')) counts.roomAdmitted++;
    else if(records.some(e=>e.stage==='executable_exact' && e.rosterAdmitted===undefined)) counts.exactBinding++;
    else counts.missing.push(row.id);
  }
  return [race,{total:roster.length,...counts}];
}));
await save('coordination/wave3/match-increment-facts.json',result);
console.log(result.counts);
