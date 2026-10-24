// Performance measurements only. Never resume a source room or create a new match.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createGunzip } from 'node:zlib';
import { StringDecoder } from 'node:string_decoder';
import { createHash } from 'node:crypto';
import path from 'node:path';
const [root,matrixPath,outputRoot,resumeFlag] = process.argv.slice(2);
const matrix = JSON.parse(await readFile(matrixPath,'utf8'));
await mkdir(outputRoot,{recursive:true,mode:0o700});
const observationScript = path.join(root,'scripts/observe-ticket-23-real-model-action-performance-v1.mjs');
const previous = resumeFlag === '--resume' ? JSON.parse(await readFile(path.join(outputRoot,'progress.private.json'),'utf8')) : null;
if (previous?.current || previous?.status === 'running') throw new Error('MEASUREMENT_ALREADY_RUNNING');
if (previous?.status === 'stopped_commit_unknown' || previous?.status === 'stopped_missing_report') throw new Error('PRIOR_MEASUREMENT_REQUIRES_RECONCILIATION');
const state = {schemaVersion:'starcraft_tmg_real_model_performance_matrix_progress_v1',startedAt:previous?.startedAt||new Date().toISOString(),status:'preparing',current:null,
  samples:matrix.caseCount,groups:matrix.groupCount,completed:previous?.completed||[],laneLedger:previous?.laneLedger||{},originalRoomWrites:0,newGames:0,webRenderingMeasured:false,
  ...(previous ? {resumedAt:new Date().toISOString(),priorSourceHashes:previous.sourceHashes} : {})};
async function save() { await writeFile(path.join(outputRoot,'progress.private.json'),JSON.stringify(state,null,2),{mode:0o600}); }
async function metadataOnly(json) {
  const value=JSON.parse(json);
  if(value.encoding!=='gzip-base64')return value;
  const stream=createGunzip();stream.end(Buffer.from(value.payload,'base64'));
  const decoder=new StringDecoder('utf8');let prefix='';
  for await(const chunk of stream){
    prefix+=decoder.write(chunk);
    let start=0;
    while(true){const index=prefix.indexOf('"decisions":',start);if(index<0)break;
      try{const candidate=JSON.parse(prefix.slice(0,index)+'"decisions":{}}');
        if(candidate.schemaVersion==='starcraft_tmg_live_flash_decision_port_v1.record'&&candidate.scope?.scopeKey&&Number.isSafeInteger(candidate.usage?.estimatedCostCnyMicros))return candidate;
      }catch{}
      start=index+12;
    }
    if(Buffer.byteLength(prefix)>8*1024*1024)throw new Error('SOURCE_COST_METADATA_PREFIX_UNAVAILABLE');
  }
  throw new Error('SOURCE_COST_METADATA_MISSING');
}
async function baseCost(source){let total=0;const seats=[];
  for(const seat of ['player1','player2']){const db=new DatabaseSync(path.join(source,'seats',seat,'provider/live-decisions.sqlite'),{readOnly:true});
    try{const row=db.prepare('SELECT record_json FROM sc_live_decision_records').get();const value=await metadataOnly(row.record_json);
      total+=value.usage.estimatedCostCnyMicros;seats.push({seat,estimatedCostCnyMicros:value.usage.estimatedCostCnyMicros,providerCalls:value.usage.providerCalls});
      if(db.prepare('SELECT total_changes() AS n').get().n!==0)throw new Error('SOURCE_WRITE');
    }finally{db.close();}
  }return{total,seats};}
async function child(args,tag){const stdout=createWriteStream(path.join(outputRoot,tag+'.stdout.log'),{flags:'wx',mode:0o600});
  const stderr=createWriteStream(path.join(outputRoot,tag+'.stderr.log'),{flags:'wx',mode:0o600});
  const job=spawn(process.execPath,args,{cwd:root,shell:false,stdio:['ignore','pipe','pipe']});job.stdout.pipe(stdout);job.stderr.pipe(stderr);
  const launch={pid:job.pid,startedAt:new Date().toISOString(),args:args.filter(a=>!a.includes('credential'))};
  await writeFile(path.join(outputRoot,tag+'.launch.json'),JSON.stringify(launch),{mode:0o600});
  state.current={tag,pid:job.pid,startedAt:launch.startedAt};await save();
  const exit=await new Promise((resolve,reject)=>{job.on('error',reject);job.on('exit',(exitCode,signal)=>resolve({exitCode,signal,completedAt:new Date().toISOString()}));});
  await Promise.all([new Promise(r=>stdout.writableFinished?r():stdout.once('finish',r)),new Promise(r=>stderr.writableFinished?r():stderr.once('finish',r))]);
  await writeFile(path.join(outputRoot,tag+'.exit.json'),JSON.stringify(exit),{mode:0o600});return exit;}
