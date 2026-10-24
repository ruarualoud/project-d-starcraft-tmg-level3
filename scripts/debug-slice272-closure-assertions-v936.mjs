// Reproduce H-CLOSURE-FALSE-POSITIVE-V935 against the real core acceptance seam.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {assessRosterComparisonClosureV1} from '../packages/roster-strategist/roster-comparison-closure-v1.mjs';
import {compileRosterComparisonPremisesV1,assessRosterComparisonPremisesV1} from '../packages/roster-strategist/roster-comparison-premises-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory,output]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const readArtifact=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const review=state.work.find(w=>w.resultRef==='47091c7bfa15d14fade12241c5183b9756ba4d67453e016d61a6e4fa48e6f5b7');
assert(review,'Captured false-positive review must exist');
const scope=review.inputs.closureScope.value;
const cycle={id:scope.cycleId,comparisonPurposeWorkId:scope.purposeWorkId,comparisonPurposeResultRef:scope.purposeResultRef};
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
await check('actual_supported_labels_do_not_prove_decision_premises',async()=>{
  const result=await assessRosterComparisonClosureV1({state,cycle,readArtifact});
  assert(result.request,'Use the actual resolved author request, not a missing-request rejection');
  assert.equal(result.accepted,false,'Original review missed the opposite threshold interpretation; supported labels alone must not authorize closure');
});
const contract=await compileRosterComparisonPremisesV1({state,request:scope,readArtifact});
const aggregate=(await readArtifact(review.resultRef)).value.checks;
const bad=contract.premises.find(p=>p.text.includes('fails to clear the declared threshold'));
assert(bad,'Preserve and individually audit the actual false reason');
function auditFor(c){return {version:1,rows:c.premises.map(p=>({premiseId:p.premiseId,verdict:'supported',publicReason:'Injected semantic judgment, not a real model review.',evidenceNumbers:[],numericAssertions:[]})),
  tradeoff:{verdict:'supported',retainedComponentQuotes:[c.premises[0].text],foregoneBenefitQuotes:[c.premises[1].text],publicReason:'Injected tradeoff judgment.'}};}
await check('opposite_threshold_is_blocked_even_with_supported_labels',async()=>{
  const audit=auditFor(contract),row=audit.rows.find(r=>r.premiseId===bad.premiseId);
  row.evidenceNumbers=[866];row.numericAssertions=[{comparisonKey:'e866:reverseQuery',claimedSatisfied:false}];
  const result=assessRosterComparisonPremisesV1({contract,audit,checks:aggregate});
  assert.equal(result.accepted,false);assert(result.errors.some(e=>e.code==='comparison_premise_numeric_contradiction'));
  row.verdict='requires_revision';
  const rejected=assessRosterComparisonPremisesV1({contract,audit,checks:aggregate.map(c=>({...c,verdict:'requires_revision'}))});
  assert.equal(rejected.accepted,false);assert.equal(rejected.errors.length,0,'Correct rejection is author feedback, not another reviewer-format failure');
});
await check('correct_retention_acknowledges_gain_without_forcing_swap',async()=>{
  const request=structuredClone(scope);
  request.request={...request.request,selectedOption:'Keep goliath-1.',declinedAlternative:'Forgo the measured small marauder-2 damage advantage.',
    decisionBasis:'Preserve goliath-1 ranged coverage; forgo the measured small marauder-2 advantage as a strategic tradeoff, not a failed threshold.',
    whyNoFurtherEvidenceNeeded:'The measured small marauder-2 exceeds the damage threshold; that isolated gain does not establish overall superiority.'};
  request.questions=[];
  const c=await compileRosterComparisonPremisesV1({state,request,readArtifact}),audit=auditFor(c);
  const row=audit.rows.find(r=>r.premiseId.startsWith('/request/whyNoFurtherEvidenceNeeded'));
  row.evidenceNumbers=[866];row.numericAssertions=[{comparisonKey:'e866:reverseQuery',claimedSatisfied:true}];
  assert.equal(assessRosterComparisonPremisesV1({contract:c,audit,checks:aggregate}).accepted,true);
  audit.tradeoff.retainedComponentQuotes=['Invented removal of medic-3'];
  assert(assessRosterComparisonPremisesV1({contract:c,audit,checks:aggregate}).errors.some(e=>e.code==='comparison_tradeoff_quote_not_authored'));
});
await check('coverage_wrong_direction_and_unknown_sources_do_not_pass',async()=>{
  const audit=auditFor(contract);audit.rows.pop();
  assert.equal(assessRosterComparisonPremisesV1({contract,audit,checks:aggregate}).accepted,false);
  const a=auditFor(contract);a.rows[0].numericAssertions=[{comparisonKey:'invented:reverseQuery',claimedSatisfied:true}];
  assert(assessRosterComparisonPremisesV1({contract,audit:a,checks:aggregate}).errors.some(e=>e.code==='comparison_premise_source_invalid'));
  const c=structuredClone(contract);c.comparisons.forEach(x=>x.sourceCurrent=false);
  a.rows[0].numericAssertions=[{comparisonKey:'e866:reverseQuery',claimedSatisfied:true}];a.rows[0].evidenceNumbers=[866];
  assert(assessRosterComparisonPremisesV1({contract:c,audit:a,checks:aggregate}).errors.some(e=>e.code==='comparison_premise_source_invalid'));
});
await check('real_role_delivers_exact_author_premises_and_structured_reply',async()=>{
  const assignment=await readArtifact(review.inputRef),before=JSON.stringify(assignment),memory=new Map();let captured;
  const store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):readArtifact(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
  const stop=Error('capture_only');
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v936-test',deliberation:{deliberate:async request=>{captured=request;throw stop;}}});
  try{await execute(structuredClone(assignment),{checkpointOperation:async()=>{},publishContext:async()=>assert.fail('Unexpected context write'),readEvidence:async()=>assert.fail('No paid reply or reads')});}catch(e){if(e!==stop)throw e;}
  assert(captured);const sent=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.comparisonPremises.value;
  assert.deepEqual(sent.premises,contract.premises);assert(sent.premises.some(p=>p.text===bad.text));
  assert(captured.responseFormat.schema.properties.premiseAudit);assert(captured.userMessage.includes('claimedSatisfied'));
  assert.equal(JSON.stringify(assignment),before);
});
await check('one_repair_preserves_three_old_reviews_and_returns_to_author',async()=>{
  const draft=await readArtifact(state.draftRef),current=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact});
  assert.equal(current.comparisonResolved,false);assert.equal(current.comparisonClosureReviewCount,3);
  assert.equal(current.comparisonPremiseRepairRequired,true);assert.equal(current.comparisonStopped,false);
  let requested;const run={readArtifact,requestDecision:async value=>{requested=value;}};
  await progressRosterProductComparisonV1({run,state,draft,cycle:current,allowDecision:true});
  assert(requested?.inputs?.comparisonPremiseRepair);assert.equal(requested.inputs.comparisonPremiseRepair.value.additionalReviewLimit,1);
  const s=structuredClone(state);s.work.push({id:requested.id,inputs:requested.inputs,status:'evidence_ready'});
  s.work.push({...structuredClone(review),id:review.id+':injected-fourth-review'});
  const stopped=await assessRosterProductHypothesisCycleV1({state:s,draft,readArtifact});
  assert.equal(stopped.comparisonClosureReviewCount,4);assert.equal(stopped.comparisonStopped,true);
  assert.equal(stopped.comparisonPremiseRepairRequired,false,'The same contract repair cannot renew itself');
});
const report={pass:checks.every(c=>c.pass),checks,providerCalls:0,nativeCalls:0,productionWrites:0};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
