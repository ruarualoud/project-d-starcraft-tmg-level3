import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir='docs/development/wave4/evidence/';
const read=async n=>JSON.parse(await fs.readFile(path.join(root,dir+n+'.public.json'),'utf8'));
const native=await read('detonation-disengage'),web=await read('detonation-disengage-web'),cold=await read('detonation-disengage-current-cold'),
  lastCold=await read('detonation-disengage-last-cold'),boundary=await read('disengage-boundaries'),form=await read('disengage-form'),
  settlement=await read('disengage-settlement'),build=await read('disengage-web-build');
for(const p of [native,web,cold,lastCold])assert.equal(p.status,'passed_scoped');
assert.equal(native.results.length,12);
assert.ok(native.results.every(r=>r.fullNativeRound&&r.originalRemovalOrderPreserved&&r.supplyExactlyOnce&&r.idempotencyVerified&&r.coldReplay
  &&r.frames.length===1&&r.frames[0].hostKind==='direct_removal'&&r.endpointProofs.every(p=>p.endpointSupersetEmpty)));
assert.equal(native.results.filter(r=>r.kind==='last').length,4);
for(const unit of ['infested_marine','infested_trooper'])assert.equal(native.results.filter(r=>r.unitKey===unit).length,6);
assert.equal(web.results.length,2);assert.ok(web.results.every(r=>r.originalRemovalVerified&&r.trace[0].actionType==='disengage'
  &&r.sourcePrefixReceipts===2&&r.twoSeatsVerified&&r.explicitHumanConfirmation&&r.previewReadOnly&&r.replayMatchesCurrent
  &&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.ok(web.readableCasualtyChecks.some(r=>r.viewportWidth===390&&r.scrollWidth<=r.clientWidth+1));
assert.equal(cold.results.length,10);assert.equal(lastCold.results.length,4);
assert.ok([...cold.results,...lastCold.results].every(r=>r.coldReplay&&r.descriptorUnchanged&&r.newActions===0));
assert.equal(boundary.status,'passed_component');assert.equal(boundary.cases.length,7);assert.equal(boundary.newActions,0);
assert.equal(form.status,'passed_component');assert.equal(form.results.length,2);
assert.ok(form.results.every(r=>r.compiledPreviewExactlyMatchesSignedAction&&r.staleHiddenCoordinatesRemoved&&r.placedCoordinatesRequired&&r.legacyOutcomeNotExposed&&r.newActions===0));
assert.equal(settlement.status,'passed_read_only');assert.equal(settlement.results.length,12);
assert.ok(settlement.results.every(r=>r.originalRemovalInSignedEventsExactlyOnce&&r.oneScoringStep&&r.newActions===0));
assert.equal(settlement.results.filter(r=>r.lastModelDestructionVerified).length,4);
assert.equal(build.status,'passed');assert.equal(build.phoneProducerScreenshot.width,390);assert.equal(build.productionPublished,false);
const counts={nativeCases:12,nativeSignedActions:native.results.reduce((n,r)=>n+r.signedActions,0),nativeFullRounds:12,
  lastModelDestructionCases:4,webRooms:2,webSignedActions:web.signedActions,webActualProducerCases:2,
  currentAndPriorColdCases:14,currentAndPriorColdOriginalActions:[...cold.results,...lastCold.results].reduce((n,r)=>n+r.originalSignedActions,0),
  readOnlySettlementCases:12,directSupplyLossCases:settlement.results.filter(r=>r.directSupplyLossEvents).length,
  directSupplyLost:settlement.results.reduce((n,r)=>n+r.directSupplyLost,0)};
const evidenceRefs=['detonation-disengage','detonation-disengage-web','detonation-disengage-current-cold','detonation-disengage-last-cold',
  'disengage-boundaries','disengage-form','disengage-settlement','disengage-web-build'].map(n=>dir+n+'.public.json');
const consumerRefs=[['packages/rule-atoms/official-disengage-endpoint-proof-v1.mjs','proveOfficialDisengageEndpointAbsenceV1'],
  ['packages/product-composition/official-disengage-removal-v1.mjs','instantiateOfficialDisengageRemovalV1'],
  ['packages/product-composition/official-disengage-removal-v1.mjs','applyOfficialDisengageRemovalV1'],
  ['packages/product-composition/official-disengage-removal-v1.mjs','resumeOfficialDisengageRemovalV1'],
  ['packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs','applyOfficialSelectedRosterSpatialActionV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/product-composition/official-before-casualty-runtime-v1.mjs','stageOfficialBeforeCasualtyContinuationV1'],
  ['packages/product-composition/official-selected-roster-spatial-parameter-contract-v1.mjs','describeOfficialSelectedRosterSpatialParameterFieldsV1'],
  ['packages/client-domain/native-action-form-v1.mjs','compileNativeActionFormValuesV1'],
  ['apps/starcraft-tmg-expo/components/battlefield/native-action-form.tsx','NativeActionForm']].map(([file,exportName])=>({file,exportName}));
const definitions=['infested_marine','infested_trooper'].map(unit=>({definitionId:'unit:'+unit+'/detonation-any-phase@1',
  classification:'new_semantics_partial',nativeCases:native.results.filter(r=>r.unitKey===unit).map(r=>r.id),
  actualConsumers:['proved leading failure','proved other-model placement absence','last-model destruction and Supply lifecycle'],
  webCase:unit==='infested_marine'?'infested_marine-other-use':'infested_trooper-leading-use',allConsumersVerified:false,fullAtomAdmission:false}));
const common={status:'passed_scoped',policyVersion:'1.8.0',rootRuntimeVersion:'3.241.0',...counts,evidenceRefs,
  newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,dir+'detonation-disengage-consumers.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_detonation_disengage_consumers_v1',...common,definitions,consumerRefs,
  reusedRule:'core 8.5.3/8.5.4 movement and existing failed-model removal atoms',
  newCombination:'certified direct removal with before-casualty Detonation',
  pendingConsumers:['Consume payment','new Firebat/Scarab combinations']},null,2));
await atomicWrite(path.join(root,dir+'detonation-disengage-harness.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_detonation_disengage_harness_v1',...common,
  tools:['Native endpoint absence proof','sealed direct-removal continuation','actual unit destruction and Supply writer',
    'full mission/Combat/scoring/cleanup/R2','semantic Web initiation on desktop and phone','two-seat confirmation/recovery/replay',
    'independent reconstruction and prior Storm/Photon cold replay'],
  scope:'scoped Disengage consumers; Consume and complete Wave4 admission pending'},null,2));
console.log(JSON.stringify({status:'passed_scoped',...counts}));
