import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {findKhassarReactionPosition} from './support/wave3-khassar-reaction-position.mjs';
const dir='build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/action';
const db=openWave3EngineeringStoreV1({directory:process.cwd()+'/'+dir,filename:'room.sqlite',readOnly:true});
try{
  const {initialEnvelope}=await db.loadReplayBundle('reaction-khassar-285');
  const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
  const context=await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
  const runtime=createOfficialReleaseMatchRuntimeV2({context,state:initialEnvelope.state,candidateVersion:'2.85.0'});
  const samples=[];
  try{await save(dir+'/qualified-layout.public.json',{sourceStateHash:initialEnvelope.stateHash,...findKhassarReactionPosition(initialEnvelope.state,runtime,row=>samples.push(row))});}
  finally{await save(dir+'/sampled-geometry-'+Date.now()+'.public.json',samples);console.log(samples.slice(0,5));}
}finally{db.close();}
