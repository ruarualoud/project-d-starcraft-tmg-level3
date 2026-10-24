// Typed handoff from completed Teach to the actual owner of a change. This
// module grants no acceptance and mutates neither army, Plan nor saved evidence.
import {rosterPublicClaimTextEntriesV1} from './roster-public-claim-paths-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const clone = value => structuredClone(value);
const fail = (code, detail='') => {throw Object.assign(new Error(`${code}:${typeof detail==='string'?detail:JSON.stringify(detail)}`),{code,detail});};
const routes = ['plan_revision','roster_plan_revision','investigate','engineering_gap','keep'];
const str = {type:'string',minLength:1,maxLength:65536};
const arr = items => ({type:'array',minItems:0,items});
const obj = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const ROSTER_TEACH_REVISION_WORK_ORDER_SCHEMA_V1 = obj({
  publicReason:str,
  questionWork:arr(obj({questionId:str,route:{...str,enum:routes},claimPaths:arr(str),publicReason:str})),
});
// The model selects small host-bound identifiers; it never writes machine paths.
// No >64-item enum is needed, and unknown numbers remain a precise contract error.
export const ROSTER_TEACH_REVISION_WORK_ORDER_CHOICE_SCHEMA_V2 = obj({
  publicReason:str,
  questionWork:arr(obj({questionNumber:{type:'integer',minimum:1,maximum:1000000},
    route:{...str,enum:routes},claimNumbers:arr({type:'integer',minimum:1,maximum:1000000}),publicReason:str})),
});
export function projectRosterTeachRevisionChoicesV2(request) {
  return {kind:'teach_revision_choice_assignment_v2',rosterEditAuthority:request.rosterEditAuthority,
    claims:Object.entries(request.claimTexts).map(([path,value],index)=>({number:index+1,path,
      text:typeof value==='string'?value:value.publicPurposeText})),
    questions:request.questions.map(({questionId,...question},index)=>({number:index+1,...clone(question)})),
    proposals:clone(request.proposals),scope:request.scope,acceptanceGranted:false};
}
export function decodeRosterTeachRevisionChoicesV2(request,output) {
  const paths=Object.keys(request.claimTexts);
  const pick=(number,rows,kind)=>{
    if(!Number.isSafeInteger(number)||number<1||number>rows.length)
      fail('ROSTER_TEACH_WORK_ORDER_CHOICE_INVALID',{kind,number,validNumbers:{minimum:1,maximum:rows.length}});
    return rows[number-1];
  };
  return {publicReason:output.publicReason,questionWork:output.questionWork.map(work=>({
    questionId:pick(work.questionNumber,request.questions,'question').questionId,
    route:work.route,claimPaths:work.claimNumbers.map(number=>pick(number,paths,'claim')),publicReason:work.publicReason}))};
}

export function prepareRosterTeachRevisionWorkOrderV1({plan,state,rosterEditAuthority}) {
  if (!plan?.planHash || !['preset_immutable','agent_may_reselect_after_evidence'].includes(rosterEditAuthority))
    fail('ROSTER_TEACH_WORK_ORDER_SOURCE_INVALID');
  const sourceWorkHash=hash({planHash:plan.planHash,rosterEditAuthority,
    agenda:state.agenda||null,synthesis:state.synthesis||null,coverage:state.coverage||null});
  if (state.revisionWorkOrder?.sourcePlanHash===plan.planHash
    && state.revisionWorkOrder.sourceWorkHash===sourceWorkHash
    && state.revisionWorkOrder.status==='proposed_not_applied') return null;
  const answers=state.synthesis?.answers || [];
  const questions=state.agenda?.questions || [];
  const ids=[...new Set([...questions.map(q=>q.questionId),...answers.map(a=>a.questionId)])];
  const unresolved = new Set((state.coverage || []).flatMap(c=>c.unresolvedQuestionIds || []));
  const claimTexts=Object.fromEntries([
    ...rosterPublicClaimTextEntriesV1(plan),
    ...(plan.componentPurposes || []).map(row=>[`componentPurposes.${row.instanceId}`,clone(row)]),
  ]);
  return {
    kind:'teach_revision_work_assignment',sourcePlanHash:plan.planHash,sourceWorkHash,rosterEditAuthority,
    claimTexts,
    questions:ids.map(questionId=>{
      const question=questions.find(q=>q.questionId===questionId);
      const answer=answers.find(a=>a.questionId===questionId);
      return {questionId,question:clone(question || null),answer:clone(answer || null),
        unresolved:unresolved.has(questionId)||!answer||answer.disposition==='unresolved'};
    }),
    proposals:{plan:clone(state.synthesis?.proposedPlanChanges || []),roster:clone(state.synthesis?.proposedRosterChanges || [])},
    scope:'Route completed Teach proposals only. Claim text is Plan intent, not Rules truth. This compact projection does not assert that omitted evidence is missing. Existing questions and their uncertainty remain authoritative until actual work and review.',
    acceptanceGranted:false,
  };
}

