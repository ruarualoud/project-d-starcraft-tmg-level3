import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export const SKILLOPT_ORIGINAL_PROTOCOL_V1 = 'project_d_skillopt_rpc_v1';
const here = path.dirname(fileURLToPath(import.meta.url));
const sourceDefault = path.resolve(here, '../../docs/research/learning-flow-review-2026-11-10/original-sources/SkillOpt');
const canonical = v => JSON.stringify(sort(v));
function sort(v) {
  if (Array.isArray(v)) return v.map(sort);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])]));
  return v;
}
function digest(v) { return createHash('sha256').update(canonical(v)).digest('hex'); }
async function read(file) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
async function write(file, value) { const tmp = file + '.next'; await fs.writeFile(tmp, JSON.stringify(value, null, 2)); await fs.rename(tmp, file); }
function fail(code) { throw Object.assign(new Error(code), { code }); }
function publicOnly(v) {
  if (Array.isArray(v)) return v.map(publicOnly);
  if (!v || typeof v !== 'object') return v;
  return Object.fromEntries(Object.entries(v).filter(([k]) => !/^(?:api.?key|authorization|cookie|chain.?of.?thought|hidden.?reasoning|reasoning_content|thinking)$/i.test(k)).map(([k,x]) => [k,publicOnly(x)]));
}
const configKeys = new Set(['batch_size','num_epochs','accumulation','seed','merge_batch_size','train_size','edit_budget','min_edit_budget','sel_env_num','test_env_num','eval_test','analyst_workers','minibatch_size','failure_only','lr_scheduler','use_slow_update','slow_update_samples','slow_update_gate_with_selection','gate_metric','gate_mixed_weight']);
export function compileSkillOptOriginalManifestV1(input) {
  if (!input?.id || !input.skillContent || !Array.isArray(input.cases) || !input.cases.length) fail('SKILLOPT_MANIFEST_MISSING');
  const cases = input.cases.map(c => ({id:c.id, split:c.split, ancestorGroup:c.ancestorGroup, task_type:c.task_type || 'starcraft-tmg', sourceRef:c.sourceRef}));
  const ids = new Set(), groups = new Map();
  for (const c of cases) {
    if (typeof c.id !== 'string' || !c.id || ids.has(c.id) || !['train','val','test'].includes(c.split) || !c.ancestorGroup || !c.sourceRef) fail('SKILLOPT_SCENARIO_INVALID');
    ids.add(c.id);
    if (groups.has(c.ancestorGroup) && groups.get(c.ancestorGroup) !== c.split) fail('SKILLOPT_ANCESTOR_SPLIT_LEAK');
    groups.set(c.ancestorGroup,c.split);
  }
  for (const k of Object.keys(input.config || {})) if (!configKeys.has(k)) fail('SKILLOPT_UNSUPPORTED_CONFIG:'+k);
  const config = {batch_size:1,num_epochs:2,accumulation:1,seed:1,merge_batch_size:2,train_size:cases.filter(c=>c.split==='train').length,edit_budget:2,min_edit_budget:1,sel_env_num:cases.filter(c=>c.split==='val').length,test_env_num:cases.filter(c=>c.split==='test').length,eval_test:false,analyst_workers:1,minibatch_size:1,failure_only:false,lr_scheduler:'constant',use_slow_update:true,slow_update_samples:1,slow_update_gate_with_selection:true,gate_metric:'hard',...input.config};
  if (config.analyst_workers !== 1) fail('SKILLOPT_PARALLEL_REPLAY_NOT_VERIFIED');
  const manifest = {schemaVersion:'project_d_skillopt_original_manifest_v1',id:input.id,scope:publicOnly(input.scope),sourceCommit:'ccfdcdf7ab50456e2556200499f2bccf1e1b43b2',skillContent:input.skillContent,cases,config,interpretation:input.interpretation || 'isolated_research_candidate_not_live_promotion'};
  return {...manifest,inputHash:digest(manifest)};
}

