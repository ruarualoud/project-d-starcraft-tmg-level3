import path from 'node:path';
import {createSlice249LearningProductHostV1} from './slice249-learning-product-host-v1.mjs';
const prefix='/starcraft-tmg-level3/product/v1/learning';
const response=(body,status=200)=>({status,response:body});
// Definitions and source paths are registered by the Host, never supplied by a
// browser. A private per-room/per-seat store prevents cross-user study access.
export function createSlice249LearningRoomRouterV1({roomHost,directory,fixtureRoot,definitions=[],
  hostFactory=createSlice249LearningProductHostV1,experimentQuotaStopFile,spawnProcess}) {
  return {async handle(request) {
    if(request.pathname!==prefix&&!request.pathname.startsWith(prefix+'/'))return null;
    const roomId=request.query?.get('roomId');
    const room=roomId&&await roomHost.get(roomId);
    if(!room)return response({ok:false,reason:'LEARNING_ROOM_REQUIRED'},403);
    const auth=await room.fixture.roomRuntime.readRoom({roomId,
      seatToken:String(request.headers?.authorization||'').replace(/^Bearer /u,'')});
    const seat=auth.projection?.viewer?.seatKey;
    if(!auth.ok||!['player1','player2'].includes(seat)||!auth.projection.viewer.capabilities?.includes('apply'))
      return response({ok:false,reason:'LEARNING_SEAT_REQUIRED'},403);
    const registered=definitions.filter(d=>d.access?.roomId===roomId&&d.access?.ownerSeat===seat);
    if(request.method==='GET'&&request.pathname===prefix)return response({ok:true,
      definitions:registered.map(d=>({id:d.id,label:d.label||d.id,routes:d.routes,learningRounds:d.learningRounds})),
      provider:room.providerStatus(seat)});
    if(!registered.length)return response({ok:false,reason:'LEARNING_NO_REGISTERED_STUDY'},404);
    try {
      return await room.withLearningService(seat,credentialIngress=>hostFactory({
        directory:path.join(directory,roomId,seat),fixtureRoot,registeredDefinitions:registered,
        bindingsBySeat:Object.fromEntries(['player1','player2'].map(s=>[s,{roomId,matchBinding:room.fixture.createdRoom.matchBinding}])),
        credentialIngress,authorize:()=>true,experimentQuotaStopFile,spawnProcess,
      }),host=>host.http.handle(request));
    }catch(error){return response({ok:false,reason:error.code||error.message},409);}
  }};
}
