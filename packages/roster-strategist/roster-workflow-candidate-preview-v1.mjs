import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const clone=structuredClone;
// Facts from the SAME Native audit used to commit. No strategy ranking.
export function createRosterWorkflowCandidatePreviewV1({work,draft,draftRef,decision,transition,beforeVerdict,resolvedRosterBranch}){
 if(!transition?.applied||!transition.receipt.armyChanged||draft.mode==='fixed'||resolvedRosterBranch)return null;
 const delivered=work.inputs?.candidatePreview?.value;
 if(delivered?.version===1&&delivered.sourceDraftRef===draftRef&&isDeepStrictEqual(delivered.candidateInput,transition.draft.candidateInput))return null;
 // An editable r0 with no units or purchased cards spends nothing.
 // Its Builder rejection is expected because an empty selection is not an army.
 // Match the Native rejection to that exact draft before reading a zero baseline.
 const candidate=draft.candidateInput;
 const emptyOpening=draft.revision===0&&draft.plan===null
   &&Array.isArray(candidate.units)&&candidate.units.length===0
   &&Array.isArray(candidate.tacticalCardRecordKeys)&&candidate.tacticalCardRecordKeys.length===0
   &&beforeVerdict?.status==='invalid_candidate'
   &&beforeVerdict.portErrorCode==='ARMY_BUILDER_CANDIDATE_UNIT_LIST_INVALID'
   &&beforeVerdict.candidateHash===hash(candidate);
 const before=emptyOpening?{mineralSpent:0,vespeneSpent:0}:beforeVerdict?.summary;
 const after=transition.verdict?.summary;
 if(!Number.isFinite(before?.mineralSpent)||!Number.isFinite(after?.mineralSpent))throw Object.assign(Error('ROSTER_CANDIDATE_PREVIEW_NATIVE_BUDGET_MISSING'),{code:'ROSTER_CANDIDATE_PREVIEW_NATIVE_BUDGET_MISSING'});
 const old=new Map(draft.candidateInput.units.map(u=>[u.unitInstanceId,u])),next=new Map(transition.draft.candidateInput.units.map(u=>[u.unitInstanceId,u]));
 const changes=[...new Set([...old.keys(),...next.keys()])].filter(id=>!isDeepStrictEqual(old.get(id),next.get(id))).map(id=>({unitInstanceId:id,operation:!old.has(id)?'added':!next.has(id)?'removed':'updated',before:clone(old.get(id)??null),after:clone(next.get(id)??null)}));
 const preview={version:1,sourceDraftRef:draftRef,sourceRevision:draft.revision,candidateInput:clone(transition.draft.candidateInput),
 ...(emptyOpening?{budgetBaseline:{kind:'empty_editable_opening',beforeArmyLegal:false}}:{}),
 budget:{mineralBudget:after.mineralBudget,mineralBefore:before.mineralSpent,mineralAfter:after.mineralSpent,mineralDelta:after.mineralSpent-before.mineralSpent,mineralRemaining:after.mineralBudget-after.mineralSpent,vespeneBefore:before.vespeneSpent,vespeneAfter:after.vespeneSpent},
 unitChanges:changes,cardSelectionBefore:clone(draft.candidateInput.tacticalCardRecordKeys),cardSelectionAfter:clone(transition.draft.candidateInput.tacticalCardRecordKeys),nativeLegality:transition.verdict.status,applied:false,strategyApproved:false,
 instruction:'This is the actual Native-audited proposed change BEFORE commitment. An updated existing unit is not an added unit. Budget delta includes removals. Read these facts and explicitly select this candidate or revise it; a deliberate budget decrease is allowed. Prior prose about gains is not a calculation. Current army/Plan remains unchanged and no strategy or final release is approved.'};
 return {applied:false,status:'candidate_preview_required',draftUnchanged:true,preview,candidateSource:{operation:'builder_audit',request:{candidateInput:clone(preview.candidateInput)},receipt:clone(transition.verdict)},proposedDecision:clone(decision)};
}
export function createRosterWorkflowCandidatePreviewWorkV1({work,outcome,state}){
 if(outcome?.status!=='candidate_preview_required'||work.status!=='evidence_ready'||outcome.preview.sourceDraftRef!==state.draftRef||work.draftRevision!==state.draftRevision||!Object.entries(work.bindings).every(([k,v])=>state.scope[k]===v))return null;
 const id=work.id+':candidate-preview',evidenceId='candidate-preview:'+work.id;
 if(state.work.some(w=>w.id===id))return null;
 return {id,role:work.role,bindings:clone(work.bindings),draftRevision:work.draftRevision,candidatePreviewOf:work.id,inputs:{...clone(work.inputs),candidatePreview:{source:'literal',value:clone(outcome.preview)},proposedDecision:{source:'literal',value:clone(outcome.proposedDecision)},previewCandidateSource:{source:'evidence',id:evidenceId,pointer:''},question:{source:'literal',value:{goal:'对提交前的真实候选变化作出选择。原草案尚未修改。',originalTask:clone(work.inputs.question?.value??null),instruction:'先核对candidatePreview的Native预算、增删改单位与所提Plan是否符合你的目的。确认候选时，可读取previewCandidateSource的完整candidateInput并通过现有rosterCandidateSelection选择它；单位增删和卡牌字段留空，保留或修订你原拟定的Plan。也可原样明确重选当前预览里的候选，或重新提出不同候选/必要查询。不要重算或抄造预算回执，不要把updated说成added。允许有策略理由的降预算；这不是要求强制涨分或证明全局最优。候选已合法不等于最终Plan已通过。'}}}};
}
