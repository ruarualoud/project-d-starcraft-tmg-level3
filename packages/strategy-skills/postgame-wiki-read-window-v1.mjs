import {clone} from '../skill-production/common.mjs';
export const WIKI_READ_WINDOW_V1='paged_workspace_v1';
const bytes=v=>Buffer.byteLength(JSON.stringify(v));
// Transport pages, not summaries: every original action is retained exactly once.
export function paginateWikiTrajectoryV1(handle,body){
 const {steps,...metadata}=body,parts=[];let batch=[],size=0;
 const flush=()=>{if(!batch.length)return;parts.push({handle:handle+':part:'+(parts.length+1),kind:'trajectory',hiddenFromIndex:true,title:handle+' actions '+batch[0].handle+' … '+batch.at(-1).handle,body:{...metadata,steps:batch}});batch=[];size=0};
 for(const step of steps){const n=bytes(step);if(batch.length&&size+n>100000)flush();batch.push(step);size+=n}flush();
 return [{handle,kind:'trajectory_index',title:handle,body:{...metadata,stepCount:steps.length,reading:'Choose parts to read original actions. This directory is not evidence that its action bodies were read.',parts:parts.map(p=>({handle:p.handle,first:p.body.steps[0].handle,last:p.body.steps.at(-1).handle,actions:p.body.steps.length}))}},...parts];
}
export function projectWikiReadWindowV1(navigation,pages){
 const last=new Set(navigation.lastRead?.handles||[]),seen=new Map(navigation.delivered.map(p=>[p.handle,p]));
 const ordered=[...navigation.delivered].sort((a,b)=>Number(last.has(b.handle))-Number(last.has(a.handle))||navigation.delivered.indexOf(b)-navigation.delivered.indexOf(a));
 const active=[];let used=0;
 for(const p of ordered){const current=pages.get(p.handle),page=current?.kind==='trajectory_index'?{handle:p.handle,...clone(current)}:clone(p);const n=bytes(page);
  if(used+n<=700000||!active.length&&n<=900000){active.push(page);used+=n;}
 }
 return {active,history:[...seen.values()].map(p=>({handle:p.handle,kind:pages.get(p.handle)?.kind||p.kind,attached:active.some(a=>a.handle===p.handle),readableAgain:true})),attachedBytes:used};
}
export function selectWikiReadBatchV1(results){
 const chosen=[],deferred=[];let used=0;
 for(const p of results){const n=bytes(p);if(used+n<=500000||!chosen.length){chosen.push(p);used+=n}else deferred.push(p.handle)}
 return {chosen,deferred};
}
