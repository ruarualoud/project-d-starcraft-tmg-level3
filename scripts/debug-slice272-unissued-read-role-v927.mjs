import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import * as role from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [a,b,output]=process.argv.slice(2),report={schema:'slice272_unissued_read_role_v927',providerCalls:0,nativeCalls:0,productionWrites:0,checked:[]};
try{
  for(const directory of [a,b]){
    const original=await fs.readFile(directory+'/workflow.json','utf8'),saved=JSON.parse(original);
    const stopped=saved.work.find(w=>w.status==='running');assert.ok(stopped);
    let state=structuredClone(saved);const local=new Map(),cache=new Map();
    const readArtifact=async ref=>{if(local.has(ref))return structuredClone(local.get(ref));if(!cache.has(ref))cache.set(ref,
      JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));return structuredClone(cache.get(ref));};
    const store={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);},get:readArtifact,
      put:async v=>{const key=hash(v);local.set(key,structuredClone(v));return key;}};
    const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION_IN_RECOVERY');},
      reconcileReadOnlyInterruption:input=>role.projectRosterUnissuedReadRoleRecoveryV1?.(input)??null});
    const actual=(await workflow.inspect()).work.find(w=>w.id===stopped.id);
    assert.equal(actual.status,'ready','An actual pre-provider read-role interruption must not become permanently unknown');
    assert.deepEqual(actual.operationState,stopped.operationState,'Calls, reads, correction and costs unchanged');
    assert.equal(actual.resultRef,stopped.resultRef);
    assert.ok(state.events.some(e=>e.type==='unissued_read_role_resumed'&&e.workId===stopped.id));
    report.checked.push(directory===a?'actual A saved continuation resumes':'actual B first dispatch resumes');
    const project=work=>role.projectRosterUnissuedReadRoleRecoveryV1({work,state:saved,readArtifact});
    for(const changed of [{...stopped,role:'roster_workflow_tool'},
      {...stopped,operationState:{...stopped.operationState,pending:{requestRef:'unknown'}}},
      {...stopped,bindings:{...stopped.bindings,map:'different-map'}},
      {...stopped,inputRef:'0'.repeat(64)},
      {...stopped,dispatchKey:'different-dispatch'}])assert.equal(await project(changed),null);
    const mismatched=structuredClone(stopped);
    mismatched.operationState={...(mismatched.operationState??{}),version:1,turn:1,calls:[{requestRef:'missing',replyRef:'missing',turn:1}]};
    assert.equal(await project(mismatched),null,'Saved call without proven prior consumption cannot be re-bought');
    assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  }
  report.checked.push('Native/pending/stale/missing/wrong-dispatch/unconsumed refusals','unchanged original state');report.pass=true;
}catch(e){report.pass=false;report.error=e.message;report.stack=e.stack.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
