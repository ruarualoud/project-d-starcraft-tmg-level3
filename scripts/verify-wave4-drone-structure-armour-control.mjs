import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createOfficialReactionWindowOpportunityBatchV1} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv[2];
assert.ok(ref?.startsWith('build/wave4-web/stukov-units/detonation-delayed-')&&ref.endsWith('/drone-use-5'));
const inputs=await loadWave4StukovUnitInputsV3(root),read=async n=>JSON.parse(await fs.readFile(path.join(root,ref,n+'.json'),'utf8')),
 authority=await read('authority'),scope=await read('scope'),descriptor=await read('runtime'),roomId='wave4-detonation-delayed-drone-use-5',
 directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/drone-structure-control-')),bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory});
assert.deepEqual(bound.runtime.descriptor,descriptor);const native=bound.open({directory:path.join(root,ref),readOnly:true});
try{await native.restoreDependencies(roomId,authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
 index=journal.findIndex(r=>r.events.some(e=>e.type==='melee_target_pools_saved'&&e.nextTargetUnitId==='special:1:sabotage_drone'));assert.ok(index>=0);
 const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,index+1)});assert.equal(replay.ok,true);
 const s=replay.envelope.state,p=s.pendingOfficialHitsPoolChoice,target=s.pieces.find(u=>u.id===p.targets[p.targetIndex].targetUnitId);
 assert.equal(target.isStructure,true);assert.ok(target.combatTags.includes('mechanical'));assert.equal(p.current.armourDemand.armourDice,5);assert.equal(p.stage,'armour');
 assert.equal(s.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:armory').readiness,'ready');
 const input={triggerKind:'before_armour_roll',activeSideKey:p.sideKey,phase:s.phase,activationId:null,sourceActionHash:p.attackActionHash,resumeActionHash:p.attackActionHash,
  context:{attackerPieceId:p.pieceId,targetPieceId:target.id,enemyReactionAllowed:true}},snapshot=JSON.stringify(s),
  projected=createOfficialReactionWindowOpportunityBatchV1({state:s,bundle:s.officialReactionFamilySourceBundle}).projectWindow(input),
  domains=[...projected.activeLegal.parameterDomains,...projected.defenderLegal.parameterDomains];
 assert.ok(!domains.some(d=>d.definitionId==='card:armory/vehicle-plating-any@2'));assert.equal(JSON.stringify(s),snapshot);
 const result={schema:'starcraft_tmg_wave4_drone_structure_armour_control_v1',status:'passed_read_only_control',inputRef:ref,roomId,sourceRevision:index+1,
  subsequentTargetArmourPrepared:true,armourDice:5,armoryCardReady:true,mechanicalStructureRecipient:true,vehiclePlatingRejected:true,
  reason:'Structure recipient is excluded; later target beginArmour was not skipped',newActions:0,modelCalls:0,trainingTruth:false};
 await atomicWrite(path.join(root,'docs/development/wave4/evidence/drone-structure-armour-control.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{native.close();}
