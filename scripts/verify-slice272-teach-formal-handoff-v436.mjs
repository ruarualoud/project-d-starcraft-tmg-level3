import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1,hasAcceptedCurrentRosterTeachV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
import {rosterTeachIssueLedgerV1} from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
import {rosterPublicClaimTextEntriesV1} from '../packages/roster-strategist/roster-public-claim-paths-v1.mjs';
import {createRosterPlanEditToolsV1,STRUCTURED_PLAN_TOOLS_PROTOCOL_V2} from '../packages/roster-strategist/roster-plan-edit-tools-v1.mjs';
const [stateFile,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const formal=JSON.parse(await fs.readFile(formalFile,'utf8'));
const plan=JSON.parse(formal.planSerialized), fw=formal.teachFramework;
const teach={...Object.fromEntries(['sessionId','status','planningMode','setup','agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview'].map(k=>[k,formal[k]])),plan,
 teachFramework:{status:fw.status,planHash:fw.planHash,investigationCompleted:fw.state.investigation.completed,
  factProbeContinuation:fw.state.investigation.factProbeContinuation,issueLedger:rosterTeachIssueLedgerV1(fw)}};
const paths=[...rosterPublicClaimTextEntriesV1(plan).map(([p])=>p),...plan.componentPurposes.map(p=>`componentPurposes.${p.instanceId}`)];
assert(paths.length>64); // The real Plan cannot be repaired via the old arbitrary 64-path cap.
assert.equal(teach.teachFramework.issueLedger.questions.filter(q=>q.status==='unresolved').length,2);
assert(teach.teachFramework.issueLedger.questions.some(q=>q.status==='revision_proposed'));
async function route({pending=false,applied=false}={}) {
 const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan','openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion','selectionJustificationPolicyVersion','teachFeedback','teachFeedbackHistory'].map(k=>[k,saved[k]])),status:'active',blockingFinding:null,iterations:[],observations:[],pendingDecision:pending?saved.pendingDecision:null};
 const view=structuredClone(teach), calls=[];
 if(applied){view.teachFramework.planHash='a'.repeat(64);view.teachFramework.appliedToPlanHash=view.plan.planHash;
  view.teachFramework.applicationStatus='evidence_delivered_to_revision_pending_review';}
 const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],read:async()=>structuredClone(state),
  releaseUnsentDecision:async()=>{assert(pending);calls.push('release_proven_unsent');state.pendingDecision=null;return structuredClone(state);},
  resume:async()=>{calls.push('wrong_provisional_selector');throw Error('CAPTURED_WRONG_OWNER');},
  attachTeachFeedback:async()=>{calls.push('wrong_provisional_feedback');throw Error('CAPTURED_WRONG_OWNER');}},
 workspaceService:{createAgentSelectedTeachSession(){throw Error('DO_NOT_REBUILD');},listSessions:async()=>({sessions:[view]}),readSession:()=>structuredClone(view),
  reviewFinalPlan(){throw Error('DO_NOT_RERUN_COMPLETED_SOURCE_REVIEW');},
  teachPlanFramework:async()=>{calls.push('recheck_changed_plan');throw Error('CAPTURED_RECHECK');},
  revisePlan:async(id,request)=>{calls.push('formal_plan_tools');assert.equal(id,view.sessionId);
   assert.equal(request.revisionPurpose,'teach_feedback_revision_v1');assert.deepEqual(new Set(request.targetedClaimPaths),new Set(paths));
   assert.equal(request.sourceTeachPlanHash,view.plan.planHash);throw Error('CAPTURED_CORRECT_OWNER');}},
 promoteTeachPlan(){throw Error('DO_NOT_REPROMOTE');}});
 await journey.run(state.sessionId);
 for(let i=0;i<30&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
 const result=await journey.read(state.sessionId);
 assert.equal(result.stoppedReason,applied?'CAPTURED_RECHECK':'CAPTURED_CORRECT_OWNER',`wrong owner: ${calls}`);
 assert.deepEqual(calls,[...(pending?['release_proven_unsent']:[]),applied?'recheck_changed_plan':'formal_plan_tools']);
 if(applied) assert.equal(hasAcceptedCurrentRosterTeachV1({...state,teachFeedback:{...state.teachFeedback,disposition:'accepted',acceptanceBlocked:false,taughtPlan:view.plan}},view),false);
}
if(!process.argv.includes('--tools-only')) {
 if(!process.argv.includes('--remaining')){await route();await route({pending:true});}
 await route({applied:true});
}
// The new formal lane must preserve valid original fields byte-for-byte and reject fabricated paths.
const currentClaimTexts=Object.fromEntries([...rosterPublicClaimTextEntriesV1(plan),...plan.componentPurposes.map(p=>[`componentPurposes.${p.instanceId}`,p.publicPurposeText])]);
const tools=createRosterPlanEditToolsV1({plan,paths,factPacket:{},protocol:STRUCTURED_PLAN_TOOLS_PROTOCOL_V2,currentClaimTexts});
assert(tools.descriptor().tools.some(t=>t.name==='plan.retain_argument'));
assert.equal(tools.outputContract({allowEvidenceReads:true}).contract.providerSchema.properties.retainedCalls.items.properties.name.enum[0],'plan.retain_argument');
assert.equal(tools.callTool({name:'plan.retain_argument',arguments:{claimPath:'fake',reasonText:'unchanged'}}).isError,true);
for(const p of paths)assert.equal(tools.callTool({name:'plan.retain_argument',arguments:{claimPath:p,reasonText:'The existing conditional argument remains supported; no claim of new verification.'}}).isError,false);
const snapshot=tools.snapshot();assert.equal(snapshot.missingClaimPaths.length,0);
for(const repair of snapshot.repairs)assert.equal(repair.replacementText,currentClaimTexts[repair.claimPath]);
assert.equal(snapshot.applied,false);
console.log(JSON.stringify({pass:true,paths:paths.length,routesThisRun:process.argv.includes('--tools-only')?0:process.argv.includes('--remaining')?1:3,unknownsRetained:2,originalFieldsPreserved:true,providerCalls:0,mutatedStoredState:false}));
