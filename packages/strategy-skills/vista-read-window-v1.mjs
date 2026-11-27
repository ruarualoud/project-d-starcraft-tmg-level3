import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectPostgameLearningModelContextV1} from './postgame-development-feedback-v1.mjs';
const clone=v=>structuredClone(v), bytes=v=>Buffer.byteLength(JSON.stringify(v));
export const VISTA_READING_TRANSPORT_V1='vista_lossless_read_window_v1';
const PAGE_BYTES=100000,WINDOW_BYTES=600000;
// Structural pages, never a model-written summary. Index pages distinguish
// readable fields from bodies that were actually attached to this request.
export function buildVistaReadWindowV1(record,basePages){
 const pages=new Map(),roots=[];
 function add(value,title,preferred){
  const handle=preferred||'material:'+hash(value);
  if(pages.has(handle))return handle;
  let body;
  if(bytes(value)<=PAGE_BYTES||value?.image?.mimeType==='image/png')body={format:'value',value:clone(value)};
  else if(Array.isArray(value)){
   const parts=[];let batch=[],start=0,size=0;
   const flush=()=>{if(!batch.length)return;parts.push({start,count:batch.length,handle:add(batch,title+' ['+start+':'+(start+batch.length)+']')});start+=batch.length;batch=[];size=0;};
   for(const v of value){const n=bytes(v);if(batch.length&&size+n+1>PAGE_BYTES-2)flush();if(n>PAGE_BYTES-2){flush();parts.push({start,count:1,single:true,handle:add(v,title+' ['+start+']')});start++;}else{size+=n+(batch.length?1:0);batch.push(v);}}flush();
   body={format:'array_index',length:value.length,parts};
  }else if(value&&typeof value==='object')body={format:'object_index',fields:Object.entries(value).map(([key,v])=>({key,handle:add(v,title+' / '+key)}))};
  else body={format:'value',value:clone(value)};
  pages.set(handle,{handle,kind:'vista_material',title,body,originalHash:hash(value),originalBytes:bytes(value)});return handle;
 }
 for(const p of basePages)roots.push({handle:add(p.body,p.title,p.handle),kind:p.kind,title:p.title});
 const context=record.input.learningContext?projectPostgameLearningModelContextV1(record.input.learningContext,{role:'vista'}):null;
 if(context)roots.push({handle:add(context,'Complete development context'),kind:'context',title:'Complete development context: task, map, rosters, plans, observed outcomes'});
 const histories=[];
 for(const d of record.delivered){
  if(d.result?.kind==='vista_workspace_page'||d.result?.kind==='strategy_workspace')continue;
  const {image,...result}=d.result;
  const handle=add(result,'Saved '+d.kind+' '+(d.semantic?.handle||d.operationId));
  roots.push({handle,kind:d.kind,title:'Saved '+d.kind+' '+(d.semantic?.handle||d.operationId)});
  let imageHandle;if(image){imageHandle=add({image},'Image '+d.semantic?.handle);roots.push({handle:imageHandle,kind:'image',title:'Image '+d.semantic?.handle});}
  histories.push({kind:d.kind,operationId:d.operationId,semantic:clone(d.semantic),handle,...(imageHandle?{imageHandle}:{})});
 }
 const last=record.delivered.at(-1);
 const selected=last?.result?.kind==='vista_workspace_page'?[last.result.handle||last.semantic.handle]
  :last?.result?.kind==='strategy_workspace'?[last.semantic.handle]
  :histories.length?[histories.at(-1).handle,...(histories.at(-1).imageHandle?[histories.at(-1).imageHandle]:[])]:[];
 const previous=record.delivered.filter(d=>d.result?.kind==='vista_workspace_page'||d.result?.kind==='strategy_workspace').map(d=>d.result.handle||d.semantic.handle).reverse();
 const active=[];let used=0,images=0;
 for(const handle of [...new Set([...selected,...previous,...roots.filter(p=>p.kind==='context').map(p=>p.handle)])]){
  const p=pages.get(handle);if(!p)continue;const isImage=Boolean(p.body.value?.image);
  const cost=isImage?400:bytes(p);
  if(isImage&&images>=1||used+cost>WINDOW_BYTES&&active.length)continue;
  active.push({kind:'read',semantic:{handle},result:{kind:'vista_workspace_page',page:clone(p)}});used+=cost;if(isImage)images++;
 }
 const attached=new Set(active.map(d=>d.semantic.handle));
 const sources=record.input.development.map(source=>{
  const saved=histories.find(h=>h.kind==='read'&&h.semantic?.handle===source.handle);
  const root=saved&&pages.get(saved.handle),rootAttached=Boolean(saved&&attached.has(saved.handle));
  return {sourceHandle:source.handle,fetched:Boolean(saved),rootHandle:saved?.handle||null,
   rootAttached,fullBodyAttached:rootAttached&&root.body.format==='value',
   imageAttached:Boolean(saved?.imageHandle&&attached.has(saved.imageHandle))};
 });
 return {pages,roots,active,history:histories,selected,attachedBytes:used,
  reading:{transport:VISTA_READING_TRANSPORT_V1,attachedHandles:[...attached],sources,readableAgain:true,
   rule:'Index fields are navigation, not read evidence. read a listed root or child handle to receive its original value. Earlier material can be read again. Full originals are preserved; this window is not the entire conversation.'},
  context:context?{schemaVersion:context.schemaVersion,discoveryMode:context.discoveryMode,objectives:context.objectives,instruction:context.instruction,methodBoundary:context.methodBoundary,
   wholeGames:(context.wholeGames||[]).map(g=>({id:g.id,hash:g.hash,mission:g.mission,factionBySeat:g.factionBySeat,terminal:g.terminal,knownEngineeringIssues:g.knownEngineeringIssues,actionCount:g.actionCount,
    rounds:g.rounds.map(r=>({round:r.round,actionCount:r.actionHandles.length}))}))}:null};
}