// The OS releases this lease on process/pipe loss. A stale pathname is not an owner.
export async function acquirePostgameRunLeaseV1(directory,codePrefix='SKILLOPT') {
  const program = [
    'import fcntl, sys',
    'lock = open(sys.argv[1], "a+")',
    'try:',
    ' fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)',
    'except BlockingIOError:',
    ' print("busy", flush=True); sys.exit(3)',
    'print("ready", flush=True)',
    'sys.stdin.buffer.read()',
  ].join('\n');
  const owner = spawn('python3',['-u','-c',program,path.join(directory,'active.lock')],{stdio:['pipe','pipe','pipe']});
  const closed = new Promise(resolve => owner.once('close',resolve));
  let errorText=''; owner.stderr.on('data',chunk=>{errorText=(errorText+chunk.toString()).slice(-1000)});
  const lines=createInterface({input:owner.stdout});
  try {
    await new Promise((resolve,reject)=>{
      let ready=false;
      owner.once('error',reject);
      lines.once('line',line=>{
        if(line==='ready'){ready=true;resolve();}
        else reject(Object.assign(new Error(codePrefix+'_RUN_ALREADY_ACTIVE'),{code:codePrefix+'_RUN_ALREADY_ACTIVE'}));
      });
      owner.once('close',code=>{if(!ready)reject(Object.assign(new Error(codePrefix+'_RUN_LEASE_FAILED:'+code+':'+errorText),{code:codePrefix+'_RUN_LEASE_FAILED'}))});
    });
    return async()=>{owner.stdin.end();await closed;lines.close();};
  } catch(error) {owner.stdin.end();await closed;lines.close();throw error;}
}


// Reconsume a confirmed transport-wrapper decoding error without buying a reply
// or replaying Native. A durable journal makes interruption at any write safe.
export async function reconcileSkillOptSavedRepliesV1({directory,optimizer}) {
 if(typeof optimizer?.readSaved!=='function')return null;
 const manifest=await read(path.join(directory,'manifest.json'));if(!manifest)return null;
 const release=await acquirePostgameRunLeaseV1(directory);
 try{
  const journalFile=path.join(directory,'saved-reply-recovery.json');
  let journal=await read(journalFile);
  if(journal?.status==='applied')return {id:journal.id,kind:journal.kind};
  if(!journal){
   const done=await read(path.join(directory,'complete.json'));if(!done)return null;
   const names=(await fs.readdir(path.join(directory,'calls'))).filter(n=>n.endsWith('.json'));
   const calls=await Promise.all(names.map(async name=>({name,record:await read(path.join(directory,'calls',name))})));
   const updates=[];
   for(const {name,record} of calls){
    if(record.status!=='complete'||record.request.operation!=='optimizer')continue;
    const saved=await optimizer.readSaved({...record.request.payload,requestKey:record.key,manifest});
    if(saved?.status==='completed'&&saved.result.normalization?.transportUnwrapped===true&&saved.result.text!==record.result.text)
     updates.push({name,previous:record,result:saved.result});
   }
   if(!updates.length)return null;
   const first=Math.min(...updates.map(u=>Date.parse(u.previous.startedAt)));
   if(!Number.isFinite(first)||calls.some(c=>!updates.some(u=>u.name===c.name)&&Date.parse(c.record.startedAt)>=first))
    fail('SKILLOPT_SAVED_REPLY_HAS_DEPENDENT_EXTERNAL_CALLS');
   const id=digest(updates.map(u=>({key:u.previous.key,old:u.previous.result.text,next:u.result.text})));
   journal={id,kind:'saved_transport_wrapper_reconsumed_v1',status:'prepared',updates,previousCompletion:done,createdAt:new Date().toISOString()};
   await write(journalFile,journal);
  }
  for(const u of journal.updates){
   const file=path.join(directory,'calls',u.name),current=await read(file);
   if(current?.savedReplyRecoveryId===journal.id)continue;
   if(digest(current)!==digest(u.previous))fail('SKILLOPT_SAVED_REPLY_RECOVERY_CONFLICT');
   await write(file,{...current,result:publicOnly(u.result),savedReplyRecoveryId:journal.id});
  }
  const done=await read(path.join(directory,'complete.json'));
  if(done?.invalidatedByRecovery!==journal.id){
   if(digest(done)!==digest(journal.previousCompletion))fail('SKILLOPT_COMPLETION_RECOVERY_CONFLICT');
   await write(path.join(directory,'complete.json'),{...done,invalidatedByRecovery:journal.id});
  }
  await write(journalFile,{...journal,status:'applied',appliedAt:new Date().toISOString()});
  return {id:journal.id,kind:journal.kind};
 }finally{await release();}
}

