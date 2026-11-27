import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductRoomHostV1,PRODUCT_PREFIX} from './support/starcraft-product-room-host-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {joinWave3VerificationGuest} from './support/wave3-verification-guest-v1.mjs';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-zerg-current-room');
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v251';
const [recipes,previous,allSetups]=await Promise.all([read(base+'/recipes.json'),read(base+'/coverage.json'),read('content/wave3-human-match-setups-v1.json')]);
const setup=allSetups.find(s=>s.id==='wave3-standard-v1');
const release=await read(setup.releaseRef),dataset=await read(release.source.datasetRef);
function asSavedArmy(recipe){
  return {mineralsLimit:setup.minerals,factionCardId:dataset.recordsByKey[recipe.factionRecordKey].payload.id,
    tacticalCardIds:recipe.tacticalCardRecordKeys.map(k=>dataset.recordsByKey[k].payload.id),
    roster:recipe.units.map(u=>{
      const unit=dataset.recordsByKey[u.recordKey].payload;
      const activeUpgrades=u.upgradeNames.map(name=>unit.upgrades.findIndex(up=>up.name===name));
      assert(activeUpgrades.every(i=>i>=0),u.recordKey);
      return {unitId:unit.id,size:u.compositionKind,activeUpgrades,availableUpgrades:unit.upgrades};
    })};
}
const controls=await read('build/ticket-28-zerg-wave3-20261118-v1/consume-payment/multi/payment.json');
const loss=controls.losses[0];
assert.equal(loss.scoreable,false);assert.equal(loss.causeKind,'consume_resource_payment');
assert.deepEqual([loss.currentSupplyBefore,loss.currentSupplyAfter],[2,1]);assert(controls.duplicateApplyHandledByRoom);
const host=await createStarcraftProductRoomHostV1({root,dataDirectory:dir,offlineWave3MatchVersion:'2.99.2',
  liveEnabled:false,mapConfiguration:{seedId:'standard-d6-1'}});
try{
  const saved=path.join(dir,'room.public.json');
  let id;try{({roomId:id}=await read(saved));}
  catch(e){if(e.code!=='ENOENT')throw e;
    const response=await host.handle({method:'POST',pathname:PRODUCT_PREFIX+'/rooms',body:{
      matchMode:'human_vs_human',setupId:setup.id,army:asSavedArmy(recipes.player1),opponentArmy:asSavedArmy(recipes.player2)}});
    assert.equal(response.status,201,JSON.stringify(response.response));id=response.response.match.roomId;
    await atomicWrite(saved,JSON.stringify({roomId:id}));
  }
  const item=await host.get(id), envelope=(await item.roomStore.loadRoom(id)).envelope;
  assert.equal(item.record.releaseSetup.sourceHash,setup.sourceHash);
  const differences=[],seats=[];
  const guest=await joinWave3VerificationGuest(item,path.join(dir,'guest.private.json'));
  for(const credential of [item.record.credentials.human,guest]){
    const seat={roomId:id,seatToken:credential.seatToken},api=item.fixture.roomRuntime;
    const [{projection:roomProjection},{legalSpace}]=await Promise.all([api.readRoom(seat),api.legalSpace(seat)]);
    const scene=createStarcraftTmgSceneQueryServiceV1({roomStore:item.roomStore,rulesRuntime:item.fixture.rulesRuntime,seatKey:roomProjection.viewer.seatKey});
    const kinds=new Set(previous.rows.map(row=>row.definitionId.startsWith('card:')?'tactical_cards:'+row.record:'army_units:'+row.record));
    const input={roomProjection,legalSpace};
    const receipts=await scene.queryBatch({...input,requests:[...kinds].map(recordKey=>({queryKind:'ability.timing',arguments:{recordKey}}))});
    const facts=new Map(receipts.flatMap(r=>{assert.equal(r.status,'exact',r.reason);return r.result.definitions.map(d=>[d.definitionId,d]);}));
    for(const row of previous.rows)if(facts.get(row.definitionId)?.sourceFeatureHash!==row.sourceFeatureHash)differences.push(row.definitionId);
    const hashes=receipts.map(row=>row.queryReceiptHash);
    assert(hashes.every(hash=>typeof hash==='string'&&/^[0-9a-f]{64}$/.test(hash)));
    seats.push({seatKey:roomProjection.viewer.seatKey,readRecords:kinds.size,definitions:previous.rows.length,
      stateHash:envelope.stateHash,receipts:hashes});
  }
  assert.equal(seats.length,2);assert.notEqual(seats[0].seatKey,seats[1].seatKey);assert.deepEqual(differences,[]);
  assert.equal(previous.rows.length,40);
  const result={roomId:id,revision:envelope.stateRevision,version:item.record.releaseSetup.version,source:setup.sourceHash,seats,
    sourceDifferences:differences,chargeBoundary:{paid:controls.receipt.resourceCost,selfRemovalScores:loss.scoreable,
      populationBefore:loss.currentSupplyBefore,populationAfter:loss.currentSupplyAfter,duplicatePaymentBlocked:controls.duplicateApplyHandledByRoom},
    providerCalls:0};
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({room:id,definitions:previous.rows.length,seats:seats.length}));
}finally{await host.close();}
