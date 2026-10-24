// Concrete failure: B's author can describe a changed comparison in Plan prose,
// but cannot hand that choice to the existing design author. Exercise the same
// product comparison scheduler with an explicit injected model operation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {resolveRosterWorkflowFrontierSettlementV1} from '../packages/roster-strategist/roster-workflow-frontier-settlement-v1.mjs';
import {rosterStrategyProgressErrorsV1} from '../packages/roster-strategist/roster-strategy-progress-contract-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const report={schema:'slice272_comparison_redesign_v925',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const original=await fs.readFile(directory+'/workflow.json','utf8'),saved=JSON.parse(original);
  const purpose=saved.work.findLast(w=>w.strategyComparisonDesignCycleId&&w.resultRef);
  assert.ok(purpose,'Actual B comparison design is present');
  const actual=JSON.parse(await fs.readFile(directory+'/artifacts/8c0584a26e65c4c93203daca69aa2817539becb1521c51da32f7cb79fcca4ac3.json','utf8'));
  assert.match(actual.value.decisions[0].publicReason,/revise the comparison/i);
  assert.equal(actual.value.decisions[0].mutation.unitsToUpsert.length,0);
  report.source={purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
    authorResultRef:'8c0584a26e65c4c93203daca69aa2817539becb1521c51da32f7cb79fcca4ac3',revision:saved.draftRevision};
  assert.ok(ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.providerSchema.properties.decisions.items.properties.comparisonDesignRequest,
    'B has no typed operation to send its proposed comparison change to the design author');
  const api=await import('../packages/roster-strategist/roster-comparison-redesign-v1.mjs');
  const cycle={id:purpose.strategyComparisonDesignCycleId,comparisonPurposeWorkId:purpose.id,
    comparisonPurposeResultRef:purpose.resultRef,comparisonDesignRevision:purpose.designRevision,
    teacherWorkId:purpose.inputs.originalTeach.id.slice(5),comparisonResolved:false,
    comparisonPurposeReady:true,comparisonPreflightAccepted:true,comparisonExperimentAccepted:false,
    comparisonExperimentId:purpose.id+':study'};
  const contract=api.rosterComparisonRedesignContractV1({role:'roster_workflow_strategy_decision',inputs:{
    strategicHypothesisChallenge:{value:{comparisonMemory:{cycleId:cycle.id,status:'awaiting_owner',comparisonResolved:false,
      design:{workId:purpose.id,resultRef:purpose.resultRef,revision:purpose.designRevision}}}}}});
  assert.ok(contract);
  const decision={disposition:'retain',publicReason:'Request a scoped redesign, not an approved conclusion.',
    evidenceNumbers:[862,866],dataQuestions:[{question:'Original large arm remains unmeasured',classification:'necessary_fact'}],
    requiredData:['Original large arm remains unmeasured'],requiredDecisions:[],
    nextInvestigation:null,workflowBlocker:null,mutation:null,strategicChanges:[],
    comparisonDesignRequest:{reason:'The measured configuration differs from the authorized one.',
      proposedChange:'Ask the designer to assess the smaller measured comparison with explicit limits.',
      decisionToEnable:'Choose whether the limited comparison can inform the retained unit role.',evidenceNumbers:[862,866]}};
  assert.deepEqual(api.rosterComparisonRedesignErrorsV1({contract,decision}),[]);
  const handoff=api.projectRosterComparisonDesignHandoffV1({contract,decision,replyRef:'injected-reply'});
  assert.equal(handoff.factApprovalGranted,false);assert.equal(handoff.designChanged,false);
  assert.deepEqual(rosterStrategyProgressErrorsV1({contract:{kind:'strategy_progress_contract',version:1,assignedQuestions:null},decision}),[]);
  assert.equal(await resolveRosterWorkflowFrontierSettlementV1({result:{value:{comparisonDesignHandoff:handoff}}}),null,
    'A redesign request cannot masquerade as settlement of the old frozen question');
  const state=copy(saved);state.work=state.work.map(w=>({...w,status:w.status==='running'?'evidence_ready':w.status,
    operationState:w.operationState?{...w.operationState,pending:null}:null}));
  const author={id:'injected-explicit-redesign',role:'roster_workflow_strategy_decision',status:'evidence_ready',
    bindings:copy(state.scope),draftRevision:state.draftRevision,resultRef:'injected-result',draftOutcomeRef:'injected-outcome',
    operationState:{pending:null,calls:[{requestRef:'injected-request',replyRef:'injected-reply'}]}};
  state.work.push(author);
  const artifacts=new Map([
    ['injected-result',{kind:'proposal',value:{decisions:[decision],originalReplyRef:'injected-reply',comparisonDesignHandoff:handoff}}],
    ['injected-outcome',{applied:false,status:'retain',acceptanceGranted:false}],
    ['injected-request',{promptNodes:[contract]}],
  ]);
  const readArtifact=async ref=>artifacts.has(ref)?copy(artifacts.get(ref)):
    JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
  const request=await api.resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact});
  assert.equal(request.authorWorkId,author.id);assert.equal(request.designRevision,purpose.designRevision+1);
  const scheduled=[];const run={readArtifact,requestStrategicComparisonDesign:async args=>scheduled.push(args)};
  const progress=await progressRosterProductComparisonV1({run,state,draft:{revision:state.draftRevision},cycle,allowDecision:true});
  assert.equal(scheduled.length,1);assert.equal(scheduled[0].authorWorkId,author.id);
  assert.equal(scheduled[0].previousPurposeWorkId,purpose.id);assert.equal(progress.scheduled[0],scheduled[0].id);
  const withScheduled=copy(state);withScheduled.work.push({id:scheduled[0].id,comparisonRedesignOf:author.id});
  assert.equal(await api.resolveRosterComparisonDesignRequestV1({state:withScheduled,cycle,readArtifact}),null);
  const stale=copy(state);stale.scope.map='different-map';
  assert.equal(await api.resolveRosterComparisonDesignRequestV1({state:stale,cycle,readArtifact}),null);
  const pending=copy(state);pending.work.at(-1).operationState.pending={requestRef:'pending'};
  assert.equal(await api.resolveRosterComparisonDesignRequestV1({state:pending,cycle,readArtifact}),null);
  const mismatch={...cycle,comparisonPurposeResultRef:'other-purpose'};
  assert.equal(await api.resolveRosterComparisonDesignRequestV1({state,cycle:mismatch,readArtifact}),null);
  artifacts.set('injected-request',{promptNodes:[]});
  assert.equal(await api.resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact}),null);
  artifacts.set('injected-request',{promptNodes:[contract]});
  artifacts.set('injected-result',actual);
  assert.equal(await api.resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact}),null,
    'Historical Plan prose must not be reinterpreted as a new control operation');
  for(const changed of [{...decision,nextInvestigation:{}},{...decision,disposition:'revise',mutation:{}},
    {...decision,comparisonDesignRequest:{...decision.comparisonDesignRequest,evidenceNumbers:[999999]}}])
    assert.ok(api.rosterComparisonRedesignErrorsV1({contract,decision:changed}).length);
  assert.ok(api.rosterComparisonRedesignErrorsV1({contract:null,decision}).length);
  assert.deepEqual(api.rosterComparisonRedesignErrorsV1({contract:null,decision:{disposition:'retain'}}),[]);
  assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  report.checked=['actual failed B scope request','typed author operation','same product scheduling',
    'one design dispatch without Plan/Native mutation','duplicate/stale/pending/wrong-purpose/undelivered refusal',
    'mixed-operation and citation refusal','old reply unchanged','production state unchanged'];
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
