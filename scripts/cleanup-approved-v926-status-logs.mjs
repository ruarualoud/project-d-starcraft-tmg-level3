// User approval: only the two named observation logs and slice272-v9xx stdout
// logs. Preserve summaries first; never traverse/delete an artifact directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
const root=process.cwd(),build=path.join(root,'build');
const names=['slice272-product-generation-v645-hsxEYu/observations.jsonl',
  'slice272-product-generation-v645-8aBuEV/observations.jsonl'];
for(const entry of await fs.readdir(build,{withFileTypes:true}))
  if(entry.isFile()&&/^slice272-v9\d\d-.*\.log$/.test(entry.name))names.push(entry.name);
const selected=[];
for(const name of names){
  const target=path.join(build,name),stat=await fs.lstat(target);
  if(!stat.isFile()||stat.isSymbolicLink()||await fs.realpath(target)!==target)throw Error('CLEANUP_TARGET_NOT_REGULAR');
  const entry={name,bytes:stat.size,mtimeMs:stat.mtimeMs,lines:0,unparsed:0,first:null,last:null,transitions:[]};
  let prior='';
  for await(const line of createInterface({input:createReadStream(target),crlfDelay:Infinity})){
    if(!line.trim())continue;entry.lines++;
    let value;try{value=JSON.parse(line);}catch{entry.unparsed++;continue;}
    const brief={at:value.at??null,stage:value.stage??null,status:value.status??null,running:value.running??null,
      workflowId:value.workflowId??null,draftRevision:value.draftRevision??null,evidenceCount:value.evidenceCount??null,
      code:value.code??value.failure?.code??null,dispatchOutcome:value.failure?.dispatchOutcome??null,
      stopRequested:value.stopRequested??null,mode:value.mode??null};
    entry.first??=brief;entry.last=brief;
    const key=JSON.stringify([brief.stage,brief.status,brief.code,brief.draftRevision,brief.stopRequested]);
    if(key!==prior){entry.transitions.push(brief);prior=key;}
  }
  selected.push(entry);
}
const stamp=Date.now(),summaryPath=path.join(build,`approved-v926-status-log-summary-${stamp}.json`);
const report={schema:'approved_status_cleanup_v926',approvedScope:'two current observations and slice272-v9xx stdout logs',
  preserved:['source','model requests/replies','tool evidence','costs','workflow checkpoints','reports','screenshots'],
  fullLinesRecoverable:false,selected,selectedBytes:selected.reduce((n,e)=>n+e.bytes,0)};
await fs.writeFile(summaryPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
if(!process.argv.includes('--apply')){console.log(JSON.stringify({summaryPath,count:selected.length,bytes:report.selectedBytes,deleted:false}));}
else{
  const deleted=[];
  for(const entry of selected){
    const target=path.join(build,entry.name),now=await fs.lstat(target);
    if(!now.isFile()||now.isSymbolicLink()||now.size!==entry.bytes||now.mtimeMs!==entry.mtimeMs)
      throw Error('CLEANUP_TARGET_CHANGED');
    await fs.unlink(target);deleted.push({name:entry.name,bytes:entry.bytes});
  }
  const receiptPath=path.join(build,`approved-v926-status-log-deletion-${stamp}.json`);
  await fs.writeFile(receiptPath,JSON.stringify({summaryPath,deleted,bytes:report.selectedBytes},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({summaryPath,receiptPath,deletedCount:deleted.length,freedMiB:report.selectedBytes/1048576,
    retainedAllAuthoritativeArtifacts:true,fullDeletedLinesRecoverable:false}));
}
