// Actual r18 closure-reconsider lost its nested question at the public Run.
// Exercise that SAME enqueue seam with frozen data and an in-memory store.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone,checks=[];
const report={providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  let state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const originalDraft=state.draftRef,originalScope=copy(state.scope),memory=new Map(),cache=new Map();
  const historical=state.work.find(w=>w.id.endsWith(':closure-reconsider:r18'));
  assert(historical,'Actual affected r18 task must exist');
  assert.equal(historical.inputs.question.value,undefined,'Frozen failure evidence was rewritten');
  // No Native scene restore or interrupted-call reconciliation is under test.
  state.work=state.work.map(w=>({...w,status:w.status==='running'?'needs_repair':w.status,
    operationState:w.operationState?{...w.operationState,pending:null}:null}));
  state.events=state.events.filter(e=>state.work.find(w=>w.id===e.workId)?.role!=='roster_workflow_tool');
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;},
    get:async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,
      JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));return copy(cache.get(ref));}};
  const laboratory={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'v944-no-native',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){throw Error('NO_NATIVE_EXECUTION');}};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:state.scope,
    sessionId:'v944-public-entry',deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}});
  const question={goal:'当前Plan已改变，复核先前结束可选比较的取舍是否仍适用。',
    instruction:'先消费旧作者选择和审核，不重演已经结束的实验。仍适用则以当前Plan申请保留结束。'};
  const inherited={source:'literal',value:question};
  await run.requestDecision({id:'injected:v944:nested',inputs:{question:inherited}});
  assert.deepEqual(state.work.find(w=>w.id==='injected:v944:nested').inputs.question,inherited,
    'Public Run silently overwrote the supplied applicability question with undefined');
  checks.push('actual_nested_question_survives_public_Run_enqueue');
  await run.requestDecision({id:'injected:v944:top',question,inputs:{question:inherited}});
  await run.requestTeach({id:'injected:v944:teach',inputs:{question:inherited}});
  for(const id of ['injected:v944:top','injected:v944:teach'])
    assert.deepEqual(state.work.find(w=>w.id===id).inputs.question,inherited);
  checks.push('one_question_contract_for_decision_and_Teach');
  const count=state.work.length;
  await assert.rejects(()=>run.requestDecision({id:'injected:v944:conflict',question:{goal:'different'},
    inputs:{question:inherited}}),/QUESTION_CONFLICT/);
  await assert.rejects(()=>run.requestTeach({id:'injected:v944:missing'}),/QUESTION_REQUIRED/);
  assert.equal(state.work.length,count);
  assert.equal(state.draftRef,originalDraft);assert.deepEqual(state.scope,originalScope);
  assert.equal(state.work.find(w=>w.id===historical.id).inputs.question.value,undefined);
  checks.push('conflicting_or_missing_question_never_dispatched_no_old_record_rewrite');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack?.split('\n').slice(0,6);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify({...report,checks},null,2)+'\n');console.log(JSON.stringify({...report,checks}));
