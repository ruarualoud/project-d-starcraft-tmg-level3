// Reconcile only the latest legacy commit. Do not rewrite saved drafts/replies,
// replay evidence, or reopen every historical revision under a newer contract.
import {rosterWorkflowPlanRecordLossesV1} from './roster-workflow-draft-v1.mjs';
export async function rosterPlanRecordRecoveryV1({state,readArtifact}){
  const commit=state.events.findLast(e=>e.type==='draft_committed'&&e.revision===state.draftRevision);
  const previous=state.events.findLast(e=>e.type==='draft_committed'&&e.revision===state.draftRevision-1);
  const owner=state.work.find(w=>w.id===commit?.workId);
  if(!commit||!previous||!owner?.resultRef)return null;
  const before=await readArtifact(previous.draftRef),result=await readArtifact(owner.resultRef);
  const decision=result.value?.decisions?.[0];
  const losses=rosterWorkflowPlanRecordLossesV1({plan:before.plan,mutation:decision?.mutation});
  if(!losses.length)return null;
  const rootId=`product:plan-record-loss:r${state.draftRevision}`;
  const family=state.work.filter(w=>w.id===rootId||w.planRecordLossRepairRoot===rootId);
  const latest=family.at(-1);
  if(latest?.draftOutcomeRef){
    const outcome=await readArtifact(latest.draftOutcomeRef);
    // A deliberate author confirmation is allowed; final semantic review still
    // applies. No machine-selected restoration or deletion becomes strategy.
    if(['retain','retained'].includes(outcome.status))return null;
  }
  if(latest)return {rootId,work:latest,losses,job:null};
  return {rootId,work:null,losses,job:{id:rootId,role:'roster_workflow_strategy_decision',
    bindings:state.scope,draftRevision:state.draftRevision,planRecordLossRepairRoot:rootId,
    inputs:{
      draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
      question:{source:'literal',value:'Correct a legacy Plan collection replacement that omitted existing records. Decide explicitly whether to restore the omitted records or deliberately retain their absence with a strategic reason. This is an author edit/confirmation, not a new experiment. Preserve the correctly revised current sections and all necessary unanswered facts. Use the current draft revision and local record edit fields.'},
      previousDecision:{source:'literal',value:{sourceResultRef:owner.resultRef,decision,
        scope:'Historical author intent and pending questions; not current verified facts.'}},
      localFailure:{source:'literal',value:{code:'ROSTER_WORKFLOW_IMPLICIT_PLAN_RECORD_REMOVAL',
        appliedByLegacyContract:true,previousRevision:previous.revision,currentRevision:commit.revision,
        beforeDraftRef:previous.draftRef,afterDraftRef:commit.draftRef,losses,
        instruction:'The old full-array update removed these exact records. No automatic restoration has occurred. For a local intended edit, restore omitted records with keyed upsert while preserving current updated entries. If the removal was truly intentional, explicitly confirm retaining that absence with your reason. Do not call the accidental disappearance measured evidence or a strategy improvement. Do not rerun existing facts or investigate this mechanical edit. The existing necessary facts remain pending; this repair does not authorize a new inquiry or approve the Plan.'}},
    }}};
}
