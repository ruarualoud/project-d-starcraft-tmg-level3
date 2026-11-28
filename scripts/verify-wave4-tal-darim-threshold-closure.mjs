import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),prefix='docs/development/wave4/evidence/',
  read=async name=>JSON.parse(await fs.readFile(path.join(root,prefix+name+'.public.json'),'utf8')),
  native=await read('tal-darim-threshold'),contract=await read('tal-darim-threshold-contract'),web=await read('tal-darim-threshold-web'),
  cold=await read('tal-darim-threshold-cold'),legacy=await read('firebat-current-cold'),staged=await read('tal-darim-staged-preview'),
  typecheck=await read('tal-darim-typecheck'),build=await read('tal-darim-web-build'),choice=await read('tal-darim-threshold-choice-web'),
  nativeCold=await read('tal-darim-threshold-native-cold');
assert.equal(native.status,'passed_scoped');assert.equal(native.results.length,7);
assert.equal(native.results.reduce((n,r)=>n+r.signedActions,0),155);
assert.ok(native.results.every(r=>r.fullNativeRound&&r.coldReplay&&r.idempotencyVerified));
for(const n of [3,4,5,6]){const r=native.results.find(r=>r.id==='ranged-'+n);
  assert.equal(r.attackProof.precision,n>=4?1:0);assert.equal(r.attackProof.criticalHit,n>=6?1:0);}
const melee=native.results.find(r=>r.id==='melee-6');assert.equal(melee.attackProof.precision,1);assert.equal(melee.attackProof.criticalHit,1);
for(const n of [3,5]){const r=native.results.find(r=>r.id==='dynamic-ranged-'+n);
  assert.equal(r.dynamicProof.actualLostSupply,n+1);assert.ok(r.dynamicProof.thresholdCrossed&&r.dynamicProof.firstWeaponRecordedBeforeThresholdGain);
  assert.equal(r.dynamicProof.otherWeapon.matchesFirstWeapon,false);assert.equal(r.roundResetProof.oldBindingInactive,true);}
