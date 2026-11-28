import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),prefix='docs/development/wave4/evidence/',
  read=async name=>JSON.parse(await fs.readFile(path.join(root,prefix+name+'.public.json'),'utf8')),
  source=await read('added-card-source'),native=await read('added-card-active'),nerazim=await read('added-card-nerazim'),
  boundaries=await read('added-card-boundaries'),indicator=await read('indicator-detection'),web=await read('added-card-web'),
  cold=await read('added-card-native-cold'),webCold=await read('added-card-web-cold'),neraCold=await read('added-card-nerazim-cold');
assert.equal(source.status,'passed_component');assert.equal(source.cases.length,6);assert.equal(source.definitions.length,5);
assert.equal(native.status,'passed_scoped');assert.equal(native.results.length,5);
assert.equal(nerazim.status,'passed_scoped');assert.equal(nerazim.results.length,1);assert.equal(nerazim.results[0].nerazimUsed,true);
const all=[...native.results,...nerazim.results];assert.equal(all.reduce((n,r)=>n+r.signedActions,0),130);
assert.ok(all.every(r=>r.fullNativeRound&&r.idempotencyVerified&&r.coldReplay&&r.usedActualCard&&r.abilityProof.sourceCardExhausted));
assert.equal(native.results.find(r=>r.kind==='heal').abilityProof.damageAfter,0);
for(const kind of ['reactor','swarm']){const row=native.results.find(r=>r.kind===kind);
  assert.equal(row.abilityProof.activationStageAfter,'before_action');assert.equal(row.actualStandardMove,true);
  assert.ok(row.abilityProof.physicalModelDeltaMilliInches.every(m=>m.dx===0&&m.dy===-2000));}
