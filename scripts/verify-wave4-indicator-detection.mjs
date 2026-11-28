import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {projectOfficialCharacteristicStatusFamilyModifiersV1,consumeOfficialDetectionHiddenStatusesV1,OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1}
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {projectOfficialBattlefieldAssetFamilyModifiersV1} from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),proof=await read('docs/development/wave4/evidence/added-card-active.public.json'),
  scanner=proof.results.find(r=>r.kind==='scanner'),cases=[];
async function prefix(ref,roomId,count){const authority=await read(ref+'/authority.json'),scope=await read(ref+'/scope.json'),
  bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(root,ref)}),native=bound.open({readOnly:true});
  try{await native.restoreDependencies(roomId,authority);const b=await native.store.loadReplayBundle(roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,count)});
    assert.equal(replay.ok,true);assert.equal(replay.envelope.stateHash,journal[count-1].postStateHash);return replay.envelope.state;
  }finally{native.close();}}
const oldRef='build/wave4-web/added-cards/active-New9t1/scanner',old=await prefix(oldRef,'wave4-added-card-scanner',3),
  current=await prefix(scanner.directoryRef,scanner.roomId,3),
  query=(state,pieceId='enemy')=>projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle,state,{pieceId,
    context:{attackerPieceId:'actor',targetPieceId:pieceId,attackKind:'ranged'}}),
  hidden=(state,id)=>state.pieces.find(p=>p.id===id).statuses.some(s=>String(s.statusName||s).toLowerCase()==='hidden');
assert.equal(projectOfficialBattlefieldAssetFamilyModifiersV1(old.officialBattlefieldAssetFamilySourceBundle,old,{pieceId:'enemy'}).hiddenSuppressedByDetection,true);
assert.equal(hidden(old,'enemy'),true);assert.equal(query(old).hiddenSuppressedByDetection,false);assert.equal(query(old).eligibleEvadeAgainstAllAttacks,true);
cases.push('original signed Root3.245 prefix demonstrates missing indicator-to-characteristic consumer without rewriting it');
assert.equal(current.officialDetectionHiddenLossPolicy.version,'1.1.0');assert.equal(hidden(current,'enemy'),false);
assert.equal(query(current).hiddenSuppressedByDetection,true);assert.equal(query(current).eligibleEvadeAgainstAllAttacks,false);
assert.equal(current.officialDetectionHiddenLossHistory.length,1);
assert.equal(current.officialDetectionHiddenLossHistory[0].detectingIndicatorSources[0].definitionId,scanner.definitionId);
cases.push('Root3.246 actually removes HIDDEN, revokes its Evade and records the exact scanner marker source');
const before=hash(current);query(current);assert.equal(hash(current),before);cases.push('indicator characteristic query is read-only');
const again=consumeOfficialDetectionHiddenStatusesV1(current.officialCharacteristicStatusFamilySourceBundle,current);
assert.equal(again.events.length,0);assert.equal(again.state.officialDetectionHiddenLossHistory.length,1);cases.push('one status loss is not repeated after later transitions');
const friendly=structuredClone(current);friendly.pieces.find(p=>p.id==='actor').statuses.push({statusName:'hidden'});
assert.equal(query(friendly,'actor').hiddenSuppressedByDetection,false);assert.equal(query(friendly,'actor').eligibleEvadeAgainstAllAttacks,true);
cases.push('friendly indicator does not reveal its own unit');
const legacy=structuredClone(old);legacy.officialDetectionHiddenLossPolicy=structuredClone(OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1);
assert.equal(query(legacy).hiddenSuppressedByDetection,false);assert.equal(consumeOfficialDetectionHiddenStatusesV1(legacy.officialCharacteristicStatusFamilySourceBundle,legacy).events.length,0);
cases.push('old unit-only Detection policy does not silently acquire marker semantics');
const malformed=structuredClone(current);malformed.officialDetectionHiddenLossPolicy.version='changed';assert.throws(()=>query(malformed),/DETECTION_HIDDEN_LOSS_POLICY_INVALID/);
cases.push('unknown detection policy rejected');
const forged=structuredClone(current);forged.officialBattlefieldAssetBindings.find(b=>b.effectKind==='detection_indicator').sourceFeatureHash='f'.repeat(64);
assert.throws(()=>query(forged),/DETECTION_INDICATOR_SOURCE_BINDING_INVALID/);cases.push('marker with mismatched source feature cannot reveal a unit');
assert.ok(scanner.leftIndicatorProof.outsideIndicatorRange&&scanner.leftIndicatorProof.hiddenDidNotReturn&&!scanner.leftIndicatorProof.hiddenEvadeEligibility);
assert.equal(scanner.actualScannerRangedAttack,true);cases.push('actual enemy move beyond the aura does not restore HIDDEN; actual ranged attack completes');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/indicator-detection.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_indicator_detection_v1',status:'passed_component',cases,oldControlRef:oldRef,newConsumerRef:scanner.directoryRef,
  oldRootVersion:'3.245.0',newRootVersion:'3.246.0',policyVersion:'1.1.0',newSignedActions:0,newCompleteAtoms:0,implementedCumulativeAtoms:7,
  sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_component',cases:cases.length}));
