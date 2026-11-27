import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {projectOfficialContextualSupplyValueV1 as supply} from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const proof=await read('docs/development/wave4/evidence/stukov-infestation.public.json');assert.equal(proof.status,'passed_scoped');
const row=proof.results.find(r=>r.id==='warden-round');assert.ok(row.coldReplay);
const directory=path.join(root,row.directoryRef),authority=await read(row.directoryRef+'/authority.json'),scope=await read(row.directoryRef+'/scope.json');
const inputs=await loadWave4StukovUnitInputs(root);
const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory});
assert.equal(bound.runtime.descriptor.runtimeHash,row.runtimeHash);
const native=bound.open({readOnly:true});let result;
try{
 await native.restoreDependencies(row.roomId,authority);const bundle=await native.store.loadReplayBundle(row.roomId);
 const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
 const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);
 const checkpoint=await read(row.directoryRef+'/checkpoint.json');assert.deepEqual(replay.envelope,checkpoint);
 const before=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,2)});assert.equal(before.ok,true);
 const state=replay.envelope.state,initial=before.envelope.state;
 assert.equal(supply({state:initial,pieceId:'enemy',context:'mission_marker_control'}).effectiveSupply,2);
 assert.equal(supply({state:initial,pieceId:'marine',context:'mission_marker_control'}).effectiveSupply,2);
 const warden=supply({state,pieceId:'enemy',context:'mission_marker_control'});
 assert.equal(warden.baseSupply,2);assert.equal(warden.effectiveSupply,1);
 assert.ok(warden.applicableDefinitionIds.includes('unit:stukov/plague-warden-any-phase@1'));
 assert.equal(supply({state,pieceId:'enemy',context:'disengage_check'}).effectiveSupply,2);
 assert.equal(supply({state,pieceId:'stukov',context:'disengage_check'}).effectiveSupply,2);
 assert.equal(supply({state,pieceId:'stukov',context:'supply_pool_calculation'}).effectiveSupply,1);
 const marker=state.log.flatMap(r=>r.events||[]).find(e=>e.type==='mission_marker_control_determined').markerResults.find(m=>m.markerId==='mission-marker-1');
 assert.deepEqual(marker.supplyTotals,{player1:2,player2:1});assert.equal(marker.nextControlSideKey,'player1');
 assert.equal(marker.contestingUnitsBySide.player2[0].baseSupply,2);assert.equal(marker.contestingUnitsBySide.player2[0].currentSupply,1);
 assert.equal(state.officialMissionRuntimeState.scoringHistory.length,1);assert.equal(state.supplyLossLedger.entries.length,0);
 const absent=structuredClone(state),source=absent.pieces.find(p=>p.id==='stukov');
 source.isOnField=false;source.isInReserves=true;source.models.forEach(m=>m.isOnField=false);
 assert.equal(supply({state:absent,pieceId:'enemy',context:'mission_marker_control'}).effectiveSupply,2);
 const floor=structuredClone(state);floor.pieces.find(p=>p.id==='enemy').currentSupply=0;
 assert.equal(supply({state:floor,pieceId:'enemy',context:'objective_completion'}).effectiveSupply,0);
 result={schema:'starcraft_tmg_wave4_stukov_marker_proof_v1',status:'passed_scoped',roomId:row.roomId,runRef:row.directoryRef,
  stateHash:replay.envelope.stateHash,sourceNativeSignedActions:journal.length,newSignedActions:0,coldReplay:true,
  nativeBeforeInfectionSupply:{player1:2,player2:2},nativeMarkerControl:marker,
  commanderDisengageSupply:2,commanderPoolSupply:1,enemyDisengageSupply:2,baseSupplyUnchanged:true,supplyLossEntries:0,
  readonlyHypotheticalControls:{sourceInReservesRemovesAura:true,zeroSupplyFloor:true,signedMovementClaimed:false},
  engineeringEstimatedUnitGeometry:true,sourceHeldDefinitions:39,fullWave4Admission:false,modelCalls:0,trainingTruth:false};
}finally{native.close();}
await atomicWrite(path.join(root,row.directoryRef,'marker-proof.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(root,'docs/development/wave4/evidence/stukov-marker-proof.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,nativeMarkerSupply:result.nativeMarkerControl.supplyTotals,coldReplay:true}));
