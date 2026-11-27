import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
// Host-produced, immutable query pages. Models only select published handles.
// Large results remain available in full without entering every role request.
export async function writePostgameQueryArtifactsV1(queries,directory){
 await fs.mkdir(directory,{recursive:true});const index=[];
 for(const q of queries){let serial=0;
  async function page(value,pointer){
   const n=serial++,handle=n===0?q.handle:q.handle+':page:'+n;
   let body;
   if(Buffer.byteLength(JSON.stringify(value))<=24000)body={pointer,value};
   else if(typeof value==='string'){
    const chunks=[];for(let i=0;i<value.length;i+=6000)chunks.push(await page(value.slice(i,i+6000),pointer));
    body={pointer,encoding:'concatenate_text_parts',parts:chunks};
   }else{
    const children=[];let bucket=[],size=0;
    async function flush(){if(!bucket.length)return;
     const part=Object.fromEntries(bucket);
     children.push({keys:bucket.map(([k])=>k),handle:await page(part,pointer)});bucket=[];size=0;
    }
    for(const [key,v] of Object.entries(value)){
     const bytes=Buffer.byteLength(JSON.stringify(v))+Buffer.byteLength(key)+8;
     if(bytes>18000){await flush();children.push({key,handle:await page(v,[...pointer,key])});continue;}
     if(size+bytes>18000)await flush();bucket.push([key,v]);size+=bytes;
    }
    await flush();body={pointer,container:Array.isArray(value)?'array':'object',encoding:'merge_children_by_keys',children};
   }
   const bytes=Buffer.from(JSON.stringify(body));const file=path.join(directory,q.queryReceiptHash+'-'+n+'.json.gz');
   await fs.writeFile(file,zlib.gzipSync(bytes));
   index.push({handle,queryReceiptHash:q.queryReceiptHash,queryKind:q.queryKind,authority:q.authority,root:n===0,
    artifactRef:{file,sha256:digest(bytes),byteLength:bytes.length}});return handle;
  }
  await page(q,[]);
 }
 return index;
}
export async function materializePostgameResearchReadsV1(resolved){
 if(resolved.kind!=='read')return resolved;
 const cache=new Map();
 async function load(page){
  const ref=page.body?.artifactRef;if(!ref)return page;
  if(!cache.has(page.handle)){
   const bytes=zlib.gunzipSync(await fs.readFile(ref.file));
   if(bytes.length!==ref.byteLength||digest(bytes)!==ref.sha256)throw Object.assign(new Error('POSTGAME_RESEARCH_ARTIFACT_CHANGED'),{code:'POSTGAME_RESEARCH_ARTIFACT_CHANGED'});
   cache.set(page.handle,{...page,body:JSON.parse(bytes)});
  }
  return cache.get(page.handle);
 }
 return {...resolved,results:await Promise.all(resolved.results.map(load)),newPages:await Promise.all(resolved.newPages.map(load))};
}
