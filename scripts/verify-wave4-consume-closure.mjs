import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir='docs/development/wave4/evidence/',
  read=async name=>JSON.parse(await fs.readFile(path.join(root,dir+name+'.public.json'),'utf8'));
const plague=await read('detonation-consume'),dark=await read('consume-dark-swarm'),web=await read('consume-web'),
  cold=await read('consume-current-cold'),legacy=await read('consume-legacy-cold'),webCold=await read('consume-web-cold'),
  settlement=await read('consume-settlement'),form=await read('consume-form'),supply=await read('consume-supply-boundary'),
  build=await read('consume-web-build'),reentry=await read('consume-latest-bundle-reentry'),types=await read('consume-typecheck');
for(const p of [plague,dark,web,cold,reentry])assert.equal(p.status,'passed_scoped');
assert.equal(plague.results.length,6);assert.equal(dark.results.length,3);
assert.ok([...plague.results,...dark.results].every(r=>r.fullNativeRound&&r.coldReplay&&r.idempotencyVerified&&r.supplyExactlyOnce));
assert.equal(plague.results.filter(r=>r.casterDeathVerified).length,2);
assert.ok(plague.results.every(r=>r.paymentBeforeFutureDice&&r.reservedCardsVerified));
assert.ok(plague.results.filter(r=>r.cost===3).every(r=>r.frames.length===0));
assert.ok(dark.results.every(r=>r.actualGestate&&r.reactionQuotaReservedBeforeCasualty&&r.paymentExactlyOnce&&r.originalAttackSuccessorVerified));
assert.equal(web.results.length,2);assert.equal(web.signedActions,17);
assert.ok(web.results.every(r=>r.originalRemovalVerified&&r.fullWeaponSequenceAndActivationVerified&&r.previewReadOnly
  &&r.explicitHumanConfirmation&&r.replayMatchesCurrent&&r.twoSeatsVerified&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.equal(web.results.find(r=>r.kind.includes('plague')).trace[0].actionType,'cast_plague');
assert.equal(web.results.find(r=>r.kind.includes('self-source')).originalSourceDeathVerified,true);
assert.equal(web.producerFormChecks.length,2);
assert.ok(web.producerFormChecks.every(r=>r.viewportWidth===390&&r.scrollWidth<=r.clientWidth+1&&r.nativeCostAndCardConstants));
assert.equal(cold.results.length,11);assert.equal(legacy.results.length,4);assert.equal(webCold.results.length,4);
for(const p of [legacy,webCold])assert.equal(p.status,'passed_read_only');
assert.ok([...cold.results,...legacy.results,...webCold.results].every(r=>r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));
assert.equal(settlement.status,'passed_read_only');assert.equal(settlement.cases,9);
assert.equal(settlement.consumeSupplyLost,5);assert.equal(settlement.zeroSupplyDestructions,4);
assert.ok(settlement.results.every(r=>r.originalRemovalExactlyOnce&&r.selfRemovalNeverCreditsOpponent&&r.lastModelDestruction&&r.oneScoringStep&&r.newActions===0));
assert.equal(form.status,'passed_component');assert.equal(form.cases.length,6);assert.equal(form.newActions,0);
assert.equal(supply.status,'passed_component');assert.equal(supply.cases.length,5);assert.equal(supply.newActions,0);
assert.equal(build.status,'passed');assert.equal(build.humanWrapperVersion,'1.1.0');assert.equal(build.productionPublished,false);
assert.equal(reentry.latestBundleReadOnlyReentry,true);assert.equal(reentry.newSignedActions,0);
assert.equal(types.newDiagnostics.length,0);assert.equal(types.ownedNativeFormDiagnosticsResolved,true);
const counts={nativeCases:9,nativeSignedActions:[...plague.results,...dark.results].reduce((n,r)=>n+r.signedActions,0),nativeFullRounds:9,
  plagueCasterDeathCases:2,darkSwarmFullRounds:3,webRooms:2,webSignedActions:web.signedActions,webActualProducerCases:2,
  independentColdCases:19,independentColdOriginalActions:[...cold.results,...legacy.results,...webCold.results].reduce((n,r)=>n+r.originalSignedActions,0),
  consumeSupplyLost:5,zeroSupplyDestructions:4,naturalArmourControlCases:plague.controls.length,
  naturalArmourControlActions:plague.controls.reduce((n,r)=>n+r.signedActions,0)};
const evidenceRefs=['detonation-consume','consume-dark-swarm','consume-web','consume-current-cold','consume-legacy-cold',
  'consume-web-cold','consume-settlement','consume-form','consume-supply-boundary','consume-web-build','consume-latest-bundle-reentry','consume-typecheck']
  .map(n=>dir+n+'.public.json');
const consumerRefs=[
  ['packages/product-composition/official-consume-continuation-v1.mjs','stageOfficialConsumePaymentV1'],
  ['packages/product-composition/official-consume-continuation-v1.mjs','resumeOfficialConsumePaymentV1'],
  ['packages/product-composition/official-consume-payment-runtime-v1.mjs','applyOfficialSealedConsumePaymentV1'],
  ['packages/product-composition/official-plague-runtime-v1.mjs','createOfficialPlagueRuntimeV1'],
  ['packages/product-composition/official-reaction-family-adapter-v1.mjs','createOfficialReactionFamilyAdapterV1'],
  ['packages/product-composition/official-attack-target-reaction-context-v1.mjs','synchronizeOfficialTargetReactionSupplyProjectionV1'],
  ['packages/product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/product-composition/official-human-confirmed-runtime-v1.mjs','createOfficialHumanConfirmedRuntimeV2'],
  ['packages/client-domain/native-action-form-v1.mjs','compileNativeActionFormValuesV1'],
  ['packages/client-domain/native-action-form-v1.mjs','nativePlaguePaymentSummaryV1'],
  ['apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx','AuthoritativeBattleWorkspace']
].map(([file,exportName])=>({file,exportName}));
const common={status:'passed_scoped',policyVersion:'1.9.0',rootRuntimeVersion:'3.242.0',humanWrapperVersion:'1.1.0',...counts,evidenceRefs,
  newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,allConsumersVerified:false,
  fullAppTypecheckPassed:types.currentDiagnostics===0,remainingBaselineTypeErrors:types.currentDiagnostics,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,dir+'consume-consumers.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_consume_consumers_v1',...common,consumerRefs,
  definitions:['infested_marine','infested_trooper'].map(unit=>({definitionId:'unit:'+unit+'/detonation-any-phase@1',
    classification:'new_semantics_partial',atomId:'rule-atom:wave4/before-casualty-batch-detonation@1',
    nativeCases:plague.results.filter(r=>r.unitKey===unit).map(r=>r.id),
    darkSwarmQuotaCases:dark.results.filter(r=>r.unitKey===unit&&!r.self).map(r=>r.id),
    actualConsumers:['Consume original single-model removal','Plague payment before future dice','committed Dark Swarm quota prevents another Detonation'],
    allConsumersVerified:false,fullAtomAdmission:false})),
  unchangedSourceDefinitions:['unit:defiler/consume-any-phase@1','unit:defiler/plague-assault-phase@1','unit:defiler/dark-swarm-assault-phase@1'],
  reusedAtoms:['single-model removal and destruction lifecycle','source-bound BM card payment','template geometry and NON-LETHAL DAMAGE','reaction timing and Supply attribution'],
  newCombination:'existing Defiler payment and paid effects with Wave4 before-casualty Detonation',
  pendingConsumers:['new Firebat/Scarab combinations','whole release Builder/lobby and 500/2000 PvP']},null,2));
await atomicWrite(path.join(root,dir+'consume-harness.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_consume_harness_v1',...common,
  tools:['Native card reservation and sealed casualty continuation','paid Plague finite successor after actual source death',
    'actual Gestate and preserved Dark Swarm Evade','strict derived Supply projection synchronization','strict Human 1.1 parameter contract',
    '390px actual Web initiation and complete weapon sequence','independent current/legacy/Web reconstruction'],
  scope:'named engineering consumers; no full-release or production admission'},null,2));
console.log(JSON.stringify({status:'passed_scoped',...counts,remainingBaselineTypeErrors:types.currentDiagnostics}));
