// Only the newly changed public Run entry; the passed role/scheduler gate is
// NOT repeated. Actual B sources, injected author operation, memory-only store.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {rosterComparisonRedesignContractV1,projectRosterComparisonDesignHandoffV1} from '../packages/roster-strategist/roster-comparison-redesign-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const report={schema:'slice272_comparison_redesign_product_v925',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const original=await fs.readFile(directory+'/workflow.json','utf8');let state=JSON.parse(original);
  const memory=new Map(),cache=new Map();
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;},
    get:async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,
      JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));return copy(cache.get(ref));}};
  state.work=state.work.map(w=>({...w,status:w.status==='running'?'needs_repair':w.status,
    operationState:w.operationState?{...w.operationState,pending:null}:null}));
  // This fixture tests enqueue, not replay of thousands of historical Native
  // scenes. Keep their immutable work/evidence; omit only restore event triggers
  // in MEMORY, as in the existing product-entry probe.
  state.events=state.events.filter(e=>state.work.find(w=>w.id===e.workId)?.role!=='roster_workflow_tool');
  const purpose=state.work.findLast(w=>w.strategyComparisonDesignCycleId&&w.resultRef);
  const contract=rosterComparisonRedesignContractV1({role:'roster_workflow_strategy_decision',inputs:{strategicHypothesisChallenge:{value:{
    comparisonMemory:{cycleId:purpose.strategyComparisonDesignCycleId,status:'awaiting_owner',comparisonResolved:false,
      design:{workId:purpose.id,resultRef:purpose.resultRef,revision:purpose.designRevision}}}}}});
  const decision={disposition:'retain',publicReason:'Injected explicit redesign, not historical prose.',evidenceNumbers:[862],
    nextInvestigation:null,workflowBlocker:null,mutation:null,strategicChanges:[],requiredData:['Original comparison remains unresolved'],
    comparisonDesignRequest:{reason:'The measured arm differs.',proposedChange:'Assess whether a limited comparison answers the same choice.',
      decisionToEnable:'Evaluate the original unit allocation choice.',evidenceNumbers:[862]}};
  const requestRef=await store.put({promptNodes:[contract]}),replyRef=await store.put({injected:true,decision});
  const resultRef=await store.put({kind:'proposal',value:{decisions:[decision],originalReplyRef:replyRef,
    comparisonDesignHandoff:projectRosterComparisonDesignHandoffV1({contract,decision,replyRef})}});
  const outcomeRef=await store.put({applied:false,status:'retain',acceptanceGranted:false});
  const author={id:'injected-product-redesign-v925',role:'roster_workflow_strategy_decision',status:'evidence_ready',
    bindings:copy(state.scope),draftRevision:state.draftRevision,resultRef,draftOutcomeRef:outcomeRef,
    operationState:{calls:[{requestRef,replyRef}],pending:null},inputs:{}};
  state.work.push(author);
  state.evidence.push({...copy(state.evidence.find(e=>e.id.startsWith('role:'))),id:'role:'+author.id,
    artifactRef:resultRef,bindings:copy(state.scope),kind:'proposal',title:'Injected scoped author redesign'});
  const lab={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'v925-no-native',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){throw Error('NO_NATIVE_EXECUTION');}};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory:lab,scope:state.scope,
    sessionId:'v925-public-entry',deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}});
  const args={id:purpose.strategyComparisonDesignCycleId+':purpose:v'+(purpose.designRevision+1),
    cycleId:purpose.strategyComparisonDesignCycleId,teacherWorkId:purpose.inputs.originalTeach.id.slice(5),
    previousPurposeWorkId:purpose.id,designRevision:purpose.designRevision+1,authorWorkId:author.id};
  await assert.rejects(run.requestStrategicComparisonDesign({...args,previousPurposeWorkId:'wrong-purpose'}),/EXACT_AUTHOR_REDESIGN_REQUIRED/);
  const beforeDraft=state.draftRef,beforeArmy=state.scope.army;
  assert.deepEqual((await run.requestStrategicComparisonDesign(args)).scheduled,[args.id]);
  const added=state.work.find(w=>w.id===args.id);
  assert.equal(added.comparisonRedesignOf,author.id);
  assert.equal(added.inputs.previousDesign.id,'role:'+purpose.id);
  assert.equal(added.inputs.authorRedesignRequest.id,'role:'+author.id);
  assert.equal(added.inputs.redesignContract.value.approvalGranted,false);
  assert.equal(state.draftRef,beforeDraft);assert.equal(state.scope.army,beforeArmy);
  assert.equal(state.work.find(w=>w.id===purpose.id).resultRef,purpose.resultRef);
  assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  report.pass=true;report.checked=['actual public Run validates original author/purpose',
    'core enqueues design author with previous design and explicit request','no Plan/army mutation or old source rewrite'];
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,6);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
