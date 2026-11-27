import assert from 'node:assert/strict';
import { openWave3EngineeringStoreV1 } from './wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './wave3-standard-action-room-v1.mjs';
import { save } from './wave3-raven-tabletop-room-v1.mjs';

export const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
export const manifestRef = base + '/tabletop-raven-m01-v1/manifest.json';
export const output = 'build/ticket-28-wave3-final-faq-ten';
export async function savedRoom(directory,roomId){
  const store=openWave3EngineeringStoreV1({directory,filename:'room.sqlite',readOnly:true});
  try {
    const bundle=await store.loadReplayBundle(roomId), head=(await store.loadRoom(roomId)).envelope;
    const journal=bundle.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
    assert.equal(journal.length,head.stateRevision);
    if(journal.length)assert.equal(journal.at(-1).postStateHash,head.stateHash);
    return {head,journal,initial:bundle.initialEnvelope};
  } finally {store.close();}
}

export async function savedPosition({dir,id,revision,version,descriptor,manifest=manifestRef,runtimeOpening}) {
  const saved=await savedRoom(dir,id);
  assert(Number.isInteger(revision) && revision>=0 && revision<=saved.head.stateRevision);
  if(!revision)return saved.initial;
  if(revision===saved.head.stateRevision)return saved.head;
  const bound=await bindWave3StandardActionRoom({manifestRef:manifest,initial:runtimeOpening??saved.initial.state,dir,
    candidateVersion:version,frozenRuntimeRef:descriptor??dir+'/runtime.json'});
  const reader=bound.open({readOnly:true});
  try {
    await reader.restoreDependencies(id,bound.authority);
    const replay=reader.engine.replay({initialEnvelope:saved.initial,journal:saved.journal.slice(0,revision)});
    assert(replay.ok,replay.reason);
    assert.equal(replay.envelope.stateHash,saved.journal[revision-1].postStateHash);
    return replay.envelope;
  }finally{reader.close();}
}

export async function signedBranch({initial,state,dir,id,version,scene,perform,verify,manifest=manifestRef}) {
  const bound=await bindWave3StandardActionRoom({manifestRef:manifest,initial,dir,candidateVersion:version,scenario:scene});
  const authority=bound.authorityFor(state,scene),app=bound.open();
  try {
    const seats=await app.create(id,authority);
    const head=async ()=>(await app.store.loadRoom(id)).envelope;
    const menu=async ()=>{
      const h=await head(), side=h.state.activeSideKey ?? h.state.firstPlayerSideKey;
      const response=await app.room.legalSpace({roomId:id,seatToken:seats[side].seatToken});
      assert(response.ok,response.reason);return response.legalSpace;
    };
    const commit=async (row,parameters={})=>{
      assert(row,'missing selected action');
      const h=await head();
      return app.commit({roomId:id,credential:seats[h.state.activeSideKey ?? h.state.firstPlayerSideKey],
        operationKey:'r'+h.stateRevision+'-'+(row.action??row).actionType,...(row.domainId?{
          select:d=>d.domainId===row.domainId,parameters:()=>parameters
        }:{kind:'finite',select:r=>r.actionKey===row.actionKey})});
    };
    const ctx={app,bound,seats,head,menu,commit};
    await perform(ctx);
    const final=await head(),facts=await verify(final,ctx);
    const journal=await assertWave3StandardRoomColdReplayV1(bound,authority,id,final);
    const evidence={roomId:id,version,scene,...facts,revision:final.stateRevision,stateHash:final.stateHash,journal,cold:true,providerCalls:0};
    await save(dir+'/result.public.json',evidence);return evidence;
  }catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{message:error.message,stack:error.stack.split('\n').slice(1,5)});throw error;}
  finally {app.close();}
}
