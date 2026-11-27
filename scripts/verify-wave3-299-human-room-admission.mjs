import assert from 'node:assert/strict';
import path from 'node:path';
import {root,read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createStarcraftProductRoomHostV1, PRODUCT_PREFIX} from './support/starcraft-product-room-host-v1.mjs';
import {wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';

const base='build/ticket-28-wave3-human-lobby-v1/remaining-six', dir=base+'/offline-standard-299';
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const source=await read(setup.releaseRef), data=await read(source.source.datasetRef);
const proof=await read(base+'/web-openings/protoss-support-2.99.0.public.json');
assert(proof.admitted && !proof.pending.length && proof.manifestHash===source.manifestHash);
function savedArmy(recipe){
  return {mineralsLimit:setup.minerals,factionCardId:data.recordsByKey[recipe.factionRecordKey].payload.id,
    tacticalCardIds:recipe.tacticalCardRecordKeys.map(k=>data.recordsByKey[k].payload.id),
    roster:recipe.units.map(u=>{
      const unit=data.recordsByKey[u.recordKey].payload;
      const activeUpgrades=u.upgradeNames.map(name=>unit.upgrades.findIndex(v=>v.name===name));
      assert(activeUpgrades.every(i=>i>=0));
      return {unitId:unit.id,size:u.compositionKind,activeUpgrades,availableUpgrades:unit.upgrades};
    })};
}
const host=await createStarcraftProductRoomHostV1({root,dataDirectory:path.join(root,dir),liveEnabled:false,
  offlineWave3MatchVersion:proof.version,mapConfiguration:wave3HumanMapConfiguration(setup)});
try{
  const call=(method,operation,body)=>host.handle({method,pathname:PRODUCT_PREFIX+operation,headers:{},body});
  const catalog=await call('GET','/catalogue');
  assert.equal(catalog.response.setups.find(s=>s.id===setup.id).version,proof.version);
  let id;
  try{id=(await read(dir+'/opened.public.json')).roomId;}
  catch(error){
    if(error.code!=='ENOENT') throw error;
    const response=await call('POST','/rooms',{matchMode:'human_vs_human',setupId:setup.id,
      army:savedArmy(proof.recipes.player1),opponentArmy:savedArmy(proof.recipes.player2)});
    assert.equal(response.status,201,response.response.reason);
    id=response.response.match.roomId;
    await save(dir+'/opened.public.json',{roomId:id});
  }
  const item=await host.get(id), record=item.record;
  assert.equal(record.releaseSetup.version,proof.version);
  assert.equal(record.releaseSetup.sourceHash,proof.manifestHash);
  for(const side of ['player1','player2']){
    const input=proof.recipes[side], output=record.recipes[side];
    assert.equal(input.factionRecordKey,output.factionRecordKey);
    assert.deepEqual(input.tacticalCardRecordKeys,output.tacticalCardRecordKeys);
    assert.deepEqual(input.units.map(({unitInstanceId,...u})=>u),output.units.map(({unitInstanceId,...u})=>u));
  }
  const {legalSpace}=await item.fixture.roomRuntime.legalSpace({roomId:id,seatToken:record.credentials.human.seatToken});
  const menu=legalSpace.finiteActions.map(c=>c.action.actionType);
  assert.deepEqual(menu,proof.menu);
  const signed=(await item.roomStore.loadRoom(id)).envelope;
  assert.equal(signed.stateRevision,0);
  await save(dir+'/result.public.json',{roomId:id,revision:0,source:record.releaseSetup.sourceHash,version:record.releaseSetup.version,
    actualBoundRuntime:signed.matchBinding.rulesRuntimeBinding.runtimeHash,stateHash:signed.stateHash,
    definitions:proof.definitions.length,legalActions:menu,sourceReleaseIsFrozen:true,modelCalls:0});
} finally {await host.close();}