assert.equal(contract.status,'passed_component');assert.equal(contract.cases.length,9);assert.equal(contract.definitionIdsAndSourceFeatureHashesUnchanged,true);
assert.equal(web.status,'passed_scoped');assert.equal(web.results.length,2);
assert.ok(web.results.every(r=>r.fullNativeRound&&r.twoSeatsVerified&&r.explicitHumanConfirmation&&r.previewReadOnly&&r.replayMatchesCurrent&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.ok(web.results.every(r=>r.sourcePrefixReceipts===5&&r.trace.some(t=>['ranged_attack','roll_ranged_attack_hit_pool'].includes(t.actionType))));
assert.equal(web.results.find(r=>r.id==='ranged-4').actualCriticalHit,0);assert.equal(web.results.find(r=>r.id==='ranged-6').actualCriticalHit,1);
assert.equal(choice.status,'passed_scoped');assert.equal(choice.results.length,1);
assert.ok(choice.results[0].precisionChoiceCommitted&&choice.results[0].twoSeatsVerified&&choice.results[0].seatRecoveryReentryVerified);
assert.equal(choice.results[0].actualProducerViaWeb,false);assert.equal(choice.results[0].fullNativeRound,false);
assert.equal(cold.status,'passed_read_only');assert.equal(cold.results.length,3);
assert.equal(nativeCold.status,'passed_read_only');assert.equal(nativeCold.results.length,7);
assert.ok([...cold.results,...nativeCold.results].every(r=>r.sourceOpenedReadOnly&&r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));
assert.equal(legacy.status,'passed_read_only');assert.equal(legacy.results.length,5);
assert.ok(legacy.results.every(r=>r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));
assert.equal(staged.status,'passed_component');assert.equal(staged.cases.length,9);
assert.equal(typecheck.newDiagnosticsByFileAndCode.length,0);assert.equal(typecheck.fullAppTypecheckPassed,false);
assert.equal(build.status,'passed_local_build');assert.equal(build.productionPublished,false);
const definitions=['chain-of-ascension','4-or-more','6-or-more'].map(s=>({definitionId:'card:tal_darim/'+s+'-any@1',
  classification:'new_semantics',newAtomIds:['rule-atom:wave4/friendly-lost-supply-threshold@1'],
  reusedAtoms:['source-bound unit Supply','weapon PRECISION / CRITICAL HIT','round first-weapon binding','Native attack/defence/casualty/activation/scoring/replay'],
  actualConsumers:s==='chain-of-ascension'?['initial roster baseline','reserves and destroyed units in friendly loss projection','actual 3→4 and 5→6 casualties']
    :['actual ranged chance plans',...(s==='6-or-more'?['actual melee bypass-armour plan']:['actual melee precision plan']),
      'same weapon after mid-round threshold gain','different weapon excluded until next round','actual two-seat Web attack'],allConsumersVerified:true}));
const refs=['tal-darim-threshold','tal-darim-threshold-contract','tal-darim-threshold-web','tal-darim-threshold-cold','firebat-current-cold',
  'tal-darim-staged-preview','tal-darim-typecheck','tal-darim-web-build','tal-darim-threshold-choice-web','tal-darim-threshold-native-cold'].map(n=>prefix+n+'.public.json'),
  actualConsumerRefs=[
    ['packages/rule-atoms/official-friendly-lost-supply-threshold-v1.mjs','createOfficialFriendlyLostSupplyBaselineV1'],
    ['packages/rule-atoms/official-friendly-lost-supply-threshold-v1.mjs','projectOfficialFriendlyLostSupplyV1'],
    ['packages/product-composition/official-release-roster-state-v2.mjs','createOfficialReleaseRosterStateV2'],
    ['packages/product-composition/official-tal-darim-threshold-v1.mjs','projectOfficialTalDarimThresholdWeaponsV1'],
    ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','projectOfficialCharacteristicStatusFamilyModifiersV1'],
    ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs','consumeOfficialCharacteristicStatusFirstWeaponEffectsV1'],
    ['packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs','instantiateOfficialSelectedRosterRangedActionV1'],
    ['packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs','instantiateOfficialSelectedRosterMeleeActionV1'],
    ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
    ['packages/product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1'],
    ['packages/client-domain/staged-ranged-preview-v1.mjs','matchesStarcraftTmgParameterizedPreviewActionV1'],
    ['packages/client-domain/native-action-form-v1.mjs','compileNativeActionFormValuesV1'],
    ['apps/starcraft-tmg-expo/components/battlefield/native-action-form.tsx','NativeActionForm']
  ].map(([file,exportName])=>({file,exportName}));
const result={schema:'starcraft_tmg_wave4_tal_darim_threshold_consumers_v1',status:'passed_scoped',rootRuntimeVersion:'3.244.0',
  nativeCases:7,nativeSignedActions:155,nativeFullRounds:7,contractCases:9,webRooms:3,webActualProducerRooms:2,webChoiceSuccessorRooms:1,
  webSignedActions:web.signedActions+choice.signedActions,
  independentColdCases:15,independentColdOriginalActions:[...cold.results,...nativeCold.results].reduce((n,r)=>n+r.originalSignedActions,0)+122,newColdActions:0,
  definitions,actualConsumerRefs,evidenceRefs:refs,newCompleteAtoms:1,implementedCumulativeAtoms:7,
  mainBuilderRecordCount:102,mainBuilderDenominator:119,sourceHeldDefinitions:39,
  fullAppTypecheckPassed:false,remainingBaselineFileDiagnostics:typecheck.currentDiagnostics,
  fullFactionAdmission:false,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,prefix+'tal-darim-threshold-consumers.public.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,prefix+'tal-darim-threshold-harness.public.json'),JSON.stringify({...result,
  schema:'starcraft_tmg_wave4_tal_darim_threshold_harness_v1',tools:['source identity review','baseline and query adapter',
    'real ranged/melee and casualty successors','complete round/scoring','two-seat UI/Preview/apply/recovery','independent Native/Human and previous-version cold replay'],
  scope:'named threshold consumers; Proxy Pylon, full faction and complete release remain pending'},null,2)+'\n');
console.log(JSON.stringify({status:result.status,nativeCases:7,nativeSignedActions:155,webSignedActions:result.webSignedActions,newCompleteAtoms:1,implementedCumulativeAtoms:7}));
