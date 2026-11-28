import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir='docs/development/wave4/evidence/',
 names=['detonation-declaration','detonation-target','detonation-declaration-web','detonation-target-web','detonation-declared-current-cold',
 'target-declaration-legacy-cold','engineering-release-v2','deployment-rebinding','stukov-import-scope'],proofs={};
for(const name of names){proofs[name]=JSON.parse(await fs.readFile(path.join(root,dir+name+'.public.json'),'utf8'));
 assert.equal(proofs[name].status,name==='target-declaration-legacy-cold'?'passed_read_only':'passed_scoped',name);}
const declaration=proofs['detonation-declaration'],target=proofs['detonation-target'],native=[...declaration.results,...target.results],
 web=[...proofs['detonation-declaration-web'].results,...proofs['detonation-target-web'].results],
 cold=proofs['detonation-declared-current-cold'].results,legacy=proofs['target-declaration-legacy-cold'].results;
assert.equal(native.length,5);assert.equal(native.reduce((n,r)=>n+r.signedActions,0),82);
assert.ok(native.every(r=>r.coverageSatisfied&&r.coldReplay&&r.idempotencyVerified));
assert.ok(target.results.every(r=>r.fullRound&&r.completedRounds===1));
assert.ok(web.every(r=>r.twoSeatsVerified&&r.explicitHumanConfirmation&&r.previewReadOnly&&r.replayMatchesCurrent&&r.seatRecoveryReentryVerified&&!r.pageErrors.length));
assert.equal(web.length,3);assert.equal(cold.length,7);assert.ok(cold.every(r=>r.newActions===0&&r.coldReplay&&r.descriptorUnchanged));
assert.equal(legacy.length,2);assert.ok(legacy.every(r=>r.newActions===0&&r.coldReplay&&r.descriptorUnchanged&&r.sourceOpenedReadOnly));
const counts={nativeCases:native.length,nativeSignedActions:native.reduce((n,r)=>n+r.signedActions,0),nativeFullRounds:target.results.length,
 webRooms:web.length,webSignedActions:web.reduce((n,r)=>n+r.signedActions,0),
 currentAndPriorColdCases:cold.length,currentAndPriorColdOriginalActions:cold.reduce((n,r)=>n+r.originalSignedActions,0),
 legacyColdCases:legacy.length,legacyOriginalActions:legacy.reduce((n,r)=>n+r.originalSignedActions,0),
 engineeringConversionCases:proofs['engineering-release-v2'].results.length,engineeringConversionSignedActions:proofs['engineering-release-v2'].results.reduce((n,r)=>n+r.signedActions,0)};
assert.equal(counts.currentAndPriorColdOriginalActions,99);assert.equal(counts.legacyOriginalActions,11);
const evidenceRefs=names.map(name=>dir+name+'.public.json'),consumerRefs=[
 ['packages/product-composition/official-before-casualty-runtime-v1.mjs','stageOfficialBeforeCasualtyContinuationV1'],
 ['packages/product-composition/official-attack-target-reaction-runtime-v1.mjs','createOfficialAttackTargetReactionRuntimeV1'],
 ['packages/product-composition/official-ranged-declaration-reaction-runtime-v1.mjs','createOfficialRangedDeclarationReactionRuntimeV1'],
 ['packages/rule-atoms/official-ranged-declaration-keywords-v1.mjs','readOfficialRangedDeclarationV1'],
 ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs','createOfficialCharacteristicStatusComponentRuntimeV2']
 ].map(([file,exportName])=>({file,exportName}));
const definitions=[{definitionId:'unit:infested_marine/detonation-any-phase@1',classification:'new_semantics_partial',
 nativeCases:native.map(r=>r.id),webCases:web.map(r=>r.kind),allConsumersVerified:false,fullAtomAdmission:false},
 {definitionId:'unit:infested_trooper/detonation-any-phase@1',classification:'new_semantics_partial',newCasesThisMilestone:[],allConsumersVerified:false,fullAtomAdmission:false},
 ...[
  ['unit:nova_stealth_mode/head-shot-assault-phase@1',['CP1 once','Damage3 and CONCENTRATED FIRE(1)','sealed corpse-source numeric completion']],
  ['unit:siege_tank/shaped-blast-assault-phase@1',['PINPOINT and LOCKED IN declaration','sealed corpse-source template batches']],
  ['unit:siege_tank/smart-shells-assault-phase@1',['INDIRECT and LONG RANGE declaration','sealed corpse-source template batches']],
  ['unit:defiler/dark-swarm-assault-phase@1',['actual numeric target reaction','shared activation reaction limit','original target parent consumed once']],
  ['unit:defiler/gestate-dark-swarm-movement-phase@1',['actual Movement token placement','current-release setup and token registry','actual round cleanup']]
 ].map(([definitionId,actualConsumers])=>({definitionId,classification:'existing_atoms_new_combination',actualConsumers}))];
await atomicWrite(path.join(root,dir+'detonation-declared-target-consumers.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_declared_target_consumers_v1',status:'passed_scoped',
 policyVersion:'1.5.0',rootRuntimeVersion:'3.236.0',definitions,consumerRefs,...counts,evidenceRefs,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
await atomicWrite(path.join(root,dir+'detonation-declared-target-harness.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_declared_target_harness_v1',status:'passed_scoped',
 tools:['actual ranged declaration and target reaction','source-bound sealed parent suspension','actual Detonation HITS','original corpse-source completion',
 'Native mission start/scoring/cleanup/R2','explicit two-seat Web Preview/Apply/recovery','current and legacy cold replay','strict deployment evidence rebinding','actual imported unit BM payment'],
 ...counts,evidenceRefs,scope:'scoped continuation consumers; not complete Wave4 lobby/Builder/match acceptance',modelCalls:0,trainingTruth:false},null,2));
console.log(JSON.stringify({status:'passed_scoped',...counts}));