export function buildRosterTeachRevisionWorkOrderV1(request,output) {
  if (!request || typeof output?.publicReason!=='string'||!output.publicReason.trim()
    ||!Array.isArray(output.questionWork)) fail('ROSTER_TEACH_WORK_ORDER_INVALID','publicReason/questionWork');
  const required = new Map(request.questions.map(q=>[q.questionId,q]));
  const seen=new Set();
  for (const work of output.questionWork) {
    const q=required.get(work.questionId);
    if (!q||seen.has(work.questionId)) fail('ROSTER_TEACH_WORK_ORDER_QUESTION_INVALID',work.questionId);
    seen.add(work.questionId);
    if (!routes.includes(work.route)||!work.publicReason?.trim()||!Array.isArray(work.claimPaths))
      fail('ROSTER_TEACH_WORK_ORDER_SCOPE_INVALID',{questionId:work.questionId,route:work.route,required:'known route, nonempty publicReason, claimPaths array'});
    if (new Set(work.claimPaths).size!==work.claimPaths.length
      ||work.claimPaths.some(path=>!Object.hasOwn(request.claimTexts,path)))
      fail('ROSTER_TEACH_WORK_ORDER_SCOPE_INVALID',{questionId:work.questionId,
        invalidPaths:work.claimPaths.filter(path=>!Object.hasOwn(request.claimTexts,path)),
        duplicatedPaths:work.claimPaths.filter((path,index)=>work.claimPaths.indexOf(path)!==index),
        instruction:'Select only exact host-bound claim numbers from the assignment; never append a property to a claim address.'});
    if (work.route==='plan_revision'&&!work.claimPaths.length)
      fail('ROSTER_TEACH_WORK_ORDER_SCOPE_REQUIRED',work.questionId);
    if (work.route==='roster_plan_revision'&&request.rosterEditAuthority==='preset_immutable')
      fail('ROSTER_TEACH_WORK_ORDER_PRESET_IMMUTABLE',work.questionId);
    if (work.route==='keep'&&q.unresolved) fail('ROSTER_TEACH_WORK_ORDER_UNKNOWN_NOT_RESOLVED',work.questionId);
  }
  if (seen.size!==required.size) fail('ROSTER_TEACH_WORK_ORDER_COVERAGE_MISSING',
    [...required.keys()].filter(id=>!seen.has(id)).join(','));
  return {
    schema:'roster_teach_revision_work_order_v1',sourcePlanHash:request.sourcePlanHash,sourceWorkHash:request.sourceWorkHash,
    status:'proposed_not_applied',rosterEditAuthority:request.rosterEditAuthority,
    publicReason:output.publicReason,questionWork:clone(output.questionWork),
    planClaimPaths:[...new Set(output.questionWork.filter(w=>w.route==='plan_revision').flatMap(w=>w.claimPaths))],
    rosterDecisionRequired:output.questionWork.some(w=>w.route==='roster_plan_revision'),
    investigationQuestionIds:output.questionWork.filter(w=>w.route==='investigate').map(w=>w.questionId),
    engineeringQuestionIds:output.questionWork.filter(w=>w.route==='engineering_gap').map(w=>w.questionId),
    unresolvedQuestionIds:request.questions.filter(q=>q.unresolved).map(q=>q.questionId),
    acceptanceGranted:false,
  };
}
