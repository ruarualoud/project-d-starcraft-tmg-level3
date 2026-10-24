// Actual r13/r14/r15 share one Native audit, but Plan bindings made it stale.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const historical=original.evidence.find(e=>e.id==='draft:r13:builder');
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const memory=new Map();let state={schema:original.schema,scope:copy(original.scope),
    draftRef:original.draftRef,draftRevision:original.draftRevision,
    work:[],reads:[],events:[],evidence:[copy(historical)],acceptanceGranted:false};
  assert.notEqual(historical.bindings.plan,state.scope.plan);
  const audit=await disk(historical.artifactRef);
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const make=()=>createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('No model or tool calls')});
  const core=await make();
  const row=(await core.inspect()).evidence[0];
  assert.equal(row.validity,'current','Unchanged Native Builder audit must survive a Plan-only change');
  assert.equal(row.artifactRef,historical.artifactRef);assert.deepEqual(row.planningBindings,historical.bindings);
  report.checks.push('actual_old_builder_number_remains_current_without_changing_body_or_plan');
  const cmd={type:'publish_evidence',id:'draft:r999:builder',title:'Injected same audit publication',
    kind:'tool_receipt',bindings:copy(state.scope),conditions:copy(historical.conditions),value:audit};
  await core.dispatch(cmd);await core.dispatch(cmd);
  assert.equal((await core.inspect()).evidence.find(e=>e.id===cmd.id).bindings.plan,undefined);
  assert.equal(state.evidence.length,2);
  report.checks.push('new_and_cold_publication_use_identical_fact_scope_idempotently');
  state.scope.plan='later-plan';
  const reopened=await make();assert((await reopened.inspect()).evidence.every(e=>e.validity==='current'));
  state.scope.army='different-army';
  assert((await (await make()).inspect()).evidence.every(e=>e.validity==='historical'));
  state.scope=copy(original.scope);
  for(const value of [{...audit,verdictHash:'tampered'}, {...audit,candidateHash:'different-army'}]){
    const clone=copy(historical);clone.id='draft:r998:builder';clone.artifactRef=await store.put(value);
    state.evidence=[clone];
    const invalid=(await (await make()).inspect()).evidence[0];assert.equal(invalid.validity,'historical');
    assert.equal(invalid.bindings.plan,historical.bindings.plan);
  }
  report.checks.push('army_change_or_tampered_source_does_not_inherit_fact_validity');
  assert.deepEqual(JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),original);
  report.pass=true;
}catch(e){report.pass=false;report.error=e.message;report.stack=e.stack?.split('\n').slice(0,6);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
