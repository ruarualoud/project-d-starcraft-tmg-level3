// Complete ONLY missing original-parameter timing observations after fresh Flash
// measurements. No additional model calls, source Room writes or parity-gate reruns.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
const [root, matrixRoot, outputRoot, sourceVersionChangePath] = process.argv.slice(2);
const matrix = JSON.parse(await readFile(path.join(matrixRoot,'matrix.private.json'),'utf8'));
const natural = JSON.parse(await readFile(path.join(matrixRoot,'progress.private.json'),'utf8'));
if(natural.current || natural.status !== 'measurements_finished')throw new Error('FRESH_MATRIX_NOT_TERMINAL');
await mkdir(outputRoot,{recursive:true,mode:0o700});
const progress={schemaVersion:'starcraft_tmg_fixed_query_timing_supplement_v1',startedAt:new Date().toISOString(),status:'preparing',current:null,
  active:[],measurementConcurrency:'three_lanes_shared_cpu_admission',
  missingCases:[],exactNaturalCases:[],completedLanes:[],providerCalls:0,originalRoomWrites:0,functionalParityGateRepeated:false,fullProductAction:false};
// Preserve the completed paid matrix's provenance. Only this explicitly
// recorded source-level ownership correction may differ in the supplement.
const sourceVersionChange=sourceVersionChangePath
  ? JSON.parse(await readFile(sourceVersionChangePath,'utf8')) : null;
if(sourceVersionChange && (sourceVersionChange.file !== 'packages/room-store/sqlite-room-store-v1.mjs'
  || sourceVersionChange.changeKind !== 'internal_owned_reader_explicit_opt_in')) {
  throw new Error('UNSUPPORTED_MEASUREMENT_SOURCE_CHANGE');
}
progress.sourceVersionChanges=sourceVersionChange ? [sourceVersionChange] : [];
let writeTail=Promise.resolve();
function save(){return writeTail=writeTail.then(()=>writeFile(path.join(outputRoot,'progress.private.json'),JSON.stringify(progress,null,2),{mode:0o600}));}
const manifests={};
for(const lane of ['C','A','B'])manifests[lane]=JSON.parse(await readFile(path.join(path.dirname(matrixRoot),
  lane==='C'?'real-per-type-performance-cases.private.json':`real-per-type-performance-cases-${lane}.private.json`),'utf8'));
for(const group of matrix.groups){
  const choice=JSON.parse(await readFile(path.join(matrixRoot,group.groupId,'decision.private.json'),'utf8'));
  for(const sample of group.cases){
    const entry=manifests[group.lane].cases.find(c=>c.caseId===sample.caseId);
    if(!entry || entry.originalRequestCandidates?.length!==1)throw new Error('EXACT_ORIGINAL_REQUEST_REQUIRED:'+sample.caseId);
    const matched=(choice.queryReceipts||[]).some(q=>q.queryReceiptHash===entry.originalReceipt.queryReceiptHash);
    (matched?progress.exactNaturalCases:progress.missingCases).push({lane:group.lane,groupId:group.groupId,caseId:sample.caseId});
  }
}
progress.sourceHashes={};
for(const [file,expected] of Object.entries(natural.sourceHashes||{})){
  if(file.startsWith('scripts/'))continue;
  const actual=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  if(actual!==expected && !(sourceVersionChange?.file===file
    && sourceVersionChange.beforeSha256===expected
    && sourceVersionChange.afterSha256===actual))throw new Error('PRODUCT_SOURCE_CHANGED:'+file);
  progress.sourceHashes[file]=actual;
}
progress.status='running';await save();
try{
  const laneResults=await Promise.allSettled(['C','A','B'].map(async lane=>{
    const ids=new Set(progress.missingCases.filter(c=>c.lane===lane).map(c=>c.caseId));
    if(!ids.size)return;
    for(const[file,expected]of Object.entries(progress.sourceHashes))if(createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')!==expected)throw new Error('PRODUCT_SOURCE_CHANGED:'+file);
    const manifest={...manifests[lane],cases:manifests[lane].cases.filter(c=>ids.has(c.caseId))};
    const manifestPath=path.join(outputRoot,lane+'-original-requests.private.json');
    await writeFile(manifestPath,JSON.stringify(manifest),{mode:0o600});
    const out=path.join(outputRoot,lane);await mkdir(out,{recursive:true,mode:0o700});
    const stdout=createWriteStream(path.join(outputRoot,lane+'.stdout.log'),{flags:'wx',mode:0o600});
    const stderr=createWriteStream(path.join(outputRoot,lane+'.stderr.log'),{flags:'wx',mode:0o600});
    // This existing mode retains timing/result hashes without invoking the
    // previously passed complete-output assertion. No inspector is enabled.
    const args=[path.join(root,'scripts/replay-ticket-23-real-performance-cases-v1.mjs'),root,manifestPath,out,'','','formation_phase_observation'];
    const job=spawn(process.execPath,args,{cwd:root,shell:false,stdio:['ignore','pipe','pipe']});
    job.stdout.pipe(stdout);job.stderr.pipe(stderr);
    const current={lane,pid:job.pid,startedAt:new Date().toISOString(),caseId:null};
    progress.active.push(current);progress.current=progress.active[0]||null;await save();
    let pending='';let saveTail=Promise.resolve();
    job.stdout.on('data',chunk=>{pending+=chunk.toString();let end;
      while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);
        try{const event=JSON.parse(line);if(event.event==='case_started'){current.caseId=event.caseId;saveTail=saveTail.then(save);}}catch{}
      }
    });
    const exit=await new Promise((resolve,reject)=>{job.once('error',reject);job.once('exit',(exitCode,signal)=>resolve({exitCode,signal,completedAt:new Date().toISOString()}));});
    await saveTail;
    await Promise.all([new Promise(r=>stdout.writableFinished?r():stdout.once('finish',r)),new Promise(r=>stderr.writableFinished?r():stderr.once('finish',r))]);
    const observations=await readFile(path.join(out,'real-per-type-performance-progress.ndjson'),'utf8')
      .then(text=>text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line))).catch(()=>[]);
    const incomplete=observations.filter(row=>row.status!=='phase_observation_complete').map(row=>({caseId:row.caseId,status:row.status,error:row.error||null}));
    const record={lane,...exit,caseCount:manifest.cases.length,observedCount:observations.length,incomplete};
    progress.completedLanes.push(record);progress.active=progress.active.filter(a=>a.lane!==lane);
    progress.current=progress.active[0]||null;await save();
    console.log(JSON.stringify({event:'fixed_query_lane_completed',...record}));
    if(exit.exitCode!==0)throw new Error('FIXED_QUERY_OBSERVATION_INCOMPLETE:'+lane);
  }));
  const failed=laneResults.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
  progress.status=progress.completedLanes.some(l=>l.incomplete.length||l.observedCount!==l.caseCount)
    ? 'measurements_finished_with_incomplete_cases':'measurements_finished';
}catch(e){progress.status='observation_failed';progress.failure=String(e.code||e.message).slice(0,1000);process.exitCode=1;}
finally{progress.current=null;progress.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({event:'fixed_query_terminal',status:progress.status,cases:progress.missingCases.length,providerCalls:0,failure:progress.failure||null}));}