export function createSkillOptOriginalRuntimeV1({directory, sourceRoot=sourceDefault, optimizer, rollout, hooks={}}) {
  if (!directory || typeof optimizer !== 'function' || typeof rollout !== 'function') fail('SKILLOPT_PORTS_REQUIRED');
  let active = false;
  async function run(input) {
    if (active) fail('SKILLOPT_RUN_ALREADY_ACTIVE');
    active = true;
    let child, log, releaseLease, primaryError, outcome;
    const jobs = new Set();
    try {
      await fs.mkdir(path.join(directory,'calls'),{recursive:true});
      releaseLease = await acquirePostgameRunLeaseV1(directory);
      const manifest = compileSkillOptOriginalManifestV1(input);
      const old = await read(path.join(directory,'manifest.json'));
      if (old && old.inputHash !== manifest.inputHash) fail('SKILLOPT_MANIFEST_CHANGED');
      if (!old) await write(path.join(directory,'manifest.json'),manifest);
      const done = await read(path.join(directory,'complete.json'));
      if (done && !done.invalidatedByRecovery) return done;
      const source = await read(path.join(sourceRoot,'CORE-SOURCE.json'));
      if (source?.commit !== manifest.sourceCommit) fail('SKILLOPT_SOURCE_VERSION_MISMATCH');
      const attempt = 'attempt-'+Date.now();
      const attemptRoot = path.join(directory,attempt);
      await fs.mkdir(attemptRoot,{recursive:true});
      log = await fs.open(path.join(attemptRoot,'trainer.log'),'a');
      child = spawn('python3',['-B',path.join(here,'skillopt-original-bridge-v1.py'),'--source',sourceRoot,'--manifest',path.join(directory,'manifest.json'),'--output',attemptRoot],{stdio:['pipe','pipe',log.fd]});
      const reply = value => { if (!child.stdin.destroyed) child.stdin.write(JSON.stringify(value)+'\n'); };
      async function request(message) {
        const key = digest({operation:message.operation,payload:message.payload,id:message.id});
        const file = path.join(directory,'calls',key+'.json');
        let record = await read(file);
        if (record?.status === 'complete') {
          reply({id:message.id,result:record.result});
          return;
        }
        const port = message.operation==='optimizer' ? optimizer : rollout;
        if (record) {
          const recovered = await port.recover?.({...message.payload, requestKey:key, manifest});
          if (recovered?.status !== 'completed') fail('SKILLOPT_EXTERNAL_RESULT_UNRESOLVED:'+key);
          record = {...record,status:'complete',result:publicOnly(recovered.result),recoveredAt:new Date().toISOString()};
          await write(file,record);
          reply({id:message.id,result:record.result});
          return;
        }
        if (message.protocol !== SKILLOPT_ORIGINAL_PROTOCOL_V1 || !['optimizer','rollout'].includes(message.operation)) fail('SKILLOPT_RPC_INVALID');
        record = {schemaVersion:SKILLOPT_ORIGINAL_PROTOCOL_V1,key,status:'in_flight',request:publicOnly(message),startedAt:new Date().toISOString()};
        await write(file,record);
        // Ports must use key as their idempotency identity; existing paid/native receipts resolve unknowns.
        const result = publicOnly(await port({...message.payload, requestKey:key, manifest}));
        record = {...record,status:'complete',result,completedAt:new Date().toISOString()};
        await write(file,record);
        await hooks.afterResponseSaved?.(record);
        reply({id:message.id,result});
      }
      const lines = createInterface({input:child.stdout});
      lines.on('line', line => {
        let message;
        try { message=JSON.parse(line); } catch { primaryError ||= Object.assign(new Error('SKILLOPT_RPC_JSON_INVALID'),{code:'SKILLOPT_RPC_JSON_INVALID'}); child.kill('SIGTERM'); return; }
        if (message.type === 'request') {
          const job=request(message).catch(error=>{primaryError ||= error;reply({id:message.id,error:{code:error.code||'SKILLOPT_HOST_PORT_FAILED',message:error.message}});});
          jobs.add(job);job.finally(()=>jobs.delete(job));
        } else { outcome=message; }
      });
      const exit = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
      await Promise.allSettled([...jobs]);
      const result = {status:exit.code===0 && outcome?.type==='complete' ? 'complete':'stopped',attempt,exit,outcome,sourceCommit:manifest.sourceCommit,updatedAt:new Date().toISOString()};
      await write(path.join(attemptRoot,'outcome.json'),result);
      await write(path.join(directory,'latest.json'),result);
      if (primaryError) throw primaryError;
      if (result.status!=='complete') fail('SKILLOPT_ORIGINAL_TRAINER_STOPPED:'+JSON.stringify(outcome));
      await write(path.join(directory,'complete.json'),result);
      return result;
    } finally {
      if (child && child.exitCode===null) child.kill('SIGTERM');
      await log?.close();
      await releaseLease?.();
      active=false;
    }
  }
  return {run};
}
