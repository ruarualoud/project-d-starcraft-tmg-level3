// e6049: the owner repeats the entire rejected reply verbatim, despite a real
// typed role handoff. Exercise a model-command wire, not Host-selected strategy.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const started=performance.now();
const request=await get('42e7180a626e95a0e0a5c6ea2a3d6dff906bc185415b257caf7221813e2705bd');
const reply=await get('39c7a24c0912f3c383b37f0ecd2ef248c409786b2ae122ac4cf20a8e2a043965');
const original=JSON.stringify(reply),prepared=prepareRosterStrategyRepairRequestV1(request);
assert.ok(prepared.responseFormat.schema.properties.action.enum.includes('decide'),
  'verbatim owner replay must use explicit next-operation and numbered question updates, not the old full envelope');
const feedback=prepared.promptNodes.find(n=>n.kind==='local_contract_feedback');
assert.equal(feedback.originalOutput,undefined,'rejected full answer belongs to Host projection state, not inline correction template');
assert.deepEqual(prepared.strategyRepairState.originalOutput,reply.output);
const wire={action:'decide',publicReason:'Fixture: explicit selected operation; not a production strategic conclusion.',
  reads:[],catalogueQueries:[],questionUpdates:[],newQuestions:[],
  decision:Object.fromEntries(Object.entries(reply.output.decisions[0]).filter(([key])=>key!=='dataQuestions'))};
const projected=projectRosterStrategyRepairOutputV1({request:prepared,output:wire});
assert.deepEqual(projected.errors,[]);
assert.deepEqual(projected.output.decisions,reply.output.decisions,'even an unmodified selected action must remain subject to the original semantic gate');
assert.equal(validate(request.responseFormat.schema,projected.output).ok,true);
const changed=structuredClone(wire);
changed.questionUpdates=[{questionNumber:3,classification:'answered_fact',publicReason:'Fixture: current spend is 1490, not 2000.',evidenceNumbers:[524]}];
changed.newQuestions=[{question:'Fixture new necessary premise',classification:'necessary_fact',publicReason:'Not yet measured.',evidenceNumbers:[524]}];
changed.decision.nextInvestigation.questionNumbers=[9];
const patched=projectRosterStrategyRepairOutputV1({request:prepared,output:changed});
assert.deepEqual(patched.errors,[]);
assert.equal(patched.output.decisions[0].dataQuestions.length,9);
assert.equal(patched.output.decisions[0].dataQuestions[2].classification,'answered_fact');
assert.deepEqual(patched.output.decisions[0].dataQuestions[4],reply.output.decisions[0].dataQuestions[4]);
assert.deepEqual(patched.output.decisions[0].nextInvestigation.questionNumbers,[9]);
assert.equal(JSON.stringify(reply),original);
for(const bad of [reply.output,{...wire,decision:null},{...wire,action:'read'},
  {...wire,questionUpdates:[changed.questionUpdates[0],changed.questionUpdates[0]]},
  {...wire,newQuestions:[reply.output.decisions[0].dataQuestions[0]]}])
  assert.ok(projectRosterStrategyRepairOutputV1({request:prepared,output:bad}).errors.length);
const edit=structuredClone(wire),mutationSchema=request.responseFormat.schema.properties.decisions.items.properties.mutation;
const props=mutationSchema.anyOf.find(s=>s.type==='object').properties;
const mutation=Object.fromEntries(Object.entries(props).map(([key,s])=>[key,s.type==='array'?[]:null]));
mutation.plan=Object.fromEntries(Object.keys(props.plan.properties).map(key=>[key,null]));
mutation.plan.publicSummaryText='Fixture: selected roster and plan premise updated together; not production evidence.';
mutation.rosterCandidateSelection={sourceEvidenceNumber:471};
edit.decision={...edit.decision,disposition:'revise',mutation,nextInvestigation:null,
  strategicChanges:[{intentPath:'/candidateInput',beforeIntent:'Fixture partial candidate',afterIntent:'Fixture model-selected exact source candidate',decisionConsequence:'Fixture: use the same Builder validation path.'}]};
const selected=projectRosterStrategyRepairOutputV1({request:prepared,output:edit});
assert.deepEqual(selected.errors,[]);
assert.deepEqual(selected.output.decisions[0].mutation,mutation,'the command must support actual joint-edit arguments, not only retain/investigate');
const provider=JSON.parse(encodeRosterProviderInputV1(prepared).input);
assert.equal(provider.strategyRepairState,undefined);
assert.equal(provider.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput,undefined);
assert.ok(prepared.promptNodes.find(n=>n.kind==='strategy_semantic_repair').questions.length===8);
assert.match(projectRosterProviderInstructionsV1({request:prepared}),/AUTHOR DECISION COMMAND/);
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=state.work.find(w=>w.status==='needs_repair'&&w.operationState?.correction?.originalReplyRef==='39c7a24c0912f3c383b37f0ecd2ef248c409786b2ae122ac4cf20a8e2a043965');
assert.ok(stopped);
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request});
assert.equal(recovery?.repairKind,'author_decision_command');
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request:prepared}),null);
const first=await get(stopped.operationState.calls[0].requestRef),delivered=first.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const memory=new Map(),draftRef=state.draftRef;let captured,calls=0;
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v803-owner-command-fixture',
  deliberation:{deliberate:async q=>{calls++;captured=q;return {output:wire,receipt:{fixture:true}};}}});
const graph=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>execute({...assignment,inputs:structuredClone(delivered)},control)});
await graph.dispatch({type:'resume_role_correction',workId:stopped.id,reason:'isolated concrete owner-command reproduction'});
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
assert.equal(calls,1);
assert.ok(captured.responseFormat.schema.properties.action.enum.includes('decide'));
assert.ok(state.work.find(w=>w.id===stopped.id).operationState.correction.errors.some(e=>e.code==='unchanged_investigation_authorization'));
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);
console.log(JSON.stringify({pass:true,modelOwnedEdits:true,ledgerPreserved:true,explicitReadOrDecision:true,
  originalSemanticGateStillRejects:true,sharedExecutor:true,noProjectionStateInProviderInput:true,realProviderCalls:0,
  nativeCalls:0,productionWrites:0,elapsedMs:Math.round(performance.now()-started)}));