assert.equal(native.results.find(r=>r.kind==='swarm').abilityProof.physicalModelDeltaMilliInches.length,12);
const scanner=native.results.find(r=>r.kind==='scanner');assert.ok(scanner.abilityProof.actualHiddenRemoved&&scanner.actualScannerRangedAttack);
assert.ok(scanner.leftIndicatorProof.outsideIndicatorRange&&scanner.leftIndicatorProof.hiddenDidNotReturn&&!scanner.leftIndicatorProof.hiddenEvadeEligibility);
assert.equal(boundaries.status,'passed_component');assert.equal(boundaries.cases.length,9);
assert.equal(indicator.status,'passed_component');assert.equal(indicator.cases.length,9);
assert.equal(web.status,'passed_scoped');assert.equal(web.results.length,5);assert.equal(web.signedActions,9);
assert.ok(web.results.every(r=>r.previewReadOnly&&r.explicitHumanConfirmation&&r.replayMatchesCurrent&&r.twoSeatsVerified&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.equal(web.producerFormChecks.length,5);assert.ok(web.producerFormChecks.every(f=>f.nativeIntentOnly&&f.scrollWidth<=f.clientWidth+1));
assert.equal(web.producerFormChecks.find(f=>f.kind==='swarm').modelCount,12);assert.equal(web.producerFormChecks.find(f=>f.kind==='swarm').viewportWidth,390);
assert.equal(cold.results.length,8);assert.equal(webCold.results.length,5);assert.equal(neraCold.results.length,1);
for(const p of [cold,webCold,neraCold]){assert.equal(p.status,'passed_read_only');
  assert.ok(p.results.every(r=>r.sourceOpenedReadOnly&&r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));}
const coldRows=[...cold.results,...webCold.results,...neraCold.results];assert.equal(coldRows.reduce((n,r)=>n+r.originalSignedActions,0),203);
const consumerRefs=[
  ['packages/source-data/official-army-builder-catalogue-v2.mjs','createOfficialArmyBuilderCatalogueV2'],
  ['packages/product-composition/official-release-roster-state-v2.mjs','createOfficialReleaseRosterStateV2'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','createOfficialCharacteristicStatusFamilySourceBundleV2'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','createOfficialCharacteristicStatusFamilyAdapterV1'],
  ['packages/product-composition/official-relocation-family-adapter-v1.mjs','createOfficialRelocationFamilySourceBundleV2'],
  ['packages/product-composition/official-relocation-family-adapter-v1.mjs','createOfficialRelocationFamilyAdapterV1'],
  ['packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs','createOfficialBattlefieldAssetFamilySourceBundleV2'],
  ['packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs','createOfficialCreepCardComponentAdapterV2'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','projectOfficialCharacteristicStatusFamilyModifiersV1'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','consumeOfficialDetectionHiddenStatusesV1'],
  ['packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs','instantiateOfficialSelectedRosterRangedActionV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1'],
  ['packages/client-domain/native-action-form-v1.mjs','compileNativeActionFormValuesV1'],
  ['apps/starcraft-tmg-expo/components/battlefield/native-action-form.tsx','NativeActionForm']
].map(([file,exportName])=>({file,exportName}));
for(const c of consumerRefs){const text=await fs.readFile(path.join(root,c.file),'utf8');assert.ok(text.includes('export function '+c.exportName)||text.includes('export async function '+c.exportName));}
const evidenceRefs=['added-card-source','added-card-active','added-card-nerazim','added-card-boundaries','indicator-detection','added-card-web',
  'added-card-native-cold','added-card-web-cold','added-card-nerazim-cold'].map(n=>prefix+n+'.public.json'),
  result={schema:'starcraft_tmg_wave4_added_card_consumers_v1',status:'passed_scoped',rootRuntimeVersions:['3.245.0','3.246.0'],
    detectionHiddenLossPolicyVersion:'1.1.0',nativeCases:6,nativeSignedActions:130,nativeFullRounds:6,oldPolicyControlCases:1,oldPolicyControlActions:20,
    webRooms:5,webSignedActions:9,webScope:'actual card initiation and activation successor from signed Native prefixes; not whole Web rounds',
    sourceComponentCases:6,boundaryComponentCases:9,indicatorComponentCases:9,independentColdCases:14,independentColdOriginalActions:203,newColdActions:0,
    definitions:source.definitions.map(d=>({...d,sourceCompiled:true,executionBound:true,nativeSuccessorsVerified:true,webVerified:true,allNamedConsumersVerified:true})),
    unchangedReactionDefinitionIds:['card:nerazim/might-of-the-nerazim-any@1'],
    existingAtomsReused:['fixed HEAL and Mechanical qualification','extra Move and action-limit preservation','physical path/coherency validation',
      'Creep token placement and lifecycle','detection indicator geometry','HIDDEN removal, ranged eligibility, Evade and hidden-loss reaction','round/card cleanup and recovery'],
    consumerRefs,evidenceRefs,newCompleteAtoms:0,implementedCumulativeAtoms:7,mainBuilderRecordCount:102,mainBuilderDenominator:119,
    privateCandidateRecordCount:108,sourceHeldDefinitions:39,wholeRecordsEligibleByThisBatch:['tactical_cards:robotics_support_bay','tactical_cards:infested_barracks'],
    wholeRecordAdmissionChanged:false,pendingCardReactions:['Terran Charge','Brutal Instinct','Parasitic Bio-Toxins'],
    reusedLocalWebBundleRef:'build/wave4-web/tal-darim/web-bundle-v2',fullAppTypecheckPassed:false,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,prefix+'added-card-consumers.public.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,prefix+'added-card-harness.public.json'),JSON.stringify({...result,schema:'starcraft_tmg_wave4_added_card_harness_v1',
  tools:['exact source bindings','real Builder prerequisites','Native card/Move/HEAL/token/indicator successors','actual HIDDEN removal and Nerazim reaction',
    'five two-seat Web producer forms','independent current, legacy and original-control reconstruction'],scope:'named added-card consumers; complete release remains pending'},null,2)+'\n');
console.log(JSON.stringify({status:result.status,nativeCases:6,nativeSignedActions:130,webSignedActions:9,independentColdCases:14,independentColdOriginalActions:203,newCompleteAtoms:0}));
