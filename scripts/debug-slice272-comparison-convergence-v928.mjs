// Regression of actual B: prose-only edits must not discharge a frozen choice.
// Source state/paid replies are read-only. Later injected choices are NOT live evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterStrategyProgressContractV1,rosterStrategyProgressErrorsV1} from '../packages/roster-strategist/roster-strategy-progress-contract-v1.mjs';
const [directory,output]=process.argv.slice(2);
const closureOnly=process.argv.includes('--closure-only');
const report={schema:'slice272_comparison_convergence_v928',providerCalls:0,nativeCalls:0,productionWrites:0,checks:[],errors:[]};
async function check(name,fn){if(closureOnly&&!name.startsWith('Reviewed optional closure'))return;
  try{await fn();report.checks.push(name);}catch(e){report.errors.push({name,message:e.message,stack:e.stack?.split('\n').slice(0,8)});}}
const original=await fs.readFile(directory+'/workflow.json','utf8'),state=JSON.parse(original);
const readArtifact=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const actual=(await readArtifact('cb549b889e089123d246afe22fb76a45073620a160597005bbcc57e062c2cfee')).output.decisions[0];
const purpose=state.work.findLast(w=>w.strategyComparisonDesignCycleId&&w.resultRef);
const assignment={role:'roster_workflow_strategy_decision',inputs:{
  investigationFrontier:{value:{unresolvedQuestions:actual.dataQuestions.map(q=>q.question)}},
  strategicHypothesisChallenge:{value:{comparisonMemory:{cycleId:purpose.strategyComparisonDesignCycleId,
    status:'awaiting_owner',comparisonResolved:false,design:{workId:purpose.id,resultRef:purpose.resultRef,revision:purpose.designRevision}}}}}};
