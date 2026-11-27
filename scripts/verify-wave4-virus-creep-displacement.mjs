import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4VirusEffectsInputs} from './compile-wave4-virus-effects.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createWave4VirusCreepScene,CREEP_SPREAD} from './support/wave4-virus-creep-room-v1.mjs';
import {bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1} from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import {createStarcraftTmgSpatialActionQueryRuntimeV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4VirusEffectsInputs(root);
const scene=createWave4VirusCreepScene(inputs,{virusCard:'hungering_infestation',enemyMoveDistance:1});
Object.assign(scene.state,{phase:'movement',stage:'activation_phases',phaseFirstActorByRound:{'1:movement':{round:1,phase:'movement',markerHolderSideKey:'player1',chosenFirstActorSideKey:'player1'}}});
const parent=path.join(root,'build/wave4-web/virus-creep');await fs.mkdir(parent,{recursive:true});const directory=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(parent,'displacement-'));
assert.ok(directory.startsWith(parent+path.sep));
const bound=await bindWave4TurretRoom({inputs,...scene,directory});let native=bound.open(),expected,query,tokenId;
const roomId='wave4-virus-creep-displacement';
try{
 const credentials=await native.create(roomId,bound.authority);
 await native.commit({roomId,credential:credentials.player1,operationKey:'native-creep-spread',select:d=>d.definitionId===CREEP_SPREAD,
  parameters:()=>({activeUnitId:'actor',paymentCardInstanceIds:[],coordinate:scene.center})});
 await native.commit({roomId,credential:credentials.player1,operationKey:'pass-to-enemy',kind:'finite',select:r=>r.action.actionType==='pass'});
 const head=await native.store.loadRoom(roomId),input={roomId,seatToken:credentials.player2.seatToken};
 const menu=await native.room.legalSpace(input);assert.equal(menu.ok,true);
 const domain=menu.legalSpace.parameterDomains.find(d=>d.actionType==='move'&&d.pieceId==='enemy');assert.ok(domain);
 const token=head.envelope.state.board.tokens.find(t=>t.tokenKind==='creep_tumor');tokenId=token.tokenId;
 const oldEnd=scene.enemyMove.path.at(-1),delta={x:oldEnd.xMilliInches-scene.center.xMilliInches,y:oldEnd.yMilliInches-scene.center.yMilliInches};
 const parameters={...scene.enemyMove,path:[scene.enemyMove.path[0],scene.center],
  placements:scene.enemyMove.placements.map(p=>({...p,xMilliInches:p.xMilliInches-delta.x,yMilliInches:p.yMilliInches-delta.y}))};
 const {projection}=await native.room.readRoom(input);
 const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:native.store,
  rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context:bound.context,runtime:bound.runtime}),seatKey:'player2'});
 const tools=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q=>adapter.query(q)});
 query=await tools.query({roomProjection:projection,legalSpace:menu.legalSpace,request:{queryKind:'battlefield_token_displacement',
  arguments:{domainId:domain.domainId,parameters,tokenId}}});
 if(query.status!=='exact')bound.runtime.queryBattlefieldTokenDisplacement(head.envelope.state,domain,{parameters,tokenId});
 assert.equal(query.status,'exact',JSON.stringify(query));assert.equal(query.mayApply,false);
 assert.equal(query.result.solution.bestWitness.baseContact,true);assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
 await atomicWrite(path.join(directory,'query.public.json'),JSON.stringify(query,null,2));
 const receipt=await native.commit({roomId,credential:credentials.player2,operationKey:'move-over-native-creep',select:d=>d.domainId===domain.domainId,
  parameters:()=>({...parameters,tokenDisplacements:[{tokenId,coordinate:query.result.solution.bestWitness.coordinate}]})});
 assert.equal(receipt.idempotentReplayVerified,true);expected=await native.store.loadRoom(roomId);
 const events=expected.envelope.state.log.flatMap(r=>r.events||[]);assert.ok(events.some(e=>e.type==='battlefield_token_displaced'&&e.tokenId===tokenId));
 assert.ok(events.some(e=>e.type==='creep_tumor_removed'&&e.tokenId===tokenId));assert.ok(!expected.envelope.state.board.tokens.some(t=>t.tokenId===tokenId));
}finally{native.close();}
native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
 const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
 const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
}finally{native.close();}
const result={schema:'starcraft_tmg_wave4_virus_creep_displacement_v1',status:'passed_scoped',runRef:path.relative(root,directory),roomId,
 definitionId:scene.creepId,tokenId,signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
 queryReadOnly:true,queryReceiptHash:query.queryReceiptHash,exactBaseContact:true,displacementBeforeEnemyActionRemoval:true,coldReplay:true,
 newGameAtoms:0,sourceHeldDefinitions:39,fullWave4Admission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'result.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(root,'docs/development/wave4/evidence/virus-creep-displacement.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