try{
  // The unchanged observation driver has already passed syntax validation.
  // This queue observes new product versions; it does not rerun old gates.
  state.sourceHashes={};
  for(const file of ['scripts/observe-ticket-23-real-model-action-performance-v1.mjs','packages/online-agent-session/live-flash-decision-port-v1.mjs',
    'packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs','packages/online-agent-session/hosted-opponent-runtime-v2.mjs',
    'packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs','packages/online-agent-session/legal-formation-search-v1.mjs',
    'packages/online-agent-session/legal-asset-placement-search-v1.mjs','packages/online-agent-session/readonly-query-worker-batch-v1.mjs',
    'packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs','packages/authoritative-engine/transition-v1.mjs',
    'packages/online-agent-session/exact-geometry-column-reuse-v2.mjs',
    'packages/online-agent-session/shared-cpu-admission-v1.mjs',
    'packages/online-agent-session/formation-comparison-worker-batch-v1.mjs',
    'packages/online-agent-session/native-special-terrain-los-worker-batch-v1.mjs',
    'packages/room-store/sqlite-room-store-v1.mjs','packages/room-runtime/in-memory-room-v1.mjs',
    'packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs']){
    state.sourceHashes[file]=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
  }
  for(const lane of ['A','B','C']){const group=matrix.groups.find(g=>g.lane===lane);const base=await baseCost(group.source);
    if (previous && state.laneLedger[lane]?.baseCostCnyMicros !== base.total) throw new Error('SOURCE_BASE_COST_CHANGED');
    const carried=previous?.laneLedger[lane]?.carriedCostCnyMicros
      ??matrix.carriedObservationCostCnyMicrosByLane?.[lane]??0;
    if(!Number.isSafeInteger(carried)||carried<0)throw new Error('CARRIED_COST_INVALID:'+lane);
    state.laneLedger[lane]={baseCostCnyMicros:base.total,baseSeats:base.seats,
      carriedCostCnyMicros:carried,newCostCnyMicros:state.laneLedger[lane]?.newCostCnyMicros||0,
      totalAuthorizedLimitCnyMicros:matrix.perLaneTotalAuthorizedLimitCnyMicros};}
  state.status='running';await save();
  const failures=new Map();
  for(const group of matrix.groups){
    // Terminal samples, including incomplete observations, are retained, not retried.
    if(state.completed.some(row=>row.groupId===group.groupId))continue;
    for(const[file,expected]of Object.entries(state.sourceHashes)){if(createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')!==expected)throw new Error('MEASUREMENT_SOURCE_CHANGED:'+file);}
    const ledger=state.laneLedger[group.lane];const remaining=ledger.totalAuthorizedLimitCnyMicros-ledger.baseCostCnyMicros-ledger.carriedCostCnyMicros-ledger.newCostCnyMicros;
    if(remaining<=0){state.completed.push({groupId:group.groupId,status:'authorized_lane_budget_exhausted'});await save();continue;}
    const output=path.join(outputRoot,group.groupId);await mkdir(output,{recursive:true,mode:0o700});
    console.log(JSON.stringify({event:'fresh_model_group_started',groupId:group.groupId,remainingBudgetCnyMicros:remaining}));
    const exit=await child([observationScript,root,matrixPath,group.groupId,output,String(remaining)],group.groupId);
    const report=await readFile(path.join(output,'report.private.json'),'utf8').then(JSON.parse).catch(()=>null);
    const record={groupId:group.groupId,exit,status:report?.status||'child_failed_before_report',failure:report?.failure||report?.result?.reason||null,
      completeProductCoreElapsedMs:report?.completeProductCoreElapsedMs??null,providerRoundElapsedMs:report?.providerRoundElapsedMs??null,
      nonProviderCoreElapsedMs:report?.nonProviderCoreElapsedMs??null,newEstimatedCostCnyMicros:report?.newEstimatedCostCnyMicros??null,
      newProviderAttempts:report?.actualNewProviderAttemptCount??null,sampleCoverage:report?.sampleCoverage||[],reportPath:path.join(output,'report.private.json')};
    state.completed.push(record);
    if(record.newEstimatedCostCnyMicros!==null)ledger.newCostCnyMicros+=record.newEstimatedCostCnyMicros;
    await appendFile(path.join(outputRoot,'completed.ndjson'),JSON.stringify(record)+'\n',{mode:0o600});await save();
    console.log(JSON.stringify({event:'fresh_model_group_completed',...record}));
    if(report?.commitUnknown){state.status='stopped_commit_unknown';break;}
    if(!report){state.status='stopped_missing_report';break;}
    const failure=record.failure|| (record.status==='fresh_model_product_core_measured'?null:record.status);
    if(failure){const count=(failures.get(failure)||0)+1;failures.set(failure,count);if(count>=3){state.status='stopped_three_same_failures';break;}}
  }
  if(state.status==='running')state.status='measurements_finished';
}catch(error){state.status='matrix_failed';state.failure=String(error.code||error.message).slice(0,1000);process.exitCode=1;}
finally{state.current=null;state.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({event:'matrix_terminal',status:state.status,completedGroups:state.completed.length,failure:state.failure||null,laneLedger:state.laneLedger}));}
