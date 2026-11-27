import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {joinWave3VerificationGuest} from './support/wave3-verification-guest-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-lobby-mission-selection');
const proof=JSON.parse(await fs.readFile(path.join(dir,'result.public.json'),'utf8'));
const results=[];
for(const prior of proof.results) {
  const file=path.join(dir,prior.setupId+'.guest.public.json');
  try{results.push(JSON.parse(await fs.readFile(file,'utf8')));continue;}catch(e){if(e.code!=='ENOENT')throw e;}
  const host=await createStarcraftProductRoomHostV1({root,dataDirectory:dir,liveEnabled:false,mapConfiguration:{seedId:'standard-d6-1'}});
  try{
    const item=await host.get(prior.roomId);
    const guest=await joinWave3VerificationGuest(item,path.join(dir,prior.roomId+'.guest.private.json'));
    const {projection}=await item.fixture.roomRuntime.readRoom({roomId:prior.roomId,seatToken:guest.seatToken});
    assert.equal(projection.viewer.seatKey,'player2');
    assert.equal(projection.state.officialMissionRuntimeState.missionRecordKey,prior.missionRecordKey);
    assert.equal(projection.state.board.deploymentId,prior.deploymentRecordKey);
    assert.equal(projection.room.stateHash,prior.stateHash);
    const row={roomId:prior.roomId,setupId:prior.setupId,seatKey:projection.viewer.seatKey,mission:prior.missionRecordKey,
      deployment:prior.deploymentRecordKey,stateHash:projection.room.stateHash};
    await atomicWrite(file,JSON.stringify(row,null,2)+'\n');results.push(row);
  }finally{await host.close();}
}
assert.equal(results.length,5);
await atomicWrite(path.join(dir,'guests.public.json'),JSON.stringify({results,providerCalls:0},null,2)+'\n');
console.log('Invited guests verified:',results.length);
