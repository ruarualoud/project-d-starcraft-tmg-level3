import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),prefix='docs/development/wave4/evidence/',
  read=async n=>JSON.parse(await fs.readFile(path.join(root,prefix+n+'.public.json'),'utf8')),
  native=await read('added-status-reactions-native'),boundaries=await read('added-status-reaction-boundaries'),
  web=await read('added-status-reactions-web'),cold=await read('added-status-reactions-native-cold'),webCold=await read('added-status-reactions-web-cold');
assert.equal(native.status,'passed_scoped');assert.equal(native.results.length,5);
assert.ok(native.results.every(r=>r.fullNativeRound&&r.coldReplay&&r.idempotencyVerified&&r.abilityProof.sourceCardExhausted&&r.actualActorMove));
assert.equal(native.results.find(r=>r.kind==='brutal-gain').abilityProof.actorBurrowed,true);
assert.equal(native.results.find(r=>r.kind==='brutal-lose').abilityProof.actorBurrowed,false);
for(const kind of ['parasite','parasite-extra-move','parasite-restoration']){
  const r=native.results.find(r=>r.kind===kind);assert.ok(r.actualRangedAttack&&r.abilityProof.enemyInfestation);
  assert.equal(r.abilityProof.actualInfestedPrecision,2);
}
assert.equal(native.results.find(r=>r.kind==='parasite-extra-move').abilityProof.activationStage,'before_action');
assert.equal(native.results.find(r=>r.kind==='parasite-restoration').nestedRestoration,true);
assert.equal(boundaries.status,'passed_scoped');assert.equal(boundaries.checks.length,15);assert.ok(boundaries.checks.every(c=>c.passed));
assert.equal(web.status,'passed_scoped');assert.equal(web.results.length,4);
assert.ok(web.results.every(r=>r.previewReadOnly&&r.explicitHumanConfirmation&&r.replayMatchesCurrent&&r.twoSeatsVerified&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.equal(web.producerFormChecks.length,4);assert.ok(web.producerFormChecks.every(f=>f.nativeIntentOnly&&f.scrollWidth<=f.clientWidth+1));
assert.ok(web.producerFormChecks.some(f=>f.viewportWidth===390));
assert.equal(cold.results.length,8);assert.equal(webCold.results.length,4);
for(const p of [cold,webCold]){assert.equal(p.status,'passed_read_only');assert.ok(p.results.every(r=>r.sourceOpenedReadOnly&&r.descriptorUnchanged&&r.coldReplay&&r.newActions===0));}
const inventory=JSON.parse(await fs.readFile(path.join(root,'content/source-releases/wave4-20261127/abilities/ability-diff.json'),'utf8')),
  ids=['card:hive/brutal-instinct-any@1','card:infested_command_center/parasitic-bio-toxins-any@1'],
  definitions=ids.map(id=>inventory.definitions.find(d=>d.definitionId===id));
assert.ok(definitions.every(d=>d.classification==='existing_atoms_new_combination'&&!d.newAtomIds.length&&!d.sourceHolds.length));
const refs=[
  ['product-composition/official-reaction-family-adapter-v1.mjs','createOfficialReactionFamilySourceBundleV2'],
  ['product-composition/official-reaction-family-adapter-v1.mjs','createOfficialReactionFamilyAdapterV1'],
  ['product-composition/official-added-card-reaction-facts-v1.mjs','resolveOfficialAddedCardReactionTargetsV1'],
  ['product-composition/official-added-card-status-reaction-runtime-v1.mjs','createOfficialAddedCardStatusReactionRuntimeV1'],
  ['product-composition/official-characteristic-status-family-adapter-v1.mjs','applyOfficialBurrowStatusV1'],
  ['product-composition/official-characteristic-status-family-adapter-v1.mjs','projectOfficialCharacteristicStatusFamilyModifiersV1'],
  ['rule-atoms/official-source-granted-burrow-policy-v1.mjs','readOfficialSourceGrantedBurrowRouteV1'],
  ['product-composition/official-infestation-transfer-facts-v1.mjs','applyOfficialInfestationDebuffV1'],
  ['product-composition/official-release-roster-state-v2.mjs','createOfficialReleaseRosterStateV2'],
  ['product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['product-composition/official-current-product-match-runtime-v1.mjs','createOfficialEngineeringScopedRoundRuntimeV1'],
  ['product-composition/official-human-confirmed-runtime-v1.mjs','createOfficialHumanConfirmedRuntimeV2'],
  ['client-domain/native-action-form-v1.mjs','describeNativeActionFormV1'],
].map(([file,exportName])=>({file:'packages/'+file,exportName}));
for(const ref of refs){const module=await import(path.join(root,ref.file));assert.equal(typeof module[ref.exportName],'function');}
const nativeActions=native.results.reduce((n,r)=>n+r.signedActions,0),coldRows=[...cold.results,...webCold.results],
  evidenceRefs=['added-status-reactions-native','added-status-reaction-boundaries','added-status-reactions-web',
    'added-status-reactions-native-cold','added-status-reactions-web-cold'].map(n=>prefix+n+'.public.json'),
  result={schema:'starcraft_tmg_wave4_added_status_reaction_consumers_v1',status:'passed_scoped',
    rootRuntimeVersions:['3.247.0','3.248.0'],sourceGrantedBurrowPolicyVersion:'1.0.0',
    nativeCases:5,nativeFullRounds:5,nativeSignedActions:nativeActions,webRooms:4,webSignedActions:web.signedActions,
    webScope:'actual reaction selection, nested Restoration and original activation successor from signed Native prefixes; not full Web rounds',
    independentColdCases:coldRows.length,independentColdOriginalActions:coldRows.reduce((n,r)=>n+r.originalSignedActions,0),newColdActions:0,
    oldPolicyControlActions:7,boundaryCases:15,
    definitions:definitions.map(d=>({definitionId:d.definitionId,sourceFeatureHash:d.sourceRef.sourceFeatureHash,
      classification:d.classification,newAtomIds:d.newAtomIds,nativeSuccessorsVerified:true,webVerified:true,
      consumerBindingStatus:'named_consumers_verified_whole_release_pending'})),consumerRefs:refs,evidenceRefs,
    existingAtomsReused:['committed action and activation boundaries','FAQ reaction priority, payment and limits','model footprint range',
      'BURROWED, HIDDEN and movement removal','INFESTATION status and DEBUFF Restoration','Infested target precision and actual ranged/casualty sequence','round/scoring/cleanup and signed recovery'],
    newCompleteAtoms:0,implementedCumulativeAtoms:7,mainBuilderRecordCount:102,mainBuilderDenominator:119,privateCandidateRecordCount:108,
    sourceHeldDefinitions:39,wholeRecordsEligibleByThisBatch:['tactical_cards:hive','tactical_cards:infested_command_center'],
    wholeRecordAdmissionChanged:false,pendingAddedCardReaction:'Terran Charge',
    reusedLocalWebBundleRef:'build/wave4-web/tal-darim/web-bundle-v2',fullAppTypecheckPassed:false,
    fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,prefix+'added-status-reaction-consumers.public.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,prefix+'added-status-reaction-harness.public.json'),JSON.stringify({...result,
  schema:'starcraft_tmg_wave4_added_status_reaction_harness_v1',scope:'two added-card status reactions; complete release remains pending'},null,2)+'\n');
console.log(JSON.stringify({status:result.status,nativeCases:5,nativeSignedActions:nativeActions,webRooms:4,webSignedActions:web.signedActions,
  independentColdCases:result.independentColdCases,independentColdOriginalActions:result.independentColdOriginalActions,newCompleteAtoms:0}));
