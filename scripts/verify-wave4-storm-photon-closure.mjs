import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir='docs/development/wave4/evidence/';
const read=async n=>JSON.parse(await fs.readFile(path.join(root,dir+n+'.public.json'),'utf8'));
const storm=await read('detonation-storm'),photon=await read('detonation-photon');
const stormWeb=await read('detonation-storm-web'),photonWeb=await read('detonation-photon-web');
const cold=await read('detonation-storm-photon-current-cold'),boundary=await read('photon-round-boundary');
const sources=await read('photon-source-boundaries'),armour=await read('card-armour-context');
for(const p of [storm,photon,stormWeb,photonWeb,cold])assert.equal(p.status,'passed_scoped');
for(const p of [storm,photon]){
  assert.equal(p.results.length,2);assert.equal(p.controls.length,0);
  assert.ok(p.results.every(r=>r.coverageSatisfied&&r.frames.length>0&&r.actualMovementProducer
    &&r.fullNativeRound&&r.coldReplay&&r.idempotencyVerified&&r.supplyExactlyOnce&&r.originalDiceAndCasualtyOrderPreserved));
  assert.ok(p.results.every(r=>r.frames.every(f=>f.activationContext.activationId===null)));
}
assert.equal(storm.results.find(r=>r.use).sourceKilledByDetonation,true);
assert.equal(photon.results.find(r=>r.use).counterTargetKilledByDetonation,true);
for(const p of [stormWeb,photonWeb]){
  assert.equal(p.results.length,1);
  assert.ok(p.results.every(r=>r.originalSourceDeathVerified&&r.twoSeatsVerified&&r.explicitHumanConfirmation
    &&r.previewReadOnly&&r.replayMatchesCurrent&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
}
assert.equal(cold.results.length,6);assert.ok(cold.results.every(r=>r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));
assert.equal(boundary.status,'passed_read_only');assert.equal(boundary.results.length,2);
assert.ok(boundary.results.every(r=>r.outsideActivationPreserved&&r.scoreBeforeRoundEndEffects&&r.noImplicitRescoreOrVictoryAward&&r.newActions===0));
assert.equal(sources.status,'passed_component');assert.equal(armour.status,'passed_component');assert.equal(armour.newActions,0);
const counts={nativeCases:4,nativeSignedActions:[...storm.results,...photon.results].reduce((n,r)=>n+r.signedActions,0),nativeFullRounds:4,
  webRooms:2,webSignedActions:stormWeb.signedActions+photonWeb.signedActions,currentAndPriorColdCases:6,
  currentAndPriorColdOriginalActions:cold.results.reduce((n,r)=>n+r.originalSignedActions,0),
  readOnlyRoundBoundaryCases:2,componentCasesDoNotCountAsNative:true};
const evidenceRefs=['detonation-storm','detonation-photon','detonation-storm-web','detonation-photon-web',
  'detonation-storm-photon-current-cold','photon-round-boundary','photon-source-boundaries','card-armour-context'].map(n=>dir+n+'.public.json');
const consumerRefs=[['packages/product-composition/official-before-casualty-runtime-v1.mjs','stageOfficialBeforeCasualtyContinuationV1'],
  ['packages/product-composition/official-psionic-storm-phase-end-v1.mjs','createOfficialPsionicStormPhaseEndV1'],
  ['packages/product-composition/official-photon-overcharge-entry-v1.mjs','createPhotonOverchargeEntryV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1'],
  ['packages/rule-atoms/official-armour-roll-ordinal-v1.mjs','inspectOfficialArmourRollOrdinalsV1']].map(([file,exportName])=>({file,exportName}));
const definitions=[{definitionId:'unit:infested_marine/detonation-any-phase@1',classification:'new_semantics_partial',
    nativeCases:['storm-use','storm-decline'],webCase:'storm-use',allConsumersVerified:false,fullAtomAdmission:false},
  {definitionId:'unit:infested_trooper/detonation-any-phase@1',classification:'new_semantics_partial',
    nativeCases:['photon-use','photon-decline'],webCase:'photon-use',allConsumersVerified:false,fullAtomAdmission:false},
  {definitionId:'unit:high_templar/psionic-storm-movement-phase@1',classification:'existing_atoms_new_combination',
    actualConsumers:['purchased Storm and PE payment','Movement nonlethal batch','Assault HITS restored after actual caster death','token cleanup and R2']},
  {definitionId:'card:overcharged_nexus/photon-overcharge-any@1',classification:'existing_atoms_new_combination',
    actualConsumers:['actual non Entry Edge reserve deployment','outside-activation card HITS and armour','original HITS completes after child Detonation','end-round queue and R2'],
    webOriginalSourceDeathFieldMeaning:'legacy Web field verifies the Detonation target dies; Photon source is a card'},
  {definitionId:'card:overlord/ventral-sacs-any@1',classification:'existing_atoms_reused',
    actualConsumers:['actual Movement marker','Builder-purchased reserve manifest','actual end-round deployment through native Router','Photon observer']}];
const common={status:'passed_scoped',policyVersion:'1.7.0',rootRuntimeVersions:['3.238.0','3.240.0'],
  armourPolicyVersions:['1.0.0','1.1.0'],...counts,evidenceRefs,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
  sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,dir+'detonation-storm-photon-consumers.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_detonation_storm_photon_consumers_v1',...common,definitions,consumerRefs},null,2));
await atomicWrite(path.join(root,dir+'detonation-storm-photon-harness.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_detonation_storm_photon_harness_v1',...common,
  tools:['actual Movement producers','native HITS parents','sealed before-casualty child chain','source-owned armour context',
    'mission scoring/end-round effects/cleanup/R2','explicit two-seat Web confirmation/recovery','current and prior signed cold replay'],
  scope:'scoped consumers; Disengage/Consume/new units and full Wave4 product admission pending'},null,2));
console.log(JSON.stringify({status:'passed_scoped',...counts}));
