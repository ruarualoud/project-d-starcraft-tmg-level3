// Client telemetry only. Authoritative workflow, prompts, receipts and costs
// remain in the product store and are never rewritten by this observer.
export function createRosterGenerationObserverV1(){
  let previousSummary=null,previousWork=new Map();
  const terminal=new Set(['evidence_ready','superseded','returned_to_owner']);
  return workflow=>{
    const initial=previousSummary===null,currentWork=new Map(),changedWork=[],workStatusCounts={};
    for(const w of workflow.work){
      const row={id:w.id,role:w.role,status:w.status,failure:w.failure};
      const serialized=JSON.stringify(row),old=previousWork.get(w.id);
      currentWork.set(w.id,{serialized,status:w.status});
      workStatusCounts[w.status]=(workStatusCounts[w.status]??0)+1;
      if(initial?!terminal.has(w.status):old?.serialized!==serialized)
        changedWork.push({...row,previousStatus:old?.status??null});
    }
    const removedWorkIds=[...previousWork.keys()].filter(id=>!currentWork.has(id));
    const summary={stage:'product_status',workflowId:workflow.workflowId,status:workflow.status,running:workflow.running,
      draftRevision:workflow.draftRevision,unitCount:workflow.draft.candidateInput.units.length,
      hasPlan:!!workflow.draft.plan,readyForRelease:workflow.readyForRelease,
      evidenceCount:workflow.evidenceCount,failure:workflow.failure,
      workCount:workflow.work.length,workStatusCounts};
    const fingerprint=JSON.stringify(summary),unchanged=fingerprint===previousSummary;
    previousSummary=fingerprint;previousWork=currentWork;
    if(unchanged&&!changedWork.length&&!removedWorkIds.length)return null;
    return {...summary,observationVersion:2,workLogMode:initial?'initial_active':'changed_only',
      changedWork,removedWorkIds,
      historySource:'Product workflow events and immutable artifacts; this client log is not a full work snapshot.'};
  };
}
