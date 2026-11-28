import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {compileWave4AbilityDiff} from './compile-wave4-ability-diff.mjs';
import {loadWave4TalDarimThresholdInputs} from './compile-wave4-tal-darim-threshold.mjs';
import {createWave4TalDarimThresholdScene} from './support/wave4-tal-darim-threshold-room-v1.mjs';
import {createOfficialFriendlyLostSupplyBaselineV1,projectOfficialFriendlyLostSupplyV1} from '../packages/rule-atoms/official-friendly-lost-supply-threshold-v1.mjs';
import {reviewOfficialTalDarimThresholdIdentityV1} from '../packages/source-data/official-tal-darim-threshold-source-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1,projectOfficialCharacteristicStatusFamilyModifiersV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),old=await compileWave4AbilityDiff(root),inputs=await loadWave4TalDarimThresholdInputs(root),cases=[];
assert.deepEqual(inputs.identities.definitions.map(d=>[d.definitionId,d.sourceFeatureHash]),old.identities.definitions.map(d=>[d.definitionId,d.sourceFeatureHash]));
const changed=inputs.identities.definitions.filter((d,i)=>d.activationKind!==old.identities.definitions[i].activationKind);
assert.deepEqual(changed.map(d=>d.definitionId).sort(),['card:tal_darim/4-or-more-any@1','card:tal_darim/6-or-more-any@1']);
assert.ok(changed.every(d=>d.activationKind==='passive'));cases.push('only two inherited Passive classifications change; all definition IDs and source hashes remain');
const drift=structuredClone(inputs.dataset);drift.recordsByKey['tactical_cards:tal_darim'].payload.boosts[2].description+=' Changed.';
assert.throws(()=>reviewOfficialTalDarimThresholdIdentityV1({dataset:drift,registry:old.registry}),/TAL_DARIM_THRESHOLD_HEADING_SOURCE_MISMATCH/);
cases.push('changed threshold clause rejected before inherited classification');
const scene=createWave4TalDarimThresholdScene(inputs,{lostSupply:3}),s=scene.state,project=state=>projectOfficialFriendlyLostSupplyV1({state,sideKey:'player1'}),p=project(s);
assert.equal(p.totalLostSupply,3);assert.ok(p.units.some(u=>u.destroyed&&u.lostSupply===2));assert.ok(p.units.some(u=>u.inReserves&&u.lostSupply===1));
cases.push('reserves and destroyed army units both contribute actual Supply loss');
assert.throws(()=>createOfficialFriendlyLostSupplyBaselineV1({state:s}),/FRIENDLY_LOST_SUPPLY_PRISTINE_ROSTER_REQUIRED/);
cases.push('cold caller cannot rebuild a lower initial baseline after attrition');
const enemyLoss=structuredClone(s),enemy=enemyLoss.pieces.find(p=>p.id==='enemy');
applyOfficialSelectedRosterResolvedDamageV1(enemyLoss,enemy,resolveOfficialEffectiveCombatProfileV1(enemyLoss,enemy),{
  casualtyModelIds:enemy.models.map(m=>m.id),remainingModelIds:[],targetDestroyed:true,postDamageMarker:0,shieldedBefore:false,shieldedAfter:false});
assert.equal(project(enemyLoss).totalLostSupply,3);assert.equal(projectOfficialFriendlyLostSupplyV1({state:enemyLoss,sideKey:'player2'}).totalLostSupply,2);
cases.push('enemy loss cannot increase friendly threshold');
const scores=structuredClone(s);scores.scores.player2=999;scores.supplyLossLedger.entries=[];
assert.equal(project(scores).totalLostSupply,3);cases.push('VP and kill ledger are not the loss counter');
const forged=structuredClone(s),b=forged.officialFriendlyLostSupplyBaseline;b.units[0].initialSupply=999;
delete b.baselineHash;b.baselineHash=hash(b);assert.throws(()=>project(forged),/FRIENDLY_LOST_SUPPLY_CURRENT_UNIT_INVALID/);
cases.push('even a resealed baseline rejects an initial value contrary to the source composition');
const atSix=createWave4TalDarimThresholdScene(inputs,{lostSupply:6}).state;atSix.phase='assault';
const before=hash(atSix),query=state=>projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle,state,
  {pieceId:'actor',context:{attackerPieceId:'actor',targetPieceId:'enemy',weaponName:'Particle Disruptors',attackKind:'ranged'}});
const q=query(atSix);assert.equal(q.precision,1);assert.equal(q.criticalHit,1);assert.equal(hash(atSix),before);
const exhausted=structuredClone(atSix);exhausted.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:tal_darim').readiness='exhausted';
assert.equal(query(exhausted).precision,1);assert.equal(query(exhausted).criticalHit,1);cases.push('Passive threshold remains active when its source card is exhausted; query is read-only');
const wrongSide=structuredClone(atSix);wrongSide.cardResources.player1=wrongSide.cardResources.player1.filter(c=>c.officialCardRecordKey!=='tactical_cards:tal_darim');
assert.equal(query(wrongSide).precision,0);assert.equal(query(wrongSide).criticalHit,0);cases.push('no owning faction card means no threshold keyword');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/tal-darim-threshold-contract.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_tal_darim_threshold_contract_v1',status:'passed_component',cases,reviewedInheritedDefinitionIds:changed.map(d=>d.definitionId),
  originalIdentityCatalogueHash:old.identities.identityCatalogueHash,reviewedIdentityCatalogueHash:inputs.identities.identityCatalogueHash,
  definitionIdsAndSourceFeatureHashesUnchanged:true,newSignedActions:0,newCompleteAtoms:0,implementedCumulativeAtoms:6,
  sourceHeldDefinitions:39,fullFactionAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_component',cases:cases.length}));
