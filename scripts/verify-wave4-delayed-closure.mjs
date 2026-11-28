import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir='docs/development/wave4/evidence/',read=async n=>JSON.parse(await fs.readFile(path.join(root,dir+n+'.public.json'),'utf8')),
 native=await read('detonation-delayed'),web=await read('detonation-delayed-web'),cold=await read('detonation-delayed-current-cold'),legacy=await read('bile-legacy-cold'),engineering=await read('engineering-release-v3'),
 generated=await read('generated-prefix'),reservation=await read('drone-reservation-control'),structure=await read('drone-structure-armour-control'),boundaries=await read('engineering-v3-boundaries'),controlWeb=await read('detonation-delayed-control-web');
for(const p of [native,web,cold,engineering])assert.equal(p.status,'passed_scoped');assert.equal(legacy.status,'passed_read_only');
assert.equal(native.results.length,4);assert.ok(native.results.every(r=>r.coverageSatisfied&&r.frames.length>0&&r.actualMovementProducer&&r.fullNativeRound&&r.coldReplay&&r.idempotencyVerified));
assert.ok(native.results.filter(r=>r.use).every(r=>r.sourceKilledByDetonation));
assert.equal(web.results.length,2);assert.ok(web.results.every(r=>r.originalSourceDeathVerified&&r.twoSeatsVerified&&r.explicitHumanConfirmation&&r.previewReadOnly&&r.replayMatchesCurrent&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.equal(cold.results.length,6);assert.ok(cold.results.every(r=>r.coldReplay&&r.descriptorUnchanged&&r.newActions===0));
assert.equal(legacy.originalSignedActions,5);assert.equal(legacy.newActions,0);assert.equal(legacy.originalArchiveUnchanged,true);assert.equal(legacy.descriptorUnchanged,true);
assert.equal(engineering.dependencyRebinding.frozenFaq.actualBytesVerified,true);assert.equal(engineering.results.length,2);
assert.equal(generated.status,'passed_read_only');assert.equal(generated.coldReplay,true);assert.equal(generated.newActions,0);assert.equal(generated.originalWebSignedActions,5);
assert.equal(reservation.status,'passed_read_only_control');assert.equal(structure.status,'passed_read_only_control');
assert.equal(boundaries.status,'passed_scoped');assert.equal(controlWeb.status,'passed_scoped');assert.equal(controlWeb.signedActions,5);
const selected=native.results.find(r=>r.kind==='drone'&&r.use).identitySelection;
assert.ok(selected?.selectedBeforePersistentRoomCreation&&selected.productRandomnessUnchanged);assert.equal(selected.probeSetupAcceptedActions,11);
const counts={nativeCases:4,nativeSignedActions:native.results.reduce((n,r)=>n+r.signedActions,0),nativeFullRounds:4,
 controlCases:native.controls.length,controlSignedActions:native.controls.reduce((n,r)=>n+r.signedActions,0),
 webRooms:2,webSignedActions:web.signedActions,currentAndPriorColdCases:6,currentAndPriorColdOriginalActions:cold.results.reduce((n,r)=>n+r.originalSignedActions,0),
 legacyColdCases:1,legacyOriginalActions:5,engineeringConversionCases:2,engineeringConversionSignedActions:engineering.results.reduce((n,r)=>n+r.signedActions,0)};
const evidenceRefs=['detonation-delayed','detonation-delayed-web','detonation-delayed-current-cold','bile-legacy-cold','engineering-release-v3','engineering-v3-boundaries','generated-prefix','drone-reservation-control','drone-structure-armour-control','detonation-delayed-control-web'].map(n=>dir+n+'.public.json'),
 consumerRefs=[['packages/product-composition/official-before-casualty-runtime-v1.mjs','stageOfficialBeforeCasualtyContinuationV1'],
 ['packages/product-composition/official-corrosive-bile-resolution-runtime-v1.mjs','createOfficialCorrosiveBileResolutionRuntimeV1'],
 ['packages/product-composition/official-sabotage-drone-phase-end-v1.mjs','createOfficialSabotageDronePhaseEndRuntimeV1'],
 ['packages/product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1']].map(([file,exportName])=>({file,exportName}));
const definitions=[{definitionId:'unit:infested_marine/detonation-any-phase@1',classification:'new_semantics_partial',nativeCases:['bile-use','bile-decline'],webCase:'bile-use',allConsumersVerified:false,fullAtomAdmission:false},
 {definitionId:'unit:infested_trooper/detonation-any-phase@1',classification:'new_semantics_partial',nativeCases:['drone-use','drone-decline'],webCase:'drone-use',allConsumersVerified:false,fullAtomAdmission:false},
 {definitionId:'unit:ravager/corrosive-bile-movement-phase@1',classification:'existing_atoms_new_combination',actualConsumers:['actual Movement token placement and BM payment','delayed HITS owner through source death','actual token removal and R2']},
 {definitionId:'unit:sabotage_drone/have-a-nice-day-assault-phase@1',classification:'existing_atoms_new_combination',actualConsumers:['actual Griffin-created Ground Structure','sealed base and additional Structure HITS','phase-end completion and R2']},
 {definitionId:'card:nova_covert_ops/griffin-support-any@1',classification:'existing_atoms_reused',actualConsumers:['actual source-bound set special unit','round-end unit lifecycle']}];
await atomicWrite(path.join(root,dir+'detonation-delayed-consumers.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_delayed_consumers_v1',status:'passed_scoped',
 policyVersion:'1.6.0',rootRuntimeVersion:'3.237.0',definitions,consumerRefs,...counts,evidenceRefs,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
await atomicWrite(path.join(root,dir+'detonation-delayed-harness.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_delayed_harness_v1',status:'passed_scoped',
 tools:['source-bound Movement producer','real delayed phase-end HITS','sealed parent suspension','Detonation child and original source death','mission scoring/cleanup/R2','explicit two-seat Web confirmation/recovery','current and archived cold replay','frozen FAQ bytes and release conversion'],
 ...counts,evidenceRefs,scope:'scoped consumers; remaining Storm/Photon/direct removal and full Wave4 product admission pending',modelCalls:0,trainingTruth:false},null,2));
console.log(JSON.stringify({status:'passed_scoped',...counts}));
