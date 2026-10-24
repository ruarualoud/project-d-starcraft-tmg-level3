// Actual1171 revised eight Plan sections to add a Native snapshot, leaving
// strategic intent/army unchanged. There was no separate fact-record operation.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1,createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const paidBytes=await fs.readFile(path.join(run,'1171.reply.json'),'utf8'),paid=JSON.parse(paidBytes);
const request=JSON.parse(await fs.readFile(path.join(run,'1171.request.json'),'utf8')).request;
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const prior=state.work.find(w=>w.id===assignment.workId),memory=new Map();
const contract=ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1;
assert(contract.providerSchema.properties.decisions.items.properties.disposition.enum.includes('record_facts'),
  'BUG: fact observations have no explicit non-revision operation and are being committed as strategy changes');
assert(contract.providerSchema.properties.decisions.items.properties.strategicChanges);
const records=await import('../packages/roster-strategist/roster-workflow-decision-records-v1.mjs');
const store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const input={...assignment,evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
const replay=async output=>{
  const ref=await store.put({...paid,output}),operation=structuredClone(prior.operationState);
  operation.revalidateReplyRef=ref;operation.consecutiveCorrections=0;operation.correctionLimit=3;operation.pending=null;operation.correction=null;
  return createRosterWorkflowReadRoleExecutorV1({sessionId:'isolated-v629',store,
    deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}}})(input,
    {operationState:operation,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
};
const old=await replay(paid.output);assert.equal(old.value.status,'needs_local_correction','no automatic declaration of intent for an old paid reply');
// Protocol fixtures, not real model output or a retrospective rewrite of1171.
const record=structuredClone(paid.output);Object.assign(record.decisions[0],{disposition:'record_facts',strategicChanges:[],mutation:null,
  requiredData:['Necessary per-unit path feasibility is still unresolved.']});
const accepted=await replay(record);assert.equal(accepted.value.decisions[0].disposition,'record_facts');
assert.deepEqual(accepted.value.decisions[0].requiredData,record.decisions[0].requiredData);
const mixed=structuredClone(record);mixed.decisions[0].mutation=paid.output.decisions[0].mutation;
assert.equal((await replay(mixed)).value.status,'needs_local_correction');
const emptyRevision=structuredClone(paid.output);emptyRevision.decisions[0].strategicChanges=[];
const rejected=await replay(emptyRevision);assert.equal(rejected.value.status,'needs_local_correction');
assert(rejected.value.errors.some(e=>e.code==='strategy_revision_requires_intent_delta'));
const outcome=records.createRosterWorkflowNonRevisionOutcomeV1(accepted.value.decisions[0]);
assert.equal(outcome.status,'retain');assert.equal(outcome.evidenceRecorded,true);assert.equal(outcome.applied,false);
assert.equal(outcome.draftUnchanged,true);assert.deepEqual(outcome.decision.requiredData,record.decisions[0].requiredData);
assert(outcome.evidenceLedgerEntry.evidenceRefs.length>0);
let isolated={...state,work:[{...prior,status:'evidence_ready',draftOutcomeRef:null}],events:[],reads:[]};
const draftBefore=isolated.draftRef,revisionBefore=isolated.draftRevision;
const workflow=await createRosterDecisionWorkflowV1({store:{...store,load:async()=>isolated,save:async v=>{isolated=structuredClone(v);}},
  execute:async()=>{throw Error('UNEXPECTED_EXECUTION');}});
await workflow.dispatch({type:'record_draft_outcome',workId:prior.id,outcome});
const after=await workflow.inspect();assert.equal(after.draftRef,draftBefore);assert.equal(after.draftRevision,revisionBefore);
const publication=await records.publishRosterWorkflowDecisionEvidenceV1({work:{...after.work[0],status:'superseded'},outcome,evidence:after.evidence,dispatch:workflow.dispatch});
assert.equal(publication.published,true);
const evidence=await workflow.dispatch({type:'read_evidence',consumer:'isolated-v629',evidenceId:publication.evidenceId,pointer:''});
assert.equal(evidence.status,'read');assert.deepEqual(evidence.value.record,outcome.evidenceLedgerEntry);
assert.deepEqual(evidence.value.origin.bindings,prior.bindings);assert.equal(evidence.value.historyNavigationOnly,true);
assert.equal(evidence.value.currentApplicability,'not_assessed');
const refreshed=await workflow.inspect();assert.equal(refreshed.draftRef,draftBefore);assert.equal(refreshed.draftRevision,revisionBefore);
assert.equal((await records.publishRosterWorkflowDecisionEvidenceV1({work:refreshed.work[0],outcome,evidence:refreshed.evidence,dispatch:workflow.dispatch})).published,false);
assert(after.work[0].draftOutcomeRef);assert.equal(await fs.readFile(path.join(run,'1171.reply.json'),'utf8'),paidBytes);
console.log(JSON.stringify({passed:true,explicitFactRecordWithoutPlanRevision:true,unknownsAndSourcesRetained:true,
  evidenceLedgerStoredThroughProduct:true,emptyStrategyDeltaRejected:true,oldPaidOutputNotAutoClassified:true,
  strategyQualityNotProven:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