await check('Actual B textual revision alone cannot complete the delegated choice',()=>{
  assert.ok(rosterStrategyProgressErrorsV1({contract:rosterStrategyProgressContractV1(assignment),decision:actual})
    .some(e=>e.code==='comparison_revision_requires_resolution'), 'Actual B passed with only purpose prose and no executable comparison disposition');
});
await check('Product decision schema has an explicit retain-and-close request',()=>{
  assert.ok(ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.providerSchema.properties.decisions.items.properties.comparisonClosureRequest);
});
if(!report.errors.length){
  const api=await import('../packages/roster-strategist/roster-comparison-closure-v1.mjs');
  await apiFixture(api);
}
async function apiFixture(api){
  const copy=structuredClone;
  const contract=api.rosterComparisonClosureContractV1(assignment);
  const decision={...copy(actual),disposition:'retain',mutation:null,strategicChanges:[],comparisonDesignRequest:null,
    comparisonClosureRequest:{questionNumbers:[1],evidenceNumbers:[862,866],selectedOption:'Keep the current support allocation.',
      declinedAlternative:'Do not fund the unmeasured large alternative in this scenario.',
      decisionBasis:'Injected scoped retention; independent review must evaluate the actual trade-off.',
      whyNoFurtherEvidenceNeeded:'No adopted claim relies on the unmeasured arm being worse.',
      unverifiedClaims:['The large arm has not been measured.'],conditions:['Only this frozen scenario.'],
      reopenWhen:'The target mix or available roster budget changes.'},
    dataQuestions:[{...copy(actual.dataQuestions[0]),classification:'optional_probe',publicReason:'Not adopted; retain its unknown outcome.'}]};
  await check('Closure, essential fact, mixed operation and legacy replies are distinguished',()=>{
    assert.deepEqual(api.rosterComparisonClosureErrorsV1({contract,decision}),[]);
    assert.ok(api.rosterComparisonClosureErrorsV1({contract,decision:{...decision,dataQuestions:[{...decision.dataQuestions[0],classification:'necessary_fact'}]}}).length);
    assert.ok(api.rosterComparisonClosureErrorsV1({contract,decision:{...decision,nextInvestigation:{questionNumbers:[1]}}}).length);
    assert.ok(api.rosterComparisonClosureErrorsV1({contract:null,decision}).length);
    assert.deepEqual(api.rosterComparisonClosureErrorsV1({contract:null,decision:actual}),[]);
    assert.deepEqual(rosterStrategyProgressErrorsV1({contract:rosterStrategyProgressContractV1(assignment),decision}),[]);
    const continued={...copy(actual),nextInvestigation:{questionNumbers:[1],expectedNewObservation:'New feasible replacement arm'}};
    assert.deepEqual(rosterStrategyProgressErrorsV1({contract:rosterStrategyProgressContractV1(assignment),decision:continued}),[]);
    const old={...rosterStrategyProgressContractV1(assignment),version:1};
    assert.deepEqual(rosterStrategyProgressErrorsV1({contract:old,decision:actual}),[],'Do not re-interpret paid legacy replies');
    const omitted={...copy(decision),comparisonClosureRequest:{...copy(decision.comparisonClosureRequest),questionNumbers:[2]}};
    assert.ok(api.rosterComparisonClosureErrorsV1({contract,decision:omitted}).length);
    const mixed={...copy(decision),comparisonDesignRequest:{reason:'another simultaneous operation'}};
    assert.ok(api.rosterComparisonClosureErrorsV1({contract,decision:mixed}).length);
    assert.deepEqual(api.rosterComparisonClosureErrorsV1({contract,decision:{...copy(actual),comparisonClosureRequest:decision.comparisonClosureRequest,
      dataQuestions:decision.dataQuestions}}),[],'Plan-only factual correction can accompany an explicit closure request');
  });
  const memory=new Map(),saved=copy(state);saved.work=saved.work.map(w=>({...w,status:w.status==='running'?'needs_repair':w.status,
    operationState:w.operationState?{...w.operationState,pending:null}:null}));
  // Do not initialize old Native scenes in this isolated scheduling regression.
  saved.events=saved.events.filter(e=>saved.work.find(w=>w.id===e.workId)?.role!=='roster_workflow_tool');
  const store={load:async()=>copy(saved),save:async s=>{Object.assign(saved,copy(s));},
    put:async v=>{const {hashStarcraftTmgContract}=await import('../packages/authoritative-engine/referee-crypto-v1.mjs');const id=hashStarcraftTmgContract(v);memory.set(id,copy(v));return id;},
    get:async id=>memory.has(id)?copy(memory.get(id)):readArtifact(id)};
  const requestRef=await store.put({promptNodes:[contract]}),replyRef=await store.put({injected:true,decision});
  const resultRef=await store.put({kind:'proposal',value:{decisions:[decision],originalReplyRef:replyRef,
    comparisonClosureHandoff:api.projectRosterComparisonClosureHandoffV1({contract,decision,replyRef})}});
  const outcomeRef=await store.put({applied:false,status:'retain',acceptanceGranted:false,decision});
  const author={id:'injected-closure-v928',role:'roster_workflow_strategy_decision',status:'evidence_ready',inputs:{},
    bindings:copy(saved.scope),draftRevision:saved.draftRevision,resultRef,draftOutcomeRef:outcomeRef,
    operationState:{calls:[{requestRef,replyRef}],pending:null}};
  saved.work.push(author);saved.evidence.push({...copy(saved.evidence.find(e=>e.id.startsWith('role:'))),id:'role:'+author.id,
    artifactRef:resultRef,bindings:copy(saved.scope),kind:'proposal',title:'Injected closure request, not approval'});
  const cycle={id:purpose.strategyComparisonDesignCycleId,comparisonPurposeWorkId:purpose.id,
    comparisonPurposeResultRef:purpose.resultRef,comparisonPurposeReady:true,comparisonResolved:false,
    comparisonDesignRevision:purpose.designRevision,teacherWorkId:purpose.inputs.originalTeach.id.slice(5),comparisonExperimentId:purpose.id+':study'};
  const {createRosterDecisionWorkspaceRunV1}=await import('../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs');
  const openRun=()=>createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:saved.scope,sessionId:'closure-fixture-v928',
    laboratory:{labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',laboratoryId:'no-native',sourceStateHash:saved.scope.source,rulesRuntimeHash:saved.scope.rules}),describeQueryContext(){throw Error('NO_NATIVE');}},
    deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}});
  let run=await openRun();
  const {progressRosterProductComparisonV1,assessRosterProductHypothesisCycleV1}=await import('../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs');
  const draft=await store.get(saved.draftRef),beforeDraft=saved.draftRef,beforeArmy=saved.scope.army;
  let reviewId;
  if(closureOnly)reviewId=(await run.requestComparisonClosureReview({cycleId:cycle.id,authorWorkId:author.id})).scheduled[0];
  await check('Same public product schedules one independent closure review, no experiment/Plan edit',async()=>{
    const result=await progressRosterProductComparisonV1({run,state:copy(saved),draft,cycle,allowDecision:true});
    assert.equal(result.scheduled.length,1);reviewId=result.scheduled[0];
    const review=saved.work.find(w=>w.id===reviewId);assert.equal(review.comparisonClosureOf,author.id);
    assert.equal(review.role,'roster_workflow_final_review');assert.equal(saved.draftRef,beforeDraft);assert.equal(saved.scope.army,beforeArmy);
    assert.equal((await api.assessRosterComparisonClosureV1({state:saved,cycle,readArtifact:store.get})).accepted,false);
    assert.equal((await progressRosterProductComparisonV1({run,state:copy(saved),draft,cycle,allowDecision:true})).scheduled.length,0);
  });
  if(!reviewId)return;
  const review=saved.work.find(w=>w.id===reviewId);
  await check('Necessary missing fact blocks closure despite positive review labels',async()=>{
    review.status='evidence_ready';review.resultRef=await store.put({value:{checks:api.ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1.map(o=>({checkId:o.checkId,
      verdict:'supported',evidenceRefs:[{id:'tool:actual',artifactRef:'source'}],dataQuestions:[{question:'Unproved current path',classification:'necessary_fact'}]}))}});
    assert.equal((await api.assessRosterComparisonClosureV1({state:saved,cycle,readArtifact:store.get})).accepted,false);
    await assert.rejects(run.closeOptionalComparison({cycleId:cycle.id,authorWorkId:author.id,reviewId}),/CLOSURE_NOT_REVIEWED/);
  });
  await check('Reviewed optional closure retires only its goal; cold read preserves unknowns and does not replay',async()=>{
    review.status='evidence_ready';
    review.resultRef=await store.put({value:{checks:api.ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1.map(o=>({checkId:o.checkId,
      verdict:'conditional',conditions:['Only the injected frozen comparison.'],evidenceRefs:[{id:'tool:actual',artifactRef:'source'}],dataQuestions:[],publicReason:'Injected review only.'}))}});
    const ready=await api.assessRosterComparisonClosureV1({state:saved,cycle,readArtifact:store.get});assert.equal(ready.accepted,true);
    const pending=copy(saved);pending.work.find(w=>w.id===cycle.comparisonExperimentId).operationState={pending:{requestRef:'in-flight'}};
    assert.equal(await api.projectRosterComparisonClosureV1({state:pending,cycle,readArtifact:store.get}),null);
    // Review injection happened in the persisted fixture, not the live core's
    // private state. Re-open the real Run to exercise the advertised cold read.
    run=await openRun();
    const untouched=saved.work.filter(w=>!w.id.startsWith(cycle.comparisonExperimentId)).map(w=>[w.id,w.status]);
    const closed=await run.closeOptionalComparison({cycleId:cycle.id,authorWorkId:author.id,reviewId});
    assert.equal(closed.closed,true);assert.equal(closed.nativeQueryAutomaticallyResolved,false);
    assert.equal((await run.closeOptionalComparison({cycleId:cycle.id,authorWorkId:author.id,reviewId})).alreadyClosed,true);
    const assessed=await assessRosterProductHypothesisCycleV1({state:copy(saved),draft,readArtifact:store.get});
    assert.equal(assessed.comparisonResolved,true);assert.equal(assessed.comparisonResolutionKind,'reviewed_optional_retention');
    assert.equal(assessed.comparisonExperimentAccepted,false);assert.equal(assessed.strategyImprovementProven,false);
    assert.equal(assessed.ownerReturned,true);
    for(const [id,status]of untouched)assert.equal(saved.work.find(w=>w.id===id).status,status);
    assert.equal(saved.draftRef,beforeDraft);assert.equal(saved.scope.army,beforeArmy);
    const {createRosterWorkflowAcceptanceV1}=await import('../packages/roster-planning-workspace/roster-workflow-acceptance-v1.mjs');
    assert.throws(()=>createRosterWorkflowAcceptanceV1({workflowId:saved.workflowId,state:saved,draft,
      assessment:{readyForRelease:false,mechanicalBlockers:['Actual path remains unverified']},strategyCycle:assessed}),/NOT_READY_FOR_ACCEPTANCE/);
    const {projectRosterConditionalConclusionV1}=await import('../packages/roster-planning-workspace/roster-conditional-conclusion-v1.mjs');
    assert.equal(projectRosterConditionalConclusionV1({memory:{comparisonResolved:true,ownerReturned:true,
      comparisonResolutionKind:assessed.comparisonResolutionKind}}),null,'Closing an optional comparison is not measured Skill evidence');
    const changed=copy(saved);changed.scope.map='changed';
    assert.equal((await api.assessRosterComparisonClosureV1({state:changed,cycle,readArtifact:store.get})).accepted,false);
    assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  });
}
report.pass=report.errors.length===0;
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
